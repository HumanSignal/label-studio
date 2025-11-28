"""
Redis-based user activity tracking system and background tasks for synchronization.

This module provides functionality to cache user last_activity timestamps in Redis
with batch synchronization to the database to reduce database load.
"""

import logging
from datetime import datetime
from typing import List, Optional, Set

from core.redis import _redis, redis_connected, start_job_async_or_sync
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone as django_timezone
from django_rq import get_connection

logger = logging.getLogger(__name__)


# Redis keys
USER_ACTIVITY_KEY_PREFIX = getattr(settings, 'USER_ACTIVITY_REDIS_KEY_PREFIX', 'user_activity')
USER_ACTIVITY_COUNTER_KEY = f'{USER_ACTIVITY_KEY_PREFIX}_counter'
USER_ACTIVITY_BATCH_KEY = f'{USER_ACTIVITY_KEY_PREFIX}_batch'

# Configuration
BATCH_SIZE = getattr(settings, 'USER_ACTIVITY_BATCH_SIZE', 100)
SYNC_THRESHOLD = getattr(settings, 'USER_ACTIVITY_SYNC_THRESHOLD', 50)
REDIS_TTL = getattr(settings, 'USER_ACTIVITY_REDIS_TTL', 86400)  # 24 hours


def _get_user_activity_key(user_id: int) -> str:
    """Get Redis key for user activity."""
    return f'{USER_ACTIVITY_KEY_PREFIX}:{user_id}'


def set_user_last_activity(user_id: int, timestamp: Optional[datetime] = None) -> bool:
    """
    Set user last activity timestamp in Redis.

    Args:
        user_id: User ID
        timestamp: Activity timestamp (defaults to current time)

    Returns:
        True if successfully set, False otherwise
    """
    if not redis_connected():
        return False

    if timestamp is None:
        timestamp = django_timezone.now()

    try:
        # Store timestamp as ISO string
        timestamp_str = timestamp.isoformat()
        redis_key = _get_user_activity_key(user_id)

        # Get Redis connection
        redis_client = get_connection()

        # Set user activity with TTL
        redis_client.setex(redis_key, REDIS_TTL, timestamp_str)

        # Add user to batch set for later synchronization (atomic operation)
        redis_client.sadd(USER_ACTIVITY_BATCH_KEY, user_id)
        redis_client.expire(USER_ACTIVITY_BATCH_KEY, REDIS_TTL)

        # Increment counter
        current_count = increment_activity_counter()

        logger.debug('Updated activity for user %s, counter at %s', user_id, current_count)

        return True

    except Exception as e:
        logger.error('Failed to set user activity for user %s: %s', user_id, e)
        return False


def get_user_last_activity(user_id: int) -> Optional[datetime]:
    """
    Get user last activity timestamp from Redis with database fallback.

    Args:
        user_id: User ID

    Returns:
        Last activity timestamp or None if not found
    """
    if _redis is None:
        return

    try:
        redis_key = _get_user_activity_key(user_id)
        redis_client = get_connection()
        timestamp_str = redis_client.get(redis_key)

        if timestamp_str:
            # Decode bytes to string if needed
            if isinstance(timestamp_str, bytes):
                timestamp_str = timestamp_str.decode('utf-8')
            # Parse ISO string back to datetime
            return datetime.fromisoformat(timestamp_str)

    except Exception as e:
        logger.error('Failed to get user activity for user %s: %s', user_id, e)


def increment_activity_counter() -> int:
    """
    Increment activity counter and return current count.

    Returns:
        Current counter value
    """
    if not redis_connected():
        return 0

    try:
        redis_client = get_connection()
        # Increment counter (creates key with value 1 if it doesn't exist)
        current_count = redis_client.incr(USER_ACTIVITY_COUNTER_KEY)
        # Set expiration to match other keys
        redis_client.expire(USER_ACTIVITY_COUNTER_KEY, REDIS_TTL)
        logger.debug('Activity counter incremented to %s', current_count)
        return current_count

    except Exception as e:
        logger.error('Failed to increment activity counter: %s', e)
        return 0


