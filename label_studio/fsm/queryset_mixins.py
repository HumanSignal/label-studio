"""
FSM QuerySet Mixins for annotating entities with their current state.

Provides reusable Django QuerySet mixins that efficiently annotate entities
with their current FSM state using optimized subqueries to prevent N+1 queries.

Usage:
    class TaskQuerySet(FSMStateQuerySetMixin, models.QuerySet):
        pass

    class TaskManager(models.Manager):
        def get_queryset(self):
            return TaskQuerySet(self.model, using=self._db)

Note:
    State annotation is guarded by 'fflag_feat_fit_568_finite_state_management' only.
    This allows background FSM processes to annotate current_state for internal use.

    UI/API consumption of state fields is separately controlled by serializers
    that check BOTH 'fflag_feat_fit_568_finite_state_management' AND
    'fflag_feat_fit_710_fsm_state_fields' before exposing state data.

    When the flag is disabled, no annotation is performed and there is zero performance impact.
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

    Provides the `with_state()` method that adds a `current_state`
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
                return self.get_queryset().with_state()

        # Usage - both approaches work identically
        tasks = Task.objects.with_state().filter(project=project)
        # Or chain it after filters
        tasks = Task.objects.filter(project=project).with_state()

        for task in tasks:
            print(f"Task {task.id}: {task.current_state}")  # No additional queries!
    """

    def with_state(self):
        """
        Annotate the queryset with the current FSM state.

        Adds a `current_state` field to each object containing the current
        state string value. This is done using an efficient subquery that
        leverages UUID7 natural ordering to prevent N+1 queries.

        Returns:
            QuerySet: The annotated queryset with `current_state` field

        Example:
            # Chain after filters
            tasks = Task.objects.filter(project=project).with_state()

            # Or use from manager
            tasks = Task.objects.with_state().filter(project=project)

            # Multiple chaining
            tasks = Task.objects.filter(is_labeled=True).with_state().order_by('-created_at')

        Note:
            - If FSM feature flag is disabled, returns queryset unchanged (zero impact)
            - If no state exists for an entity, `current_state` will be None
            - The state is read-only and should not be modified directly
        """
        # Check only fflag_feat_fit_568_finite_state_management for background FSM processes.
        # This allows background processes to annotate current_state for internal use.
        # UI/API serializers separately check both fflag_feat_fit_568 AND fflag_feat_fit_710
        # before exposing state data to consumers.
        user = CurrentContext.get_user()
        if not flag_set('fflag_feat_fit_568_finite_state_management', user=user):
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
