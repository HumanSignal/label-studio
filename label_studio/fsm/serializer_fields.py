"""
FSM Serializer Fields for Django Rest Framework.

Provides reusable DRF serializer fields for exposing FSM state in API responses.
These fields work seamlessly with the FSMStateQuerySetMixin annotations to prevent
N+1 queries.

Usage:
    from fsm.serializer_fields import FSMStateField

    class TaskSerializer(serializers.ModelSerializer):
        state = FSMStateField(read_only=True)

        class Meta:
            model = Task
            fields = ['id', 'data', 'state', ...]

Note:
    All state serialization functionality is guarded by TWO feature flags:
    1. 'fflag_feat_fit_568_finite_state_management' - Controls FSM background calculations
    2. 'fflag_feat_fit_710_fsm_state_fields' - Controls state field display in APIs

    When either flag is disabled, fields return None. This allows enabling FSM background
    work while keeping state fields hidden during incremental rollout and testing.
"""

from core.current_request import CurrentContext
from core.feature_flags import flag_set
from fsm.state_manager import StateManager
from rest_framework import serializers


class FSMStateField(serializers.ReadOnlyField):
    """
    Read-only DRF field for exposing FSM state.

    This field automatically uses the `state` or `current_state` annotation if present
    (preventing N+1 queries), or falls back to querying the state manager
    if the annotation is missing.

    Key features:
    - Works with annotated querysets (no N+1 queries)
    - Falls back to StateManager for single object retrievals
    - Always read-only (state changes through transitions only)
    - Returns None if FSM is disabled or no state exists

    Example with annotations (optimal):
        # In your viewset
        def get_queryset(self):
            return Task.objects.all().with_state()

        # In your serializer
        class TaskSerializer(serializers.ModelSerializer):
            state = FSMStateField()

            class Meta:
                model = Task
                fields = ['id', 'data', 'state']

        # Result: No N+1 queries, state comes from annotation

    Example without annotations (fallback):
        # Direct object retrieval
        task = Task.objects.get(id=123)
        serializer = TaskSerializer(task)

        # Result: Calls StateManager.get_current_state_value()
        # Still efficient due to StateManager caching
    """

    def __init__(self, **kwargs):
        # Set source='*' to pass the entire object instance to to_representation()
        # instead of a specific attribute, since we check multiple possible attributes
        kwargs.setdefault('source', '*')
        super().__init__(**kwargs)

    def to_representation(self, instance):
        """
        Serialize the FSM state to a string.

        Args:
            instance: The model instance being serialized

        Returns:
            str or None: The current state value (None if either feature flag disabled)
        """
        # Check both feature flags (works for both core and enterprise)
        # 1. General FSM functionality (background calculations)
        # 2. State field display control (API exposure)
        user = CurrentContext.get_user()
        if not (
            flag_set('fflag_feat_fit_568_finite_state_management', user=user)
            and flag_set('fflag_feat_fit_710_fsm_state_fields', user=user)
        ):
            return None

        if instance is None:
            return None

        # Check if the instance has a state annotation
        # This can come from Data Manager's annotate_state() or FSMStateQuerySetMixin.with_state()
        if hasattr(instance, 'state'):
            # Use the annotated value (no additional query)
            return instance.state
        elif hasattr(instance, 'current_state'):
            # Fallback to current_state annotation from FSMStateQuerySetMixin
            return instance.current_state

        # Fallback: Query the state manager
        # This happens when the queryset wasn't annotated
        # StateManager has its own caching, so this is still efficient
        try:
            return StateManager.get_current_state_value(instance)
        except Exception:
            # If FSM is disabled or state model not found, return None
            return None

    def to_internal_value(self, data):
        """
        This field is read-only, so this should never be called.
        """
        raise NotImplementedError('FSMStateField is read-only. Use transitions to change state.')