def get_activity_counter() -> int:
    """
    Get current activity counter value.

    Returns:
        Current counter value
    """
    if not redis_connected():
        return 0

    try:
        redis_client = get_connection()
        count = redis_client.get(USER_ACTIVITY_COUNTER_KEY)
        return int(count) if count is not None else 0

    except Exception as e:
        logger.error('Failed to get activity counter: %s', e)
        return 0


def reset_activity_counter() -> bool:
    """
    Reset activity counter to 0.

    Returns:
        True if successfully reset, False otherwise
    """
    if not redis_connected():
        return False

    try:
        redis_client = get_connection()
        redis_client.set(USER_ACTIVITY_COUNTER_KEY, 0)
        redis_client.expire(USER_ACTIVITY_COUNTER_KEY, REDIS_TTL)
        logger.debug('Activity counter reset to 0')
        return True

    except Exception as e:
        logger.error('Failed to reset activity counter: %s', e)
        return False


def get_batch_user_ids() -> Set[int]:
    """
    Get all user IDs from batch set.

    Returns:
        Set of user IDs to be synchronized
    """
    if not redis_connected():
        return set()

    try:
        redis_client = get_connection()
        user_ids = redis_client.smembers(USER_ACTIVITY_BATCH_KEY)
        return {int(uid.decode()) for uid in user_ids if uid}

    except Exception as e:
        logger.error('Failed to get batch user IDs: %s', e)
        return set()


def clear_batch_user_ids(user_ids: Optional[Set[int]] = None) -> bool:
    """
    Clear user IDs from batch set.

    Args:
        user_ids: Specific user IDs to remove (if None, clears all)

    Returns:
        True if successfully cleared, False otherwise
    """
    if not redis_connected():
        return False

    try:
        redis_client = get_connection()

        if user_ids:
            # Remove specific user IDs (atomic operation)
            if user_ids:
                redis_client.srem(USER_ACTIVITY_BATCH_KEY, *user_ids)
        else:
            # Clear entire set
            redis_client.delete(USER_ACTIVITY_BATCH_KEY)

        logger.debug('Cleared batch user IDs: %s', user_ids or 'all')
        return True

    except Exception as e:
        logger.error('Failed to clear batch user IDs: %s', e)
        return False


def should_sync_activities() -> bool:
    """
    Check if activities should be synchronized to database.

    Returns:
        True if sync threshold is reached, False otherwise
    """
    current_count = get_activity_counter()
    should_sync = current_count >= SYNC_THRESHOLD

    if should_sync:
        logger.info('Sync threshold reached: %s >= %s', current_count, SYNC_THRESHOLD)

    return should_sync


def get_user_activities_for_sync(user_ids: Set[int]) -> List[dict]:
    """
    Get user activities from Redis for database synchronization.

    Args:
        user_ids: Set of user IDs to get activities for

    Returns:
        List of dictionaries with user_id and last_activity
    """
    if not redis_connected():
        return []

    activities = []

    for user_id in user_ids:
        try:
            timestamp = get_user_last_activity(user_id)
            if timestamp:
                activities.append({'user_id': user_id, 'last_activity': timestamp})
        except Exception as e:
            logger.error('Failed to get activity for user %s during sync: %s', user_id, e)
            continue

    return activities


def cleanup_redis_activity_data(user_ids: Set[int]) -> bool:
    """
    Clean up Redis activity data for given user IDs.

    Args:
        user_ids: Set of user IDs to clean up

    Returns:
        True if successfully cleaned, False otherwise
    """
    if not redis_connected():
        return False

    try:
        redis_client = get_connection()

        # Delete individual user activity keys
        keys_to_delete = [_get_user_activity_key(user_id) for user_id in user_ids]
        if keys_to_delete:
            redis_client.delete(*keys_to_delete)

        # Remove from batch set
        clear_batch_user_ids(user_ids)

        logger.debug('Cleaned up Redis data for %s users', len(user_ids))
        return True

    except Exception as e:
        logger.error('Failed to cleanup Redis activity data: %s', e)
        return False


