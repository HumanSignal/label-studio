"""
FSM Transitions for Project model.

This module defines declarative transitions for the Project entity,
replacing the previous signal-based approach with explicit, testable transitions.
"""

from typing import Any, Dict, Optional

from fsm.registry import register_state_transition
from fsm.state_choices import ProjectStateChoices
from fsm.state_manager import StateManager
from fsm.transitions import ModelChangeTransition, TransitionContext
from fsm.utils import get_or_initialize_state, infer_entity_state_from_data


@register_state_transition('project', 'project_created', triggers_on_create=True, triggers_on_update=False)
class ProjectCreatedTransition(ModelChangeTransition):
    """
    Transition when a new project is created.

    This is the initial state transition that occurs when a project is
    first saved to the database.

    Trigger: Automatically on creation (triggers_on_create=True, triggers_on_update=False)
    """

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
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

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
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

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
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

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
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
    current_state = StateManager.get_current_state_value(project)
    inferred_state = infer_entity_state_from_data(project)

    if current_state is None:
        get_or_initialize_state(project, user=user, inferred_state=inferred_state)
        return

    if current_state != inferred_state:
        if inferred_state == ProjectStateChoices.IN_PROGRESS:
            # Select in progress transition based on current state
            if current_state == ProjectStateChoices.CREATED:
                StateManager.execute_transition(entity=project, transition_name='project_in_progress', user=user)
            elif current_state == ProjectStateChoices.COMPLETED:
                StateManager.execute_transition(
                    entity=project, transition_name='project_in_progress_from_completed', user=user
                )
        elif inferred_state == ProjectStateChoices.COMPLETED:
            StateManager.execute_transition(entity=project, transition_name='project_completed', user=user)
