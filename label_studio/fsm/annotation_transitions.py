"""
FSM Transitions for Annotation model.

This module defines declarative transitions for the Annotation entity.
Annotation transitions can update related task states via post_transition_hooks.
"""

from typing import Any, Dict, Optional

from fsm.registry import register_state_transition
from fsm.state_choices import AnnotationStateChoices
from fsm.transitions import ModelChangeTransition, StateModelType, TransitionContext


@register_state_transition('annotation', 'annotation_submitted', triggers_on_create=True, triggers_on_update=False)
class AnnotationSubmittedTransition(ModelChangeTransition):
    """
    Transition when an annotation is submitted.

    This is the default transition for newly created annotations.

    Trigger: Automatically on creation only (triggers_on_create=True, triggers_on_update=False)
    """

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
        return AnnotationStateChoices.SUBMITTED

    def get_reason(self, context: TransitionContext) -> str:
        """Return detailed reason for annotation submission."""
        return 'Annotation submitted for review'

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        """Execute annotation submission transition."""
        annotation = context.entity

        return {
            'reason': 'Annotation submitted for review',
            'task_id': annotation.task_id,
            'project_id': annotation.project_id,
            'completed_by_id': annotation.completed_by_id,
            'lead_time': annotation.lead_time,
        }

    def post_transition_hook(self, context: TransitionContext, state_record: StateModelType) -> None:
        """
        Post-transition hook for annotation submission.

        Updates task state to COMPLETED when annotation is submitted.
        Then updates project state based on task completion status.
        Handles "cold start" scenarios where task may not have state record yet.
        """
        from fsm.project_transitions import update_project_state_after_task_change
        from fsm.state_choices import TaskStateChoices
        from fsm.state_manager import StateManager
        from fsm.utils import get_or_initialize_state

        annotation = context.entity
        task = annotation.task
        project = annotation.project

        # Get current task state (initialize if needed)
        current_task_state = StateManager.get_current_state_value(task)

        if current_task_state is None:
            # Task has no state record - initialize it
            # Since annotation was just submitted, task should be COMPLETED
            current_task_state = get_or_initialize_state(
                task, user=context.current_user, inferred_state=TaskStateChoices.COMPLETED
            )

        # Transition task to COMPLETED if not already
        if current_task_state != TaskStateChoices.COMPLETED:
            StateManager.execute_transition(entity=task, transition_name='task_completed', user=context.current_user)

        # Update project state based on task changes
        update_project_state_after_task_change(project, user=context.current_user)


@register_state_transition(
    'annotation', 'annotation_updated', triggers_on_create=False, triggers_on_update=True, force_state_record=True
)
class AnnotationUpdatedTransition(ModelChangeTransition):
    """
    Transition when an annotation is updated.

    Updates keep the annotation in SUBMITTED state but create audit trail records.

    Trigger: On update (triggers_on_create=False, triggers_on_update=True, force_state_record=True)
    """

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
        return AnnotationStateChoices.SUBMITTED

    def get_reason(self, context: TransitionContext) -> str:
        """Return detailed reason for annotation update."""
        return 'Annotation updated'

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        """Execute annotation update transition."""
        annotation = context.entity

        return {
            'reason': 'Annotation updated',
            'task_id': annotation.task_id,
            'project_id': annotation.project_id,
            'updated_by_id': getattr(annotation, 'updated_by_id', None),
            'changed_fields': list(self.changed_fields.keys()) if self.changed_fields else [],
        }

    def post_transition_hook(self, context: TransitionContext, state_record: StateModelType) -> None:
        """Post-transition hook for annotation updates."""
        pass
