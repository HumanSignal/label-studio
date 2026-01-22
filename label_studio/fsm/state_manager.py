"""
Core state management functionality for Label Studio.

Provides high-performance state management with caching and batch operations
that can be extended by Label Studio Enterprise with additional features.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Type

from core.current_request import CurrentContext
from core.feature_flags import flag_set
from django.conf import settings
from django.core.cache import cache, caches
from django.db.models import Model, QuerySet
from fsm.registry import get_state_model_for_entity
from fsm.state_models import BaseState
from fsm.transition_executor import execute_transition_with_state_manager

logger = logging.getLogger(__name__)


_fsm_cache = None


def get_fsm_cache():
    """
    Get the cache backend for FSM operations.

    Uses REDIS_CACHE_ALIAS when available (LSE) to ensure FSM caching works
    even when DUMMY_CACHE is enabled. Falls back to default cache for LSO.

    The result is memoized so the cache lookup only happens once per process.

    Returns:
        Cache backend instance
    """
    global _fsm_cache
    if _fsm_cache is not None:
        return _fsm_cache

    redis_cache_alias = getattr(settings, 'REDIS_CACHE_ALIAS', None)
    if redis_cache_alias and redis_cache_alias in settings.CACHES:
        _fsm_cache = caches[redis_cache_alias]
    else:
        _fsm_cache = cache
    return _fsm_cache


class StateManagerError(Exception):
    """Base exception for StateManager operations"""

    pass


class InvalidTransitionError(StateManagerError):
    """Raised when an invalid state transition is attempted"""

    pass


class StateManager:
    """
    Core state management system for Label Studio.

    Provides the foundation for state management that can be extended
    by Label Studio Enterprise with additional features like:
    - Advanced caching strategies
    - Bulk operations optimization
    - Complex transition validation
    - Enterprise-specific state models

    Features:
    - INSERT-only architecture with UUID7 for maximum performance
    - Basic caching for current state lookups
    - Simple state transitions with audit trails
    - Extensible design for enterprise features
    """

    CACHE_TTL = getattr(settings, 'FSM_CACHE_TTL', 300)  # 5 minutes default
    CACHE_PREFIX = 'fsm:current'

    @classmethod
    def clear_fsm_cache(cls):
        """
        Clear all FSM-related cache keys.

        Uses delete_pattern if available (django-redis), otherwise logs a warning.
        This is primarily used for test isolation.
        """
        fsm_cache = get_fsm_cache()
        pattern = f'{cls.CACHE_PREFIX}:*'
        if hasattr(fsm_cache, 'delete_pattern'):
            fsm_cache.delete_pattern(pattern)
        else:
            logger.warning(
                'FSM cache clear requested but cache backend does not support delete_pattern. '
                'FSM cache keys may persist.'
            )

    @classmethod
    def _is_fsm_enabled(cls, user='auto') -> bool:
        if user == 'auto':
            user = CurrentContext.get_user()
        """Check if FSM feature is enabled via feature flag."""
        return flag_set('fflag_feat_fit_568_finite_state_management', user=user)

    @classmethod
    def get_cache_key(cls, entity: Model) -> str:
        """Generate cache key for entity's current state"""
        return f'{cls.CACHE_PREFIX}:{entity._meta.label_lower}:{entity.pk}'

    @classmethod
    def get_current_state_value(cls, entity: Model) -> Optional[str]:
        """
        Get current state with basic caching.

        Args:
            entity: The entity to get current state for

        Returns:
            Current state string
        Raises:
            StateManagerError: If no state model found

        Example:
            task = Task.objects.get(id=123)
            current_state = StateManager.get_current_state_value(task)
            if current_state == 'COMPLETED':
                # Task is finished
                pass
        """
        if not cls._is_fsm_enabled():
            return None  # Feature disabled, return no state

        cache_key = cls.get_cache_key(entity)
        fsm_cache = get_fsm_cache()

        # Try cache first
        cached_state = fsm_cache.get(cache_key)
        if cached_state is not None:
            logger.info(
                'FSM: Cache hit',
                extra={
                    'event': 'fsm.cache_hit',
                    'entity_type': entity._meta.label_lower,
                    'entity_id': entity.pk,
                    'organization_id': CurrentContext.get_organization_id(),
                    'state': cached_state,
                },
            )
            return cached_state

        # Query database using state model registry
        state_model = get_state_model_for_entity(entity)
        if not state_model:
            raise StateManagerError(f'No state model found for {entity._meta.model_name} when getting current state')

        try:
            current_state = state_model.get_current_state_value(entity)

            # Cache result
            if current_state is not None:
                fsm_cache.set(cache_key, current_state, cls.CACHE_TTL)
                logger.info(
                    'FSM: Cache miss',
                    extra={
                        'event': 'fsm.cache_miss',
                        'entity_type': entity._meta.label_lower,
                        'entity_id': entity.pk,
                        'organization_id': CurrentContext.get_organization_id(),
                    },
                )

            return current_state

        except Exception as e:
            logger.error(
                'FSM: Error getting current state',
                extra={
                    'event': 'fsm.get_state_error',
                    'entity_type': entity._meta.label_lower,
                    'entity_id': entity.pk,
                    'organization_id': CurrentContext.get_organization_id(),
                    'error': str(e),
                },
                exc_info=True,
            )
            raise StateManagerError(f'Error getting current state: {e}') from e

    @classmethod
    def get_current_state_object(cls, entity: Model) -> BaseState:
        """
        Get current state object with full audit information.

        Args:
            entity: The entity to get current state object for

        Returns:
            Latest BaseState instance

        Raises:
            StateManagerError: If no state model found
        """
        state_model = get_state_model_for_entity(entity)
        if not state_model:
            raise StateManagerError(
                f'No state model found for {entity._meta.model_name} when getting current state object'
            )

        return state_model.get_current_state(entity)

    @classmethod
    def transition_state(
        cls,
        entity: Model,
        new_state: str,
        transition_name: str = None,
        user=None,
        organization_id=None,
        context: Dict[str, Any] = None,
        reason: str = '',
        force_state_record: bool = False,
    ) -> bool:
        """
        Perform state transition with audit trail.

        Uses INSERT-only approach for maximum performance:
        - No UPDATE operations or row locks
        - Complete audit trail by design
        - Basic cache update for consistency

        Args:
            entity: The entity to transition
            new_state: Target state
            transition_name: Name of transition method (for audit)
            user: User triggering the transition
            organization_id: Organization ID
            context: Additional context data
            reason: Human-readable reason for transition
            force_state_record: If True, creates state record even if state doesn't change (for audit trails)

        Returns:
            True if transition succeeded, False otherwise

        Raises:
            InvalidTransitionError: If transition is not valid
            StateManagerError: If transition fails

        Example:
            success = StateManager.transition_state(
                entity=task,
                new_state='IN_PROGRESS',
                transition_name='start_annotation',
                user=request.user,
                organization_id=request.user.active_organization_id,
                context={'assignment_id': assignment.id},
                reason='User started annotation work'
            )
        """
        if not cls._is_fsm_enabled(user=user):
            return True  # Feature disabled, silently succeed

        # Skip if FSM is temporarily disabled (e.g., during cleanup or bulk operations)
        if CurrentContext.is_fsm_disabled():
            return True  # FSM disabled, silently succeed

        state_model = get_state_model_for_entity(entity)
        if not state_model:
            raise StateManagerError(f'No state model found for {entity._meta.model_name} when transitioning state')

        current_state = cls.get_current_state_value(entity)

        # Prevent same-state transitions - only create state records for actual state changes
        # This avoids creating redundant data when the effective state doesn't change
        # However, allow forced state records for audit trails (e.g., annotation updates)
        # IMPORTANT: Also check if a state record exists in DB - if not, we must create one
        # even if inferred state matches target state (to persist the inferred state)
        if current_state == new_state and not force_state_record:
            # Verify a state record actually exists in DB (not just inferred)
            state_record_exists = state_model.objects.filter(**{entity._meta.model_name: entity}).exists()
            if state_record_exists:
                return True  # Skip transition - record exists and state unchanged
            # else: No record exists (state was inferred), continue to create record

        # Optimistic concurrency control using cache-based locking
        cache_key = cls.get_cache_key(entity)
        lock_key = f'{cache_key}:lock'
        fsm_cache = get_fsm_cache()

        if organization_id is None:
            organization_id = CurrentContext.get_organization_id()

        try:
            # Try to acquire an optimistic lock using cache add (atomic operation)
            # add() only succeeds if the key doesn't exist
            lock_acquired = fsm_cache.add(lock_key, 'locked', timeout=5)  # 5 second timeout

            if not lock_acquired:
                # Another process is currently transitioning this entity
                logger.info(
                    'FSM: Concurrent transition detected, skipping',
                    extra={
                        'event': 'fsm.concurrent_transition_skipped',
                        'entity_type': entity._meta.label_lower,
                        'entity_id': entity.pk,
                        'target_state': new_state,
                        'organization_id': organization_id,
                    },
                )
                return True

            try:
                # INSERT-only approach - no UPDATE operations needed
                # Get denormalized fields from the state model class
                denormalized_fields = state_model.get_denormalized_fields(entity)

                # Get organization from entity or denormalized fields, or user's active organization
                if organization_id is None:
                    organization_id = getattr(
                        entity, 'organization_id', getattr(denormalized_fields, 'organization_id', None)
                    )
                    if organization_id is not None:
                        CurrentContext.set_organization_id(organization_id)

                if not organization_id and user and hasattr(user, 'active_organization') and user.active_organization:
                    organization_id = user.active_organization.id
                    if organization_id is not None:
                        CurrentContext.set_organization_id(organization_id)

                logger.info(
                    'FSM: State transition starting',
                    extra={
                        'event': 'fsm.transition_state_start',
                        'entity_type': entity._meta.label_lower,
                        'entity_id': entity.pk,
                        'from_state': current_state,
                        'to_state': new_state,
                        'transition_name': transition_name,
                        **{
                            'user_id': user.id if user else None,
                            'organization_id': organization_id if organization_id else None,
                        },
                    },
                )

                # CRITICAL FIX: Use state model's correct field name instead of entity._meta.model_name
                # This fixes the architectural entity field mapping issue where entity._meta.model_name
                # doesn't always match the actual field name defined in FSM state models
                entity_field_name = state_model._get_entity_field_name()

                new_state_record = state_model.objects.create(
                    **{entity_field_name: entity},
                    state=new_state,
                    previous_state=current_state,
                    transition_name=transition_name,
                    triggered_by=user,
                    context_data=context or {},
                    reason=reason,
                    organization_id=organization_id,
                    **denormalized_fields,
                )

                # Write-through cache: Update immediately
                # This ensures the cache is updated atomically with the database
                fsm_cache.set(cache_key, new_state, cls.CACHE_TTL)

                logger.info(
                    'FSM: Cache updated for transition state',
                    extra={
                        'event': 'fsm.transition_state_cache_updated',
                        'entity_type': entity._meta.label_lower,
                        'entity_id': entity.pk,
                        'state': new_state,
                        **{
                            'user_id': user.id if user else None,
                            'organization_id': organization_id if organization_id else None,
                        },
                    },
                )

                logger.info(
                    'FSM: State transition successful',
                    extra={
                        'event': 'fsm.transition_state_success',
                        'entity_type': entity._meta.label_lower,
                        'entity_id': entity.pk,
                        'state': new_state,
                        'state_record_id': str(new_state_record.id),
                        **{
                            'user_id': user.id if user else None,
                            'organization_id': organization_id if organization_id else None,
                        },
                    },
                )
                return True

            finally:
                # Always release the lock, regardless of success or failure
                fsm_cache.delete(lock_key)

        except Exception as e:
            # On failure, clean up lock and invalidate potentially stale cache
            fsm_cache.delete(lock_key)
            fsm_cache.delete(cache_key)

            # Get organization_id for error logging if it wasn't set earlier
            organization_id = CurrentContext.get_organization_id()

            logger.error(
                'FSM: State transition failed',
                extra={
                    'event': 'fsm.transition_state_failed',
                    'entity_type': entity._meta.label_lower,
                    'entity_id': entity.pk,
                    'from_state': current_state,
                    'to_state': new_state,
                    'error': str(e),
                    **{
                        'user_id': user.id if user else None,
                        'organization_id': organization_id if organization_id else None,
                    },
                },
                exc_info=True,
            )
            raise StateManagerError(f'Failed to transition state: {e}') from e

    @classmethod
    def get_state_history(cls, entity: Model) -> QuerySet[BaseState]:
        """
        Get complete state history for an entity.

        Args:
            entity: Entity to get history for

        Returns:
            QuerySet of state records ordered by most recent first
        """
        state_model = get_state_model_for_entity(entity)
        if not state_model:
            raise StateManagerError(
                f'No state model registered for {entity._meta.model_name} when getting state history'
            )

        return state_model.get_state_history(entity)

    @classmethod
    def get_states_in_time_range(
        cls, entity: Model, start_time: datetime, end_time: Optional[datetime] = None
    ) -> List[BaseState]:
        """
        Get states within a time range using UUID7 time-based queries.

        Args:
            entity: Entity to get states for
            start_time: Start of time range
            end_time: End of time range (defaults to now)

        Returns:
            List of states within the time range
        """
        state_model = get_state_model_for_entity(entity)
        if not state_model:
            raise StateManagerError(
                f'No state model registered for {entity._meta.model_name} when getting states in time range'
            )

        return state_model.get_states_in_range(entity, start_time, end_time or datetime.now())

    @classmethod
    def invalidate_cache(cls, entity: Model):
        """Invalidate cached state for an entity"""
        cache_key = cls.get_cache_key(entity)
        fsm_cache = get_fsm_cache()
        fsm_cache.delete(cache_key)
        organization_id = CurrentContext.get_organization_id()
        logger.info(
            'FSM: Cache invalidated',
            extra={
                'event': 'fsm.cache_invalidated',
                'entity_type': entity._meta.label_lower,
                'entity_id': entity.pk,
                **{'organization_id': organization_id if organization_id else None},
            },
        )

    @classmethod
    def warm_cache(cls, entities: List[Model]):
        """
        Warm cache with current states for a list of entities.

        Basic implementation that can be optimized by Enterprise with
        bulk queries and advanced caching strategies.
        """
        cache_updates = {}
        organization_id = CurrentContext.get_organization_id()
        for entity in entities:
            current_state = cls.get_current_state_value(entity)
            if current_state:
                cache_key = cls.get_cache_key(entity)
                cache_updates[cache_key] = current_state

        if cache_updates:
            fsm_cache = get_fsm_cache()
            fsm_cache.set_many(cache_updates, cls.CACHE_TTL)
            logger.info(
                'FSM: Cache warmed',
                extra={
                    'event': 'fsm.cache_warmed',
                    'entity_count': len(cache_updates),
                    **{'organization_id': organization_id if organization_id else None},
                },
            )

    @classmethod
    def execute_transition(
        cls, entity: Model, transition_name: str, transition_data: Dict[str, Any] = None, user=None, **context_kwargs
    ) -> BaseState:
        """
        Execute a registered transition by name.

        This is the main entry point for all state transitions using the declarative system.
        Enterprise implementations can override this method to add additional behavior.

        Args:
            entity: The entity to transition
            transition_name: Name of the registered transition
            transition_data: Data for the transition (validated by Pydantic)
            user: User executing the transition
            **context_kwargs: Additional context data

        Returns:
            The newly created state record

        Raises:
            ValueError: If transition is not found
            TransitionValidationError: If transition validation fails
        """
        # Delegate to transition executor, passing StateManager methods as parameters
        return execute_transition_with_state_manager(
            entity=entity,
            transition_name=transition_name,
            transition_data=transition_data,
            user=user,
            state_manager_class=cls,
            **context_kwargs,
        )


# Allow runtime configuration of which StateManager to use
# Enterprise can set this to their extended implementation
DEFAULT_STATE_MANAGER = StateManager
RESOLVED_STATE_MANAGER = None


def get_state_manager() -> Type[StateManager]:
    """
    Get the configured state manager class.

    Returns the StateManager class to use. Enterprise can override
    this by setting a different class in their configuration.
    """
    # Resolve once
    if RESOLVED_STATE_MANAGER is not None:
        return RESOLVED_STATE_MANAGER

    # Check if enterprise has configured a custom state manager
    if hasattr(settings, 'FSM_STATE_MANAGER_CLASS'):
        manager_path = settings.FSM_STATE_MANAGER_CLASS
        module_name, class_name = manager_path.rsplit('.', 1)
        module = __import__(module_name, fromlist=[class_name])
        return getattr(module, class_name)

    return DEFAULT_STATE_MANAGER
