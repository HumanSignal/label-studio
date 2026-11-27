"""Tests for tasks/functions.py."""

from datetime import timedelta

import pytest
from django.test import override_settings
from django.utils import timezone
from projects.tests.factories import ProjectFactory
from tasks.functions import touch_tasks_updated_at
from tasks.models import Task
from tasks.tests.factories import TaskFactory


@pytest.mark.django_db
class TestTouchTasksUpdatedAt:
    def _stale_tasks(self, count):
        project = ProjectFactory()
        tasks = [TaskFactory(project=project) for _ in range(count)]
        stale = timezone.now() - timedelta(days=7)
        Task.objects.filter(id__in=[t.id for t in tasks]).update(updated_at=stale)
        return tasks, stale

    def test_bumps_only_given_tasks_and_ignores_none(self):
        tasks, stale = self._stale_tasks(3)

        updated = touch_tasks_updated_at([tasks[0].id, tasks[1].id, tasks[1].id, None])

        assert updated == 2
        by_id = {t.id: t.updated_at for t in Task.objects.filter(id__in=[t.id for t in tasks])}
        assert by_id[tasks[0].id] > stale
        assert by_id[tasks[1].id] > stale
        assert by_id[tasks[2].id] == stale

    def test_empty_input_issues_no_query(self, django_assert_num_queries):
        with django_assert_num_queries(0):
            assert touch_tasks_updated_at([None]) == 0

    @override_settings(BATCH_SIZE=2)
    def test_updates_in_batch_size_chunks(self, django_assert_num_queries):
        tasks, stale = self._stale_tasks(5)

        with django_assert_num_queries(3):
            updated = touch_tasks_updated_at(t.id for t in tasks)

        assert updated == 5
        assert not Task.objects.filter(id__in=[t.id for t in tasks], updated_at=stale).exists()

    def test_sets_updated_by_when_given(self):
        tasks, _ = self._stale_tasks(1)
        user = tasks[0].project.created_by

        touch_tasks_updated_at([tasks[0].id], updated_by=user)

        tasks[0].refresh_from_db()
        assert tasks[0].updated_by_id == user.id
