"""
FSM Transitions for Project model.

This module defines declarative transitions for the Project entity,
replacing the previous signal-based approach with explicit, testable transitions.
"""

from typing import Any, Dict

from fsm.registry import register_state_transition
from fsm.state_choices import ProjectStateChoices
from fsm.transitions import ModelChangeTransition, TransitionContext


@register_state_transition('project', 'project_created', triggers_on_create=True, triggers_on_update=False)
class ProjectCreatedTransition(ModelChangeTransition):
    """
    Transition when a new project is created.

    This is the initial state transition that occurs when a project is
    first saved to the database.

    Trigger: Automatically on creation (triggers_on_create=True, triggers_on_update=False)
    """

    @property
    def target_state(self) -> str:
        return ProjectStateChoices.CREATED

    def should_execute(self, context: TransitionContext) -> bool:
        """Only execute on creation, never on updates."""
        return self.is_creating

    def get_reason(self, context: TransitionContext) -> str:
        """Return detailed reason for project creation."""
        return 'Project created'

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        """
        Execute project creation transition.

        Args:
            context: Transition context containing project and user information

        Returns:
            Context data to store with the state record
        """
        project = context.entity

        return {
            'reason': 'Project created',
            'organization_id': project.organization_id,
            'title': project.title,
            'created_by_id': project.created_by_id if project.created_by_id else None,
            'label_config_present': bool(project.label_config),
        }


# Note: Project state transitions (IN_PROGRESS, COMPLETED) are triggered by task state changes
# via update_project_state_after_task_change() helper function, not by direct project model changes.


@register_state_transition('project', 'project_in_progress', triggers_on_create=False, triggers_on_update=False)
class ProjectInProgressTransition(ModelChangeTransition):
    """
    Transition when project moves to IN_PROGRESS state.

    Triggered when: First annotation is submitted on any task
    From: CREATED -> IN_PROGRESS
    """

    @property
    def target_state(self) -> str:
        return ProjectStateChoices.IN_PROGRESS

    def get_reason(self, context: TransitionContext) -> str:
        return 'Project moved to in progress - first annotation submitted'

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        project = context.entity
        return {
            'reason': 'Project moved to in progress - first annotation submitted',
            'organization_id': project.organization_id,
            'total_tasks': project.tasks.count(),
        }


@register_state_transition('project', 'project_completed', triggers_on_create=False, triggers_on_update=False)
class ProjectCompletedTransition(ModelChangeTransition):
    """
    Transition when project moves to COMPLETED state.

    Triggered when: All tasks in project are COMPLETED
    From: IN_PROGRESS -> COMPLETED
    """

    @property
    def target_state(self) -> str:
        return ProjectStateChoices.COMPLETED

    def get_reason(self, context: TransitionContext) -> str:
        return 'Project completed - all tasks completed'

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        project = context.entity
        return {
            'reason': 'Project completed - all tasks completed',
            'organization_id': project.organization_id,
            'total_tasks': project.tasks.count(),
        }


@register_state_transition(
    'project', 'project_in_progress_from_completed', triggers_on_create=False, triggers_on_update=False
)
class ProjectInProgressFromCompletedTransition(ModelChangeTransition):
    """
    Transition when project moves back to IN_PROGRESS from COMPLETED.

    Triggered when: Any task becomes not COMPLETED (e.g., annotations deleted)
    From: COMPLETED -> IN_PROGRESS
    """

    @property
    def target_state(self) -> str:
        return ProjectStateChoices.IN_PROGRESS

    def get_reason(self, context: TransitionContext) -> str:
        return 'Project moved back to in progress - task became incomplete'

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        project = context.entity
        return {
            'reason': 'Project moved back to in progress - task became incomplete',
            'organization_id': project.organization_id,
            'total_tasks': project.tasks.count(),
        }


def update_project_state_after_task_change(project, user=None):
    """
    Update project FSM state based on task states.

    This helper function is called after any task state change to update the parent project's state.
    It handles "cold start" scenarios where tasks or the project may not have state records yet.

    State transition logic:
    - CREATED -> IN_PROGRESS: When any task becomes COMPLETED
    - IN_PROGRESS -> COMPLETED: When ALL tasks are COMPLETED
    - COMPLETED -> IN_PROGRESS: When ANY task is not COMPLETED

    Args:
        project: Project instance to update
        user: User triggering the change (for FSM context)
    """
    from fsm.state_choices import ProjectStateChoices, TaskStateChoices
    from fsm.state_manager import StateManager
    from fsm.utils import get_or_initialize_state, infer_entity_state_from_data

    # Get task state counts
    from tasks.models import Task

    tasks = Task.objects.filter(project=project)
    total_tasks = tasks.count()

    if total_tasks == 0:
        # No tasks - ensure project is in CREATED state
        current_project_state = get_or_initialize_state(project, user=user)
        return

    # Count completed tasks - handle both tasks with and without state records
    completed_tasks_count = 0

    for task in tasks:
        # Get or initialize task state
        task_state = StateManager.get_current_state_value(task)

        if task_state is None:
            # Task has no state record - infer from data
            task_state = infer_entity_state_from_data(task)

            # Initialize the task state
            if task_state:
                get_or_initialize_state(task, user=user, inferred_state=task_state)

        # Count completed tasks
        if task_state == TaskStateChoices.COMPLETED:
            completed_tasks_count += 1

    # Determine target project state
    if completed_tasks_count == 0:
        # No completed tasks -> should be CREATED
        target_state = ProjectStateChoices.CREATED
    elif completed_tasks_count == total_tasks:
        # All tasks completed -> should be COMPLETED
        target_state = ProjectStateChoices.COMPLETED
    else:
        # Some tasks completed -> should be IN_PROGRESS
        target_state = ProjectStateChoices.IN_PROGRESS

    # Get current project state (initialize if needed)
    current_project_state = StateManager.get_current_state_value(project)

    if current_project_state is None:
        # Project has no state - initialize with target state
        get_or_initialize_state(project, user=user, inferred_state=target_state)
        return

    # Execute appropriate transition if state should change
    if current_project_state != target_state:
        if current_project_state == ProjectStateChoices.CREATED and target_state == ProjectStateChoices.IN_PROGRESS:
            StateManager.execute_transition(entity=project, transition_name='project_in_progress', user=user)
        elif (
            current_project_state == ProjectStateChoices.IN_PROGRESS and target_state == ProjectStateChoices.COMPLETED
        ):
            StateManager.execute_transition(entity=project, transition_name='project_completed', user=user)
        elif (
            current_project_state == ProjectStateChoices.COMPLETED and target_state == ProjectStateChoices.IN_PROGRESS
        ):
            StateManager.execute_transition(
                entity=project, transition_name='project_in_progress_from_completed', user=user
            )
