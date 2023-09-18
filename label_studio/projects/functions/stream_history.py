from django.conf import settings
from django.db import transaction
from projects.models import LabelStreamHistory
from tasks.models import Annotation, Task

TASK_ID_KEY = 'taskId'
ANNOTATION_ID_KEY = 'annotationId'


def add_stream_history(next_task, user, project):
    if next_task is not None:
        with transaction.atomic():
            history, created = LabelStreamHistory.objects.get_or_create(user=user, project=project)
            new_history_data = {TASK_ID_KEY: next_task.id, ANNOTATION_ID_KEY: None}
            if created:
                history.data = [new_history_data]
            else:
                task_ids = set([h[TASK_ID_KEY] for h in history.data])
                if next_task.id not in task_ids:
                    history.data.append(new_history_data)
                if len(task_ids) + 1 > settings.LABEL_STREAM_HISTORY_LIMIT:
                    history.data = history.data[-settings.LABEL_STREAM_HISTORY_LIMIT :]
            history.save()


def fill_history_annotation(user, task, annotation):
    history = user.histories.filter(project=task.project).first()
    if history and history.data:
        for item in history.data:
            if item[TASK_ID_KEY] == task.id:
                item[ANNOTATION_ID_KEY] = annotation.id
        history.save()


def get_label_stream_history(user, project):
    result = []

    with transaction.atomic():
        history = user.histories.filter(project=project).first()
        if history is None:
            return result

        data = history.data

        task_ids = set([h[TASK_ID_KEY] for h in history.data])
        annotation_ids = set([h[ANNOTATION_ID_KEY] for h in history.data])
        existing_task_ids = set(Task.objects.filter(pk__in=task_ids).values_list('id', flat=True))
        existing_annotation_ids = set(Annotation.objects.filter(pk__in=annotation_ids).values_list('id', flat=True))

        result = []
        for item in data:
            if item[TASK_ID_KEY] not in existing_task_ids:
                continue
            if item[ANNOTATION_ID_KEY] not in existing_annotation_ids:
                item[ANNOTATION_ID_KEY] = None
            result.append(item)
        history.data = result
        history.save(update_fields=['data'])

    return result
