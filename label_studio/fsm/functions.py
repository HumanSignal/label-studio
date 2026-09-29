"""
FSM utility functions for backfilling and managing state transitions.

This module contains reusable functions for FSM state management that are
used across different parts of the codebase.
"""

import logging
from typing import Callable, Optional

from core.current_request import CurrentContext
from core.feature_flags import flag_set
from core.utils.iterators import iterate_queryset
from django.conf import settings
from django.db.models import Exists, OuterRef
from fsm.state_inference import get_or_infer_state
from fsm.utils import (
    FF_IMPORT_BULK_TASK_STATES,
    bulk_initialize_created_task_states,
    get_or_initialize_state,
    is_fsm_enabled,
)

logger = logging.getLogger(__name__)

TASK_STATE_PROGRESS_EVERY = 100


def _bulk_initialize_unannotated_task_states(
    task_ids: list, user, on_progress: Optional[Callable], initialized: set
) -> None:
    """
    Give CREATED states in bulk to tasks without annotations and without a state record.

    Tasks are visible as soon as each one is committed during storage sync, so a state may already
    have been created for some of them by a concurrent read; those are left to the per-task path.
    The filter and the insert are not atomic: a task annotated between them (a window of about a
    hundred ms per chunk) keeps CREATED as its current state until its next transition. Locking the
    chunk's task rows would close this, at the cost of blocking annotation writes while it runs.

    The IDs of the tasks that got a state here are added to initialized as each chunk is written.
    """
    from fsm.registry import get_state_model
    from tasks.models import Annotation, Task

    state_model = get_state_model('task')
    for start in range(0, len(task_ids), settings.BATCH_SIZE):
        chunk = task_ids[start : start + settings.BATCH_SIZE]
        tasks = list(
            Task.objects.filter(id__in=chunk)
            .exclude(Exists(Annotation.objects.filter(task=OuterRef('pk'))))
            .exclude(Exists(state_model.objects.filter(task=OuterRef('pk'))))
            .only('id', 'project_id', 'data')
        )
        bulk_initialize_created_task_states(tasks, user=user)
        initialized.update(task.id for task in tasks)
        if on_progress:
            on_progress()


def backfill_fsm_states_for_tasks(
    storage_id, tasks_created, link_class, project=None, on_progress: Optional[Callable] = None
) -> set:
    """
    Backfill initial FSM states for tasks created during storage sync.

    This function creates initial CREATED state records for all tasks that were
    created during a storage sync operation. It's designed to be called after
    tasks have been successfully created and linked to storage.

    Args:
        storage_id: The ID of the storage that created the tasks
        tasks_created: Number of tasks that were created
        link_class: The link model class (e.g., S3ImportStorageLink) to query tasks
        project: The storage's project, used for the bulk task states feature flag
        on_progress: Called periodically so the caller can report that the sync is alive

    Returns:
        IDs of the tasks whose states were created in bulk, without post-transition hooks

    Note:
        - CurrentContext must be available before calling this function
        - This function is safe to call in both LSO and LSE environments
        - Failures are logged but don't propagate to prevent breaking storage sync
        - FSM feature flag is checked before processing
        - Tasks are processed in chunks via iterate_queryset to avoid OOM issues
    """
    initialized = set()
    if tasks_created <= 0:
        return initialized

    # Check FSM feature flag - early return if FSM is not enabled
    if not is_fsm_enabled():
        return initialized

    try:
        from tasks.models import Task

        # Get task IDs created in this sync
        task_ids = list(
            link_class.objects.filter(storage=storage_id)
            .order_by('-created_at')[:tasks_created]
            .values_list('task_id', flat=True)
        )

        if not task_ids:
            return initialized

        logger.info(f'Storage sync: creating initial FSM states for {len(task_ids)} tasks')

        user = CurrentContext.get_user()
        remaining_ids = task_ids
        if project is not None and flag_set(FF_IMPORT_BULK_TASK_STATES, user=project.organization.created_by):
            _bulk_initialize_unannotated_task_states(task_ids, user, on_progress, initialized)
            remaining_ids = [task_id for task_id in task_ids if task_id not in initialized]

        # Use iterate_queryset to process tasks in chunks, avoiding OOM issues
        tasks_qs = Task.objects.filter(id__in=remaining_ids)
        for i, task in enumerate(iterate_queryset(tasks_qs)):
            inferred_state = get_or_infer_state(task)
            get_or_initialize_state(task, user=user, inferred_state=inferred_state)
            if on_progress and i % TASK_STATE_PROGRESS_EVERY == 0:
                on_progress()

        logger.info(f'Storage sync: FSM states created for {len(task_ids)} tasks')
    except Exception as e:
        # Don't fail storage sync if FSM sync fails
        logger.error(f'FSM sync after storage sync failed: {e}', exc_info=True)
    return initialized


def update_task_state_after_annotation_deletion(task, project):
    """
    Update task FSM state after an annotation has been deleted.

    This function ensures that the task's FSM state reflects its current labeled status
    after an annotation has been deleted. It will:
    1. Check if FSM is enabled
    2. Get the current task state
    3. Determine the expected state based on task.is_labeled
    4. Execute appropriate transition if state doesn't match
    5. Update project state if task state was changed

    Args:
        task: The Task instance whose annotation was deleted
        project: The Project instance containing the task

    Note:
        - Requires CurrentContext to be set with a valid user
        - Failures are logged but don't propagate to prevent breaking annotation deletion
        - Will initialize state if task has no FSM state record yet
    """
    from core.current_request import CurrentContext
    from fsm.project_transitions import update_project_state_after_task_change
    from fsm.state_choices import TaskStateChoices
    from fsm.state_manager import get_state_manager
    from fsm.utils import is_fsm_enabled

    # Get user from context for FSM
    user = CurrentContext.get_user()

    if not is_fsm_enabled(user=user):
        return

    try:
        StateManager = get_state_manager()

        # Get current state - may be None if entity has no state record yet
        current_task_state = StateManager.get_current_state_value(task)

        # Determine what the state should be based on task's labeled status
        expected_state = TaskStateChoices.COMPLETED if task.is_labeled else TaskStateChoices.IN_PROGRESS

        # If no state exists, initialize it based on current condition
        if current_task_state is None:
            # Initialize state for entities that existed before FSM was deployed
            if task.is_labeled:
                StateManager.execute_transition(entity=task, transition_name='task_completed', user=user)
            else:
                StateManager.execute_transition(entity=task, transition_name='task_in_progress', user=user)
            # Update project state based on task changes
            update_project_state_after_task_change(project, user=user)
        # If state exists but doesn't match the task's labeled status, fix it
        elif current_task_state != expected_state:
            if expected_state == TaskStateChoices.IN_PROGRESS:
                StateManager.execute_transition(entity=task, transition_name='task_in_progress', user=user)
            else:
                StateManager.execute_transition(entity=task, transition_name='task_completed', user=user)
            # Update project state based on task changes
            update_project_state_after_task_change(project, user=user)

    except Exception as e:
        # Final safety net - log but don't break annotation deletion
        logger.warning(
            f'FSM state update failed during annotation deletion: {str(e)}',
            extra={'task_id': task.id, 'project_id': project.id},
        )
