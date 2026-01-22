import logging
from typing import Optional

from core.utils.common import load_func
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_or_infer_state(entity) -> Optional[str]:
    """
    Infer what the FSM state should be based on entity's current data.

    This is used for "cold start" scenarios where entities exist in the database
    but don't have FSM state records yet (e.g., after FSM deployment to production
    with pre-existing data).

    Args:
        entity: The entity to infer state for (Task, Project, or Annotation)

    Returns:
        Inferred state value, or None if entity type not supported

    Examples:
        >>> task = Task.objects.get(id=123)
        >>> task.is_labeled = True
        >>> _get_or_infer_state(task)
        'COMPLETED'

        >>> project = Project.objects.get(id=456)
        >>> _get_or_infer_state(project)
        'CREATED'
    """
    from fsm.state_choices import AnnotationStateChoices, ProjectStateChoices, TaskStateChoices

    entity_type = entity._meta.model_name.lower()

    if entity_type == 'task':
        # Task state depends on whether it has been partially or fully labeled
        if entity.is_labeled:
            return TaskStateChoices.COMPLETED
        elif entity.total_annotations > 0:
            return TaskStateChoices.IN_PROGRESS
        else:
            return TaskStateChoices.CREATED
    elif entity_type == 'project':
        # Project state depends on task completion
        # If no tasks exist, project is CREATED
        # If any tasks are completed, project is at least IN_PROGRESS
        # If all tasks are completed, project is COMPLETED
        tasks = entity.tasks.all()
        if not tasks.exists():
            return ProjectStateChoices.CREATED

        # Count labeled tasks to determine project state
        total_tasks = tasks.count()
        labeled_tasks = tasks.filter(is_labeled=True).count()

        if labeled_tasks == 0:
            return ProjectStateChoices.CREATED
        elif labeled_tasks == total_tasks:
            return ProjectStateChoices.COMPLETED
        else:
            return ProjectStateChoices.IN_PROGRESS
    elif entity_type == 'annotation':
        # Annotations start in CREATED state
        return AnnotationStateChoices.CREATED
    else:
        logger.warning(
            f'Cannot infer state for unknown entity type: {entity_type}',
            extra={
                'event': 'fsm.infer_state_unknown_type',
                'entity_type': entity_type,
                'entity_id': entity.pk,
            },
        )
        return None


def get_or_infer_state(entity) -> Optional[str]:
    func = load_func(settings.FSM_INFERENCE_FUNCTION)
    return func(entity)
