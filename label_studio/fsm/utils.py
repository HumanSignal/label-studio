"""
FSM utility functions.

This module provides:
1. UUID7 utilities for time-series optimization (uses uuid-utils library)
2. FSM-specific helper functions for organization resolution and state management

UUID7 provides natural time ordering and global uniqueness, making it ideal
for INSERT-only architectures with millions of records.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple

import uuid_utils
from core.current_request import CurrentContext
from core.utils.common import load_func
from django.conf import settings

logger = logging.getLogger(__name__)


# =============================================================================
# UUID7 Utilities (using uuid-utils library)
# =============================================================================


def generate_uuid7() -> uuid.UUID:
    """
    Generate a UUID7 with embedded timestamp for natural time ordering.

    UUID7 embeds the timestamp in the first 48 bits, providing:
    - Natural chronological ordering without additional indexes
    - Global uniqueness across distributed systems
    - Time-based partitioning capabilities

    Returns:
        UUID7 instance with embedded timestamp
    """
    # Use uuid-utils library for RFC 9562 compliant UUID7 generation
    # Convert to standard uuid.UUID to maintain type consistency
    uuid7_obj = uuid_utils.uuid7()
    return uuid.UUID(str(uuid7_obj))


def timestamp_from_uuid7(uuid7_id: uuid.UUID) -> datetime:
    """
    Extract timestamp from UUID7 ID.

    Args:
        uuid7_id: UUID7 instance to extract timestamp from

    Returns:
        datetime: Timestamp embedded in the UUID7

    Example:
        uuid7_id = generate_uuid7()
        timestamp = timestamp_from_uuid7(uuid7_id)
        # timestamp is when the UUID7 was generated
    """
    # UUID7 embeds timestamp in first 48 bits
    timestamp_ms = (uuid7_id.int >> 80) & ((1 << 48) - 1)
    # Return with millisecond precision (UUID7 spec)
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)


def uuid7_time_range(start_time: datetime, end_time: Optional[datetime] = None) -> Tuple[uuid.UUID, uuid.UUID]:
    """
    Generate UUID7 range for time-based queries.

    Creates UUID7 boundaries for efficient time-range filtering without
    requiring timestamp indexes.

    Args:
        start_time: Start of time range
        end_time: End of time range (defaults to now)

    Returns:
        Tuple of (start_uuid, end_uuid) for range queries

    Example:
        start_uuid, end_uuid = uuid7_time_range(
            datetime(2024, 1, 1),
            datetime(2024, 1, 2)
        )
        # Query: WHERE id >= start_uuid AND id <= end_uuid
    """
    if end_time is None:
        end_time = datetime.now(timezone.utc)

    # Add a small buffer to account for timing precision issues
    start_timestamp_ms = int(start_time.timestamp() * 1000) - 1  # 1ms buffer before
    end_timestamp_ms = int(end_time.timestamp() * 1000) + 1  # 1ms buffer after

    # Create UUID7 with specific timestamp using proper bit layout
    # UUID7 format: timestamp_ms(48) + ver(4) + rand_a(12) + var(2) + rand_b(62)
    start_uuid = uuid.UUID(int=(start_timestamp_ms << 80) | (0x7 << 76) | (0b10 << 62))
    end_uuid = uuid.UUID(int=(end_timestamp_ms << 80) | (0x7 << 76) | (0b10 << 62) | ((1 << 62) - 1))

    return start_uuid, end_uuid


def uuid7_from_timestamp(timestamp: datetime) -> uuid.UUID:
    """
    Generate UUID7 from specific timestamp for range queries.

    Args:
        timestamp: Timestamp to embed in UUID7

    Returns:
        UUID7 with embedded timestamp

    Example:
        # Get all states from the last hour
        start_time = timezone.now() - timedelta(hours=1)
        start_uuid = uuid7_from_timestamp(start_time)
        states = StateModel.objects.filter(id__gte=start_uuid)
    """
    # Convert to milliseconds since epoch as uuid-utils expects
    timestamp_ms = int(timestamp.timestamp() * 1000)

    # Use uuid-utils with specific timestamp for range queries
    # This creates a UUID7 with the given timestamp and minimal random bits
    # for consistent range boundaries
    return uuid.UUID(int=(timestamp_ms << 80) | (0x7 << 76) | (0b10 << 62))


def validate_uuid7(uuid_value: uuid.UUID) -> bool:
    """
    Validate that a UUID is a valid UUID7.

    Args:
        uuid_value: UUID to validate

    Returns:
        True if valid UUID7, False otherwise
    """
    return uuid_value.version == 7


class UUID7Field:
    """
    Custom field utilities for UUID7 handling in Django models.

    Provides helper methods for UUID7-specific operations that can be
    used by models inheriting from BaseState.
    """

    @staticmethod
    def get_latest_by_uuid7(queryset):
        """Get latest record using UUID7 natural ordering"""
        return queryset.order_by('-id').first()

    @staticmethod
    def filter_by_time_range(queryset, start_time: datetime, end_time: Optional[datetime] = None):
        """Filter queryset by time range using UUID7 embedded timestamps"""
        start_uuid, end_uuid = uuid7_time_range(start_time, end_time)
        return queryset.filter(id__gte=start_uuid, id__lte=end_uuid)

    @staticmethod
    def filter_since_time(queryset, since: datetime):
        """Filter queryset for records since a specific time"""
        start_uuid = uuid7_from_timestamp(since)
        return queryset.filter(id__gte=start_uuid)


class UUID7Generator:
    """
    UUID7 generator with optional custom timestamp.

    Useful for testing or when you need to generate UUIDs with specific timestamps.
    """

    def __init__(self, base_timestamp: Optional[datetime] = None):
        """
        Initialize generator with optional base timestamp.

        Args:
            base_timestamp: Base timestamp to use (defaults to current time)
        """
        self.base_timestamp = base_timestamp or datetime.now(timezone.utc)
        self._counter = 0

    def generate(self, offset_ms: int = 0) -> uuid.UUID:
        """
        Generate UUID7 with timestamp offset.

        Args:
            offset_ms: Millisecond offset from base timestamp

        Returns:
            UUID7 with adjusted timestamp
        """
        # For offset timestamps, use manual construction for precise control
        timestamp_ms = int(self.base_timestamp.timestamp() * 1000) + offset_ms
        self._counter += 1

        # Create UUID7 with specific timestamp and counter for monotonicity
        # UUID7 format: timestamp_ms(48) + ver(4) + rand_a(12) + var(2) + rand_b(62)
        uuid_int = (timestamp_ms << 80) | (0x7 << 76) | ((self._counter & 0xFFF) << 64) | (0b10 << 62)
        return uuid.UUID(int=uuid_int)


# =============================================================================
# FSM Helper Utilities
# =============================================================================


def resolve_organization_id(entity=None, user=None):
    """
    Resolve organization_id using consistent logic without additional queries.

    This provides organization_id resolution for logging and state tracking
    without duplicating database queries.

    Args:
        entity: The entity to resolve organization_id for
        user: Optional user for fallback organization resolution

    Returns:
        organization_id or None
    """
    # Try context cache first
    organization_id = CurrentContext.get_organization_id()
    if organization_id:
        return organization_id

    # Allow for function calls without entity
    if entity is None:
        return None

    # Try direct organization_id attribute first
    organization_id = getattr(entity, 'organization_id', None)

    # If entity doesn't have direct organization_id, try relationships
    if not organization_id:
        # For entities with project relationship (most common case)
        if hasattr(entity, 'project') and entity.project:
            organization_id = getattr(entity.project, 'organization_id', None)
        # For entities with task.project relationship
        elif hasattr(entity, 'task') and entity.task and hasattr(entity.task, 'project') and entity.task.project:
            organization_id = getattr(entity.task.project, 'organization_id', None)

    # Fallback to user's active organization
    if not organization_id and user and hasattr(user, 'active_organization') and user.active_organization:
        organization_id = user.active_organization.id

    # Cache the result in current context if we found an organization_id
    if organization_id is not None:
        CurrentContext.set_organization_id(organization_id)

    return organization_id


def is_fsm_enabled(user=None) -> bool:
    """
    Check if FSM is enabled via feature flags and thread-local override.

    PERFORMANCE: This function now checks the cached FSM state that was set
    when the user was first initialized in CurrentContext. This avoids repeated
    feature flag lookups throughout the request.

    The check order is:
    1. Check thread-local override (for test cleanup, bulk operations)
    2. Check cached feature flag state (set once per request)
    3. Fallback to direct feature flag check (for edge cases without context)

    Args:
        user: User for feature flag evaluation (optional, used as fallback only)

    Returns:
        True if FSM should be active
    """
    # Fast path: Check cached state from CurrentContext
    # This is set once per request when user is initialized
    return CurrentContext.is_fsm_enabled()


def get_current_state_safe(entity, user=None) -> Optional[str]:
    """
    Safely get current state with error handling.
    Args:
        entity: The entity to get state for
        user: The user making the request (for feature flag checking)
    Returns:
        Current state string or None if failed
    """
    if not is_fsm_enabled(user):
        return None

    try:
        from fsm.state_manager import get_state_manager

        StateManager = get_state_manager()
        return StateManager.get_current_state_value(entity)
    except Exception as e:
        logger.warning(
            f'Failed to get current state for {entity._meta.label_lower} {entity.pk}: {str(e)}',
            extra={
                'event': 'fsm.get_state_error',
                'entity_type': entity._meta.label_lower,
                'entity_id': entity.pk,
                'organization_id': resolve_organization_id(entity, user),
                'error': str(e),
            },
        )
        return None


def get_or_initialize_state(
    entity, user, inferred_state: str, reason=None, context_data=None, overwrite_state=False
) -> Optional[str]:
    """
    Get current state, or initialize it if it doesn't exist.

    This function handles "cold start" scenarios where pre-existing entities
    don't have FSM state records. It will:
    1. If the state already exists, use that
    2. If the state doesn't exist, infer the state from the entity and initialize it with an appropriate transition
    2. Return the state value (never returns None if initialization succeeds)

    Args:
        entity: The entity to get or initialize state for
        user: User for FSM context
        inferred_state: Pre-computed inferred state
        reason: Custom reason for the state initialization (optional, overrides default reason)
        context_data: Additional context data to store with state record (optional)
        overwrite_state: Overwrite the state if it already exists (optional)
    Returns:
        Current or newly initialized state value, or None if FSM disabled or failed

    Examples:
        >>> task = Task.objects.get(id=123)  # Pre-existing task without state
        >>> from fsm.state_inference import get_or_infer_state
        >>> inferred_state = get_or_infer_state(task)
        >>> state = get_or_initialize_state(task, user=request.user, inferred_state=inferred_state)
        >>> # state is now 'COMPLETED' or 'CREATED' based on task.is_labeled
        >>> # and a state record has been created
    """
    if not is_fsm_enabled(user):
        return None

    # Skip if FSM is temporarily disabled (e.g., during cleanup or bulk operations)
    if CurrentContext.is_fsm_disabled():
        return inferred_state  # Return inferred state without persisting

    try:
        from fsm.state_manager import get_state_manager

        StateManager = get_state_manager()

        # Try to get existing state
        current_state = StateManager.get_current_state_value(entity)

        if current_state is not None and (current_state == inferred_state or not overwrite_state):
            # State already exists, return it
            return current_state

        if inferred_state is None:
            logger.warning(
                f'Cannot initialize state for {entity._meta.model_name} {entity.pk} - inference failed',
                extra={
                    'event': 'fsm.initialize_state_failed',
                    'entity_type': entity._meta.model_name,
                    'entity_id': entity.pk,
                },
            )
            return None

        # Initialize state with appropriate transition
        entity_type = entity._meta.model_name.lower()
        transition_name = get_initialization_transition_name(entity_type, inferred_state)

        if transition_name:
            logger.info(
                f'Initializing FSM state for pre-existing {entity_type} {entity.pk}',
                extra={
                    'event': 'fsm.cold_start_initialization',
                    'entity_type': entity_type,
                    'entity_id': entity.pk,
                    'inferred_state': inferred_state,
                    'transition_name': transition_name,
                },
            )
            # Pass reason and context_data if provided (flow through to TransitionContext)
            StateManager.execute_transition(
                entity=entity,
                transition_name=transition_name,
                user=user,
                reason=reason,
                context_data=context_data or {},
            )
            return inferred_state
        else:
            logger.warning(
                f'No initialization transition found for {entity_type} -> {inferred_state}',
                extra={
                    'event': 'fsm.no_initialization_transition',
                    'entity_type': entity_type,
                    'entity_id': entity.pk,
                    'inferred_state': inferred_state,
                },
            )
            return None

    except Exception as e:
        logger.error(
            f'Failed to get or initialize state for {entity._meta.model_name} {entity.pk}: {str(e)}',
            extra={
                'event': 'fsm.get_or_initialize_error',
                'entity_type': entity._meta.model_name,
                'entity_id': entity.pk,
                'error': str(e),
            },
            exc_info=True,
        )
        return None


def _get_initialization_transition_name(entity_type: str, target_state: str) -> Optional[str]:
    """
    Get the appropriate transition name for initializing an entity to a target state.

    Args:
        entity_type: Type of entity ('task', 'project', 'annotation')
        target_state: The target state to initialize to

    Returns:
        Transition name, or None if no appropriate transition exists
    """
    from fsm.state_choices import AnnotationStateChoices, ProjectStateChoices, TaskStateChoices

    if entity_type == 'task':
        if target_state == TaskStateChoices.CREATED:
            return 'task_created'
        elif target_state == TaskStateChoices.COMPLETED:
            return 'task_completed'
        elif target_state == TaskStateChoices.IN_PROGRESS:
            return 'task_in_progress'
    elif entity_type == 'project':
        if target_state == ProjectStateChoices.CREATED:
            return 'project_created'
        elif target_state == ProjectStateChoices.IN_PROGRESS:
            return 'project_in_progress'
        elif target_state == ProjectStateChoices.COMPLETED:
            return 'project_completed'
    elif entity_type == 'annotation':
        if target_state == AnnotationStateChoices.CREATED:
            return 'annotation_created'

    return None


def get_initialization_transition_name(entity_type: str, target_state: str) -> Optional[str]:
    return load_func(settings.FSM_INITIALIZATION_TRANSITION_NAME)(entity_type, target_state)
