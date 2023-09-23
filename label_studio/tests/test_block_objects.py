import threading
import time

import pytest
from core.utils.common import db_is_not_sqlite
from tasks.models import Task, bulk_update_stats_project_tasks


@pytest.mark.django_db
def test_export(business_client, configured_project):
    task_query = Task.objects.filter(project=configured_project.id)
    task_query.update(is_labeled=True)
    if db_is_not_sqlite():
        # NB: due to sqlite write locking behavior, this test would otherwise be flaky on a sqlite DB
        t = threading.Thread(target=worker_change_stats, args=(task_query.values_list('id', flat=True),))
        t.daemon = True
        t.start()
        time.sleep(20)
        assert Task.objects.filter(is_labeled=True).count() == 2
        time.sleep(70)
    assert Task.objects.filter(is_labeled=True).count() == 2
    bulk_update_stats_project_tasks(task_query)
    assert Task.objects.filter(is_labeled=True).count() == 0


def worker_change_stats(tasks):
    tasks = Task.objects.filter(id__in=tasks)
    bulk_update_stats_project_tasks(tasks)
