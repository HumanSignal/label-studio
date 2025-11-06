"""
FSM utility functions for backfilling and managing state transitions.

This module contains reusable functions for FSM state management that are
used across different parts of the codebase.
"""

import logging

logger = logging.getLogger(__name__)


def backfill_fsm_states_for_tasks(storage_id, tasks_created, link_class):
    """
    Backfill initial FSM states for tasks created during storage sync.

    This function creates initial CREATED state records for all tasks that were
    created during a storage sync operation. It's designed to be called after
    tasks have been successfully created and linked to storage.

    Args:
        storage_id: The ID of the storage that created the tasks
        tasks_created: Number of tasks that were created
        link_class: The link model class (e.g., S3ImportStorageLink) to query tasks

    Note:
        - CurrentContext must be available before calling this function
        - This function is safe to call in both LSO and LSE environments
        - Failures are logged but don't propagate to prevent breaking storage sync
    """
    if tasks_created <= 0:
        return

    try:
        from lse_fsm.state_inference import backfill_state_for_entity
        from tasks.models import Task

        # Get tasks created in this sync
        task_ids = list(
            link_class.objects.filter(storage=storage_id)
            .order_by('-created_at')[:tasks_created]
            .values_list('task_id', flat=True)
        )

        tasks = Task.objects.filter(id__in=task_ids)

        logger.info(f'Storage sync: creating initial FSM states for {len(task_ids)} tasks')

        # Backfill initial CREATED state for each task
        for task in tasks:
            backfill_state_for_entity(task, 'task', create_record=True)

        logger.info(f'Storage sync: FSM states created for {len(task_ids)} tasks')
    except ImportError:
        # LSE not available (OSS), skip FSM sync
        logger.debug('LSE not available, skipping FSM state backfill for storage sync')
    except Exception as e:
        # Don't fail storage sync if FSM sync fails
        logger.error(f'FSM sync after storage sync failed: {e}', exc_info=True)


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
