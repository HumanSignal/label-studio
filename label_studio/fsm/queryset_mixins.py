"""
FSM QuerySet Mixins for annotating entities with their current state.

Provides reusable Django QuerySet mixins that efficiently annotate entities
with their current FSM state using optimized subqueries to prevent N+1 queries.

Usage:
    class TaskQuerySet(FSMStateQuerySetMixin, models.QuerySet):
        pass

    class TaskManager(models.Manager):
        def get_queryset(self):
            return TaskQuerySet(self.model, using=self._db).annotate_fsm_state()

Note:
    All state annotation functionality is guarded by TWO feature flags:
    1. 'fflag_feat_fit_568_finite_state_management' - Controls FSM background calculations
    2. 'fflag_feat_fit_710_fsm_state_fields' - Controls state field display in APIs

    When disabled, no annotation is performed and there is zero performance impact.
"""

import logging

from core.current_request import CurrentContext
from core.feature_flags import flag_set
from django.db.models import OuterRef, Subquery
from fsm.registry import get_state_model

logger = logging.getLogger(__name__)


class FSMStateQuerySetMixin:
    """
    Mixin for Django QuerySets to efficiently annotate FSM state.

    Provides the `annotate_fsm_state()` method that adds a `current_state`
    annotation to the queryset using an optimized subquery.

    This approach:
    - Prevents N+1 queries by using a single JOIN/subquery
    - Handles missing states gracefully (returns None)
    - Uses UUID7 natural ordering for optimal performance
    - Works with any FSM entity that has a registered state model

    Example:
        # In your model manager
        class TaskManager(models.Manager):
            def get_queryset(self):
                return TaskQuerySet(self.model, using=self._db)

            def with_state(self):
                return self.get_queryset().annotate_fsm_state()

        # Usage
        tasks = Task.objects.with_state().filter(project=project)
        for task in tasks:
            print(f"Task {task.id}: {task.current_state}")  # No additional queries!
    """

    def annotate_fsm_state(self):
        """
        Annotate the queryset with the current FSM state.

        Adds a `current_state` field to each object containing the current
        state string value. This is done using an efficient subquery that
        leverages UUID7 natural ordering.

        Returns:
            QuerySet: The annotated queryset with `current_state` field

        Note:
            - If FSM feature flag is disabled, returns queryset unchanged (zero impact)
            - If no state exists for an entity, `current_state` will be None
            - The state is read-only and should not be modified directly
        """
        # Check feature flag directly (works for both core and enterprise)
        # Using flag_set directly instead of is_fsm_enabled to work in enterprise context
        user = CurrentContext.get_user()
        if not (
            flag_set('fflag_feat_fit_568_finite_state_management', user=user)
            and flag_set('fflag_feat_fit_710_fsm_state_fields', user=user)
        ):
            logger.debug('FSM feature flag disabled, skipping state annotation')
            return self

        # Get the entity name from the model
        entity_name = self.model._meta.model_name

        # Get the state model for this entity
        state_model = get_state_model(entity_name)

        if not state_model:
            # No state model registered, return queryset as-is
            logger.debug(f'No state model registered for {entity_name}, skipping annotation')
            return self

        # Get the foreign key field name on the state model
        # e.g., 'task_id' for TaskState
        entity_field_name = state_model._get_entity_field_name()
        fk_field = f'{entity_field_name}_id'

        # Create subquery to get current state using UUID7 natural ordering
        # This is extremely efficient because:
        # 1. UUID7 provides natural time ordering (latest = highest ID)
        # 2. We only fetch the state column, not the entire record
        # 3. Django optimizes this into a single JOIN or lateral subquery
        current_state_subquery = Subquery(
            state_model.objects.filter(**{fk_field: OuterRef('pk')}).order_by('-id').values('state')[:1]
        )

        # Annotate the queryset with the current state
        return self.annotate(current_state=current_state_subquery)


