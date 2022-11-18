import time

import pytest
import threading
from tasks.models import Task, Annotation, Prediction, bulk_update_stats_project_tasks


@pytest.mark.django_db
def test_export(
        business_client, configured_project
):
    task_query = Task.objects.filter(project=configured_project.id)
    task_query.update(is_labeled=True)
    t = threading.Thread(target=worker_change_stats, args=(task_query.values_list('id', flat=True),))
    t.daemon = True
    t.start()
    time.sleep(20)
    assert Task.objects.filter(is_labeled=True).count() == 2
    time.sleep(70)
    assert Task.objects.filter(is_labeled=True).count() == 2
    bulk_update_stats_project_tasks(task_query)
    assert Task.objects.filter(is_labeled=True).count() == 0


def worker_change_stats(time_seconds, tasks):
    tasks = Task.objects.filter(id__in=tasks)
    bulk_update_stats_project_tasks(tasks)
