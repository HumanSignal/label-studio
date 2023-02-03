from django.db import transaction
from django.conf import settings

from projects.models import LabelStreamHistory


def add_stream_history(next_task, user, project):
    if next_task is not None:
        with transaction.atomic():
            history, created = LabelStreamHistory.objects.get_or_create(user=user, project=project)
            new_history_data = {"taskId": next_task.id, "annotationId": None}
            if created:
                history.data = [new_history_data]
            else:
                task_ids = set([h['taskId'] for h in history.data])
                if next_task.id not in task_ids:
                    history.data.append(new_history_data)
                if len(task_ids) + 1 > settings.LABEL_STREAM_HISTORY_LIMIT:
                    history.data = history.data[-settings.LABEL_STREAM_HISTORY_LIMIT:]
            history.save()


def fill_history_annotation(user, task, annotation):
    history = user.histories.filter(project=task.project).first()
    if history and history.data and history.data[-1]['taskId'] == task.id:
        history.data[-1]['annotationId'] = annotation.id
        history.save()
