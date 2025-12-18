from logging import getLogger
from typing import TYPE_CHECKING

from django.db.models import QuerySet
from tasks.models import AnnotationDraft, Task

logger = getLogger(__name__)


if TYPE_CHECKING:
    from projects.models import Project, ProjectSummary


def get_unique_ids_list(tasks_queryset):
    """
    Convert various input types to a list of unique IDs.

    :param tasks_queryset: Can be:
        - list of IDs (integers)
        - list of objects with 'id' attribute
        - Django QuerySet
        - set of IDs or objects
    :return: list of unique IDs
    """
    if isinstance(tasks_queryset, (list, tuple)):
        if not tasks_queryset:
            return []

        # Check if it's a list of IDs (integers)
        if isinstance(tasks_queryset[0], int):
            return list(set(tasks_queryset))  # Remove duplicates

        # It's a list of objects with 'id' attribute
        return list({obj.id for obj in tasks_queryset})

    elif isinstance(tasks_queryset, set):
        if not tasks_queryset:
            return []

        # Check if it's a set of IDs (integers)
        first_item = next(iter(tasks_queryset))
        if isinstance(first_item, int):
            return list(tasks_queryset)

        # It's a set of objects with 'id' attribute
        return [obj.id for obj in tasks_queryset]

    elif isinstance(tasks_queryset, QuerySet):
        # It's a Django QuerySet
        return list(tasks_queryset.values_list('id', flat=True))

    else:
        raise ValueError(f'Unsupported type for tasks_queryset: {type(tasks_queryset)}')


def make_queryset_from_iterable(tasks_list):
    """
    Make queryset from list/set of int/Tasks
    :param tasks_list: Iterable of Tasks or IDs
    :return: Tasks queryset
    """
    if isinstance(tasks_list, set):
        tasks_list = list(tasks_list)
    # Make query set from list of IDs
    if isinstance(tasks_list, list) and len(tasks_list) > 0:
        # Extract task IDs from Tasks list
        if isinstance(tasks_list[0], Task):
            tasks_list = [task.id for task in tasks_list]
        queryset = Task.objects.filter(id__in=tasks_list)
    else:
        ids = []
        for task in tasks_list:
            if isinstance(task, Task):
                ids.append(task.id)
            elif isinstance(task, int):
                ids.append(task)
            else:
                raise ValueError(f'Unknown object type: {str(task)}')
        queryset = Task.objects.filter(id__in=ids)
    return queryset


def recalculate_created_annotations_and_labels_from_scratch(
    project: 'Project', summary: 'ProjectSummary', organization_id: int
) -> None:
    """Recalculate from scratch:
     task columns
     created_labels
     created_annotations
     created_labels_drafts

    :param project: Project
    :param summary: ProjectSummary
    :param organization_id: Organization.id, it is required for django-rq displaying on admin page
    """
    logger.info(f'Reset cache started for project {project.id} and organization {organization_id}')
    logger.info(f'recalculate_created_annotations_and_labels_from_scratch project_id={project.id}')
    summary.all_data_columns = {}
    summary.common_data_columns = []
    summary.update_data_columns(project.tasks.only('data'))

    summary.created_labels, summary.created_annotations = {}, {}
    summary.update_created_annotations_and_labels(project.annotations.all())

    summary.created_labels_drafts = {}
    drafts = AnnotationDraft.objects.filter(task__project=project)
    summary.update_created_labels_drafts(drafts)

    logger.info(
        f'Reset cache finished for project {project.id} and organization {organization_id}:\n'
        f'created_annotations = {summary.created_annotations}\n'
        f'created_labels = {summary.created_labels}\n'
        f'created_labels_drafts = {summary.created_labels_drafts}'
    )
