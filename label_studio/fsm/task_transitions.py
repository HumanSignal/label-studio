"""
FSM Transitions for Task model.

This module defines declarative transitions for the Task entity.

Note: Most task state transitions (annotation_started, annotation_complete, completed)
are triggered by Annotation changes, not Task field changes. Those are handled by
annotation transitions via post_transition_hooks that update the parent task.
"""

from typing import Any, Dict, Optional

from fsm.registry import register_state_transition
from fsm.state_choices import TaskStateChoices
from fsm.transitions import ModelChangeTransition, TransitionContext


@register_state_transition('task', 'task_created', triggers_on_create=True, triggers_on_update=False)
class TaskCreatedTransition(ModelChangeTransition):
    """
    Transition when a new task is created.

    This is the initial state transition that occurs when a task is
    first saved to the database.

    Trigger: Automatically on creation (triggers_on_create=True)

    Note: Other task transitions (annotation_started, completed, etc.) are
    triggered by Annotation model changes, not Task field changes.
    """

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
        return TaskStateChoices.CREATED

    def get_reason(self, context: TransitionContext) -> str:
        """Return detailed reason for task creation."""
        return 'Task created in the system'

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        """
        Execute task creation transition.

        Args:
            context: Transition context containing task and user information

        Returns:
            Context data to store with the state record
        """
        task = context.entity

        return {
            'reason': 'Task created in the system',
            'project_id': task.project_id,
            'data_keys': list(task.data.keys()) if task.data else [],
        }


# Note: Task state transitions (COMPLETED, IN_PROGRESS) are triggered by annotation changes
# via post_transition_hooks in annotation transitions, not by direct task model changes.


@register_state_transition('task', 'task_completed', triggers_on_create=False, triggers_on_update=False)
class TaskCompletedTransition(ModelChangeTransition):
    """
    Transition when task moves to COMPLETED state.

    Triggered when: First annotation is submitted on this task
    From: CREATED -> COMPLETED or IN_PROGRESS -> COMPLETED
    """

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
        return TaskStateChoices.COMPLETED

    def get_reason(self, context: TransitionContext) -> str:
        return 'Task completed - annotation submitted'

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        task = context.entity
        return {
            'reason': 'Task completed - annotation submitted',
            'task_id': task.id,
            'project_id': task.project_id,
            'total_annotations': task.total_annotations,
            'cancelled_annotations': task.cancelled_annotations,
            'is_labeled': task.is_labeled,
        }


@register_state_transition('task', 'task_in_progress', triggers_on_create=False, triggers_on_update=False)
class TaskInProgressTransition(ModelChangeTransition):
    """
    Transition when task moves to IN_PROGRESS state.

    Triggered when: All annotations are deleted from a completed task
    From: COMPLETED -> IN_PROGRESS
    """

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
        return TaskStateChoices.IN_PROGRESS

    def get_reason(self, context: TransitionContext) -> str:
        return 'Task moved to in progress - annotations deleted'

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        task = context.entity
        return {
            'reason': 'Task moved to in progress - annotations deleted',
            'task_id': task.id,
            'project_id': task.project_id,
            'total_annotations': task.total_annotations,
            'cancelled_annotations': task.cancelled_annotations,
            'is_labeled': task.is_labeled,
        }