class FSMMultiStateQuerySetMixin(FSMStateQuerySetMixin):
    """
    Extended mixin that provides additional FSM state annotation methods.

    In addition to `annotate_fsm_state()`, provides methods for:
    - Annotating multiple state-related fields
    - Filtering by state
    - Checking state transitions

    Example:
        tasks = Task.objects.all()
        tasks = tasks.annotate_fsm_state_with_metadata()

        for task in tasks:
            print(f"State: {task.current_state}")
            print(f"Previous: {task.previous_state}")
            print(f"Transitioned at: {task.state_created_at}")
    """

    def annotate_fsm_state_with_metadata(self):
        """
        Annotate the queryset with current state and additional metadata.

        Adds the following fields:
        - current_state: Current state string
        - previous_state: Previous state string (if any)
        - state_created_at: When the current state was entered
        - state_triggered_by_id: User ID who triggered the transition

        Returns:
            QuerySet: The annotated queryset with all state metadata fields

        Note:
            If FSM feature flag is disabled, returns queryset unchanged (zero impact)
        """
        # Check feature flag directly (works for both core and enterprise)
        user = CurrentContext.get_user()
        if not (
            flag_set('fflag_feat_fit_568_finite_state_management', user=user)
            and flag_set('fflag_feat_fit_710_fsm_state_fields', user=user)
        ):
            logger.debug('FSM feature flag disabled, skipping state metadata annotation')
            return self

        entity_name = self.model._meta.model_name
        state_model = get_state_model(entity_name)

        if not state_model:
            logger.debug(f'No state model registered for {entity_name}, skipping metadata annotation')
            return self

        entity_field_name = state_model._get_entity_field_name()
        fk_field = f'{entity_field_name}_id'

        # Get the latest state record for each entity
        latest_state = state_model.objects.filter(**{fk_field: OuterRef('pk')}).order_by('-id')

        return self.annotate(
            current_state=Subquery(latest_state.values('state')[:1]),
            previous_state=Subquery(latest_state.values('previous_state')[:1]),
            state_created_at=Subquery(latest_state.values('created_at')[:1]),
            state_triggered_by_id=Subquery(latest_state.values('triggered_by_id')[:1]),
        )

    def filter_by_state(self, state_value):
        """
        Filter the queryset to only include entities in a specific state.

        This is more efficient than using annotate_fsm_state().filter() because
        it pushes the filter into the subquery.

        Args:
            state_value: The state to filter by (e.g., 'COMPLETED')

        Returns:
            QuerySet: Filtered queryset

        Example:
            completed_tasks = Task.objects.all().filter_by_state('COMPLETED')

        Note:
            If FSM feature flag is disabled, returns empty queryset (safe fallback)
        """
        # Check feature flag directly (works for both core and enterprise)
        user = CurrentContext.get_user()
        if not (
            flag_set('fflag_feat_fit_568_finite_state_management', user=user)
            and flag_set('fflag_feat_fit_710_fsm_state_fields', user=user)
        ):
            logger.debug('FSM feature flag disabled, returning empty queryset for state filter')
            return self.none()

        entity_name = self.model._meta.model_name
        state_model = get_state_model(entity_name)

        if not state_model:
            logger.debug(f'No state model registered for {entity_name}, returning empty queryset')
            return self.none()

        entity_field_name = state_model._get_entity_field_name()

        # Get all entity IDs that have the specified current state
        state_model.objects.filter(state=state_value).values_list(f'{entity_field_name}_id', flat=True).distinct()

        # Filter to entities whose latest state matches
        # We need to ensure we're getting the latest state, so we use a subquery
        latest_state_with_value = (
            state_model.objects.filter(**{f'{entity_field_name}_id': OuterRef('pk')}, state=state_value)
            .order_by('-id')
            .values('id')[:1]
        )

        return self.filter(
            pk__in=Subquery(
                state_model.objects.filter(id__in=Subquery(latest_state_with_value)).values_list(
                    f'{entity_field_name}_id', flat=True
                )
            )
        )
