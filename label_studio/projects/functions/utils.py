from tasks.models import AnnotationDraft, Task


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


def recalculate_created_annotations_and_labels_from_scratch(project, summary, organization_id):
    """Recalculate created_labels, created_annotations and created_labels_drafts from scratch

    :param project: Project
    :param summary: ProjectSummary
    :param organization_id: Organization.id, it is required for django-rq displaying on admin page
    """
    summary.created_labels, summary.created_annotations = {}, {}
    if project.annotations.exists():
        summary.update_created_annotations_and_labels(project.annotations.all())
    else:
        summary.save(update_fields=['created_labels', 'created_annotations'])

    summary.created_labels_drafts = {}
    drafts = AnnotationDraft.objects.filter(task__project=project)
    if drafts.exists():
        summary.update_created_labels_drafts(drafts)
    else:
        summary.save(update_fields=['created_labels_drafts'])