def sync_user_activities_to_db(max_users: int = None) -> dict:
    """
    Synchronize user activities from Redis to database.

    Args:
        max_users: Maximum number of users to process (defaults to BATCH_SIZE)

    Returns:
        Dictionary with sync results
    """
    if max_users is None:
        max_users = BATCH_SIZE

    logger.info('Starting user activity sync to database')

    try:
        # Get user IDs to sync
        user_ids = get_batch_user_ids()

        if not user_ids:
            logger.info('No user activities to sync')
            return {'success': True, 'processed': 0, 'errors': 0, 'message': 'No activities to sync'}

        # Limit batch size
        if len(user_ids) > max_users:
            user_ids = set(list(user_ids)[:max_users])
            logger.info('Limited batch to %s users', max_users)

        logger.info('Syncing activities for %s users', len(user_ids))

        # Get activity data from Redis
        activities = get_user_activities_for_sync(user_ids)

        if not activities:
            logger.warning('No activity data found for %s users', len(user_ids))
            # Still clean up the batch set
            cleanup_redis_activity_data(user_ids)
            return {'success': True, 'processed': 0, 'errors': len(user_ids), 'message': 'No activity data found'}

        # Sync to database
        sync_result = _bulk_update_user_activities(activities)

        if sync_result['success']:
            # Clean up Redis data only if database sync was successful
            cleanup_redis_activity_data(user_ids)

            # Reset counter only if we processed all pending activities
            # or if remaining users are below the threshold
            remaining_users = get_batch_user_ids()
            if not remaining_users or len(remaining_users) < SYNC_THRESHOLD:
                reset_activity_counter()
                logger.info('Reset activity counter after successful sync (remaining users: %s)', len(remaining_users))

        logger.info('Activity sync completed: %s', sync_result)
        return sync_result

    except Exception as e:
        logger.error('Failed to sync user activities: %s', e, exc_info=True)
        return {'success': False, 'processed': 0, 'errors': 1, 'message': f'Sync failed: {str(e)}'}


def _bulk_update_user_activities(activities: List[dict]) -> dict:
    """
    Bulk update user activities in database.

    Args:
        activities: List of activity dictionaries

    Returns:
        Dictionary with update results
    """
    if not activities:
        return {'success': True, 'processed': 0, 'errors': 0}

    processed = 0
    errors = 0

    try:
        with transaction.atomic():
            # Get existing users
            User = get_user_model()
            user_ids = [activity['user_id'] for activity in activities]
            existing_users = User.objects.filter(id__in=user_ids).only('id', 'last_activity')
            user_dict = {user.id: user for user in existing_users}

            # Update activities
            users_to_update = []

            for activity in activities:
                user_id = activity['user_id']
                new_activity = activity['last_activity']

                user = user_dict.get(user_id)
                if user:
                    # Only update if the new activity is more recent
                    if user.last_activity is None or new_activity > user.last_activity:
                        user.last_activity = new_activity
                        users_to_update.append(user)
                        processed += 1
                    else:
                        logger.debug(
                            'Skipping outdated activity for user %s: %s <= %s',
                            user_id,
                            new_activity,
                            user.last_activity,
                        )
                        processed += 1
                else:
                    logger.warning('User %s not found in database', user_id)
                    errors += 1

            # Bulk update
            if users_to_update:
                User.objects.bulk_update(users_to_update, ['last_activity'], batch_size=100)
                logger.info('Bulk updated %s users', len(users_to_update))

            return {'success': True, 'processed': processed, 'errors': errors, 'updated': len(users_to_update)}

    except Exception as e:
        logger.error('Failed to bulk update user activities: %s', e, exc_info=True)
        return {
            'success': False,
            'processed': processed,
            'errors': errors + 1,
            'message': f'Bulk update failed: {str(e)}',
        }


def schedule_activity_sync(force: bool = False) -> bool:
    """
    Schedule user activity synchronization if needed.

    Args:
        force: Force sync even if threshold not reached

    Returns:
        True if sync was scheduled, False otherwise
    """
    if not force and not should_sync_activities():
        logger.debug('Sync threshold not reached, skipping')
        return False

    try:
        # Schedule the sync job
        start_job_async_or_sync(sync_user_activities_to_db, queue_name='low', redis=True)
        reset_activity_counter()  # Reset counter after scheduling

        logger.info('Scheduled user activity sync job')
        return True

    except Exception as e:
        logger.error('Failed to schedule activity sync: %s', e)
        return False
