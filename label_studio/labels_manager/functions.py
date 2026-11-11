from core.utils.iterators import iterate_queryset
from django.db import transaction
from tasks.models import Annotation


def bulk_update_label(old_label, new_label, organization, project=None, project_ids=None):
    """Replace old_label with new_label in annotation results.

    Scope is `project` when given, else the projects in `project_ids`. Callers acting for a user must pass
    one of them: without either, every annotation in the organization is rewritten (FIT-3296).
    """
    annotations = Annotation.objects.filter(project__organization=organization)
    if project is not None:
        annotations = annotations.filter(project=project)
    elif project_ids is not None:
        annotations = annotations.filter(project_id__in=project_ids)

    updated_count = 0
    with transaction.atomic():
        update_annotations = []
        for annotation in iterate_queryset(annotations.only('result', 'task_id')):
            result = annotation.result

            updated_result = []
            need_update = False
            for region in result:
                result_type = region.get('type')
                if result_type is not None:
                    label = region['value'].get(result_type)
                    if label is not None and label == old_label:
                        region['value'][result_type] = new_label
                        updated_count += 1
                        need_update = True
                updated_result.append(region)

            if need_update:
                annotation.result = updated_result
                update_annotations.append(annotation)

        if update_annotations:
            Annotation.objects.bulk_update(update_annotations, ['result'])
            # bulk_update skips Annotation.save() -> update_task(); the rewritten results are exported, so bump
            # Task.updated_at for incremental exports (FIT-3092).
            from tasks.functions import touch_tasks_updated_at

            touch_tasks_updated_at(annotation.task_id for annotation in update_annotations)
    return updated_count
