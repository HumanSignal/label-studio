import pickle
from unittest.mock import patch

from data_manager.actions.basic import (
    delete_tasks,
    delete_tasks_annotations,
    delete_tasks_annotations_form,
    delete_tasks_annotations_job,
    delete_tasks_predictions,
    update_tasks_counters_by_ids,
)
from django.db import connection
from django.http import HttpRequest
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from projects.tests.factories import ProjectFactory
from rq.job import Job
from tasks.models import Annotation, AnnotationDraft, Prediction, Task
from tasks.tests.factories import AnnotationDraftFactory, AnnotationFactory, PredictionFactory, TaskFactory
from users.tests.factories import UserFactory


class TestDeleteTasksAnnotations(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.user_1 = cls.project.created_by
        cls.user_2 = UserFactory(active_organization=cls.project.organization)

        cls.task_1 = TaskFactory(project=cls.project)
        cls.task_2 = TaskFactory(project=cls.project)

    def test_form(self):
        AnnotationFactory(task=self.task_1, completed_by=self.user_1)
        AnnotationDraftFactory(task=self.task_1, user=self.user_2)

        form = delete_tasks_annotations_form(self.user_1, self.project)
        option_ids = [option['value'] for option in form[0]['fields'][0]['options']]
        assert str(self.user_1.id) in option_ids
        assert str(self.user_2.id) in option_ids

    def test_no_annotations(self):
        result = delete_tasks_annotations_job(
            self.project.id, list(Task.objects.values_list('id', flat=True)), None, self.user_1.id
        )
        assert result['processed_items'] == 0

    def test_no_annotator(self):
        AnnotationFactory(task=self.task_1, completed_by=self.user_1)
        AnnotationDraftFactory(task=self.task_1, user=self.user_2)
        AnnotationFactory(task=self.task_2, completed_by=self.user_1)
        AnnotationFactory(task=self.task_2, completed_by=self.user_2)

        result = delete_tasks_annotations_job(
            self.project.id, list(Task.objects.values_list('id', flat=True)), None, self.user_1.id
        )

        assert result['processed_items'] == 3  # 3 annotations
        assert Annotation.objects.count() == 0
        assert AnnotationDraft.objects.count() == 0

    def test_with_annotator(self):
        AnnotationFactory(task=self.task_1, completed_by=self.user_1)
        AnnotationDraftFactory(task=self.task_1, user=self.user_2)
        AnnotationFactory(task=self.task_2, completed_by=self.user_1)
        AnnotationFactory(task=self.task_2, completed_by=self.user_2)

        result = delete_tasks_annotations_job(
            self.project.id, list(Task.objects.values_list('id', flat=True)), self.user_2.id, self.user_1.id
        )

        assert result['processed_items'] == 1  # 1 annotations
        assert Annotation.objects.count() == 2
        assert AnnotationDraft.objects.count() == 0
        assert not Annotation.objects.filter(task=self.task_2, completed_by=self.user_2).exists()
        assert not AnnotationDraft.objects.filter(task=self.task_2, user=self.user_2).exists()

    def test_with_annotator_and_task(self):
        AnnotationFactory(task=self.task_1, completed_by=self.user_1)
        AnnotationDraftFactory(task=self.task_1, user=self.user_2)
        AnnotationFactory(task=self.task_2, completed_by=self.user_1)
        AnnotationFactory(task=self.task_2, completed_by=self.user_2)

        result = delete_tasks_annotations_job(self.project.id, [self.task_1.id], self.user_1.id, self.user_1.id)

        assert result['processed_items'] == 1  # 1 annotations
        assert Annotation.objects.count() == 2
        assert AnnotationDraft.objects.count() == 1
        assert not Annotation.objects.filter(task=self.task_1, completed_by=self.user_1).exists()

    @patch('data_manager.actions.basic.start_job_async_or_sync')
    def test_schedules_job_with_ids(self, mock_start_job_async_or_sync):
        AnnotationFactory(task=self.task_1, completed_by=self.user_1)

        request = HttpRequest()
        request.user = self.user_1
        request.data = {'annotator': str(self.user_1.id)}
        result = delete_tasks_annotations(self.project, Task.objects.filter(id=self.task_1.id), request=request)

        assert result == mock_start_job_async_or_sync.return_value
        mock_start_job_async_or_sync.assert_called_once_with(
            delete_tasks_annotations_job,
            self.project.id,
            [self.task_1.id],
            str(self.user_1.id),
            self.user_1.id,
            queue_name='low',
            job_timeout=60 * 60 * 5,
            job_tenant=self.project.organization_id,
        )

    @patch('projects.mixins.start_job_async_or_sync')
    def test_counters_reset_even_if_async_counter_job_is_lost(self, mock_start_job_async_or_sync):
        """Regression (Emerald / TRIAG-2440 over-count).

        The counter reset must run inline in the delete job, not as a separate fire-and-forget
        job that can be dropped. We simulate the separate job being lost by mocking
        start_job_async_or_sync to a no-op; total_annotations must still return to 0 because the
        delete path now recomputes synchronously (run_sync=True).
        """
        AnnotationFactory(task=self.task_1, completed_by=self.user_1)
        AnnotationFactory(task=self.task_2, completed_by=self.user_1)
        self.task_1.refresh_from_db()
        self.task_2.refresh_from_db()
        assert self.task_1.total_annotations == 1
        assert self.task_2.total_annotations == 1

        delete_tasks_annotations_job(self.project.id, [self.task_1.id, self.task_2.id], None, self.user_1.id)

        # If the counter reset had been dispatched as a separate job, the mock would have
        # swallowed it and the counters would remain stale at 1.
        mock_start_job_async_or_sync.assert_not_called()
        self.task_1.refresh_from_db()
        self.task_2.refresh_from_db()
        assert Annotation.objects.count() == 0
        assert self.task_1.total_annotations == 0
        assert self.task_2.total_annotations == 0

    @patch('data_manager.actions.basic.start_job_async_or_sync')
    def test_async_delete_opts_out_of_immediate_reload(self, mock_start_job_async_or_sync):
        """FIT-1855: when the deletion runs as a background job, the action must return
        reload=False so the Data Manager does NOT auto-reload immediately (which would show
        the not-yet-deleted annotations and look like the delete failed). Mirrors the async
        Bulk Review action, which highlights the Refresh button instead."""
        AnnotationFactory(task=self.task_1, completed_by=self.user_1)
        # Simulate the deletion being enqueued as a background job (async path).
        mock_start_job_async_or_sync.return_value = Job.__new__(Job)

        request = HttpRequest()
        request.user = self.user_1
        request.data = {}
        result = delete_tasks_annotations(self.project, Task.objects.filter(id=self.task_1.id), request=request)

        assert result['async'] is True
        assert result['reload'] is False, result

    @patch('data_manager.actions.basic.start_job_async_or_sync')
    def test_schedules_job_when_selection_only_has_drafts(self, mock_start_job_async_or_sync):
        AnnotationDraftFactory(task=self.task_1, user=self.user_1)

        request = HttpRequest()
        request.user = self.user_1
        request.data = {'annotator': str(self.user_1.id)}
        result = delete_tasks_annotations(self.project, Task.objects.filter(id=self.task_1.id), request=request)

        assert result == mock_start_job_async_or_sync.return_value
        mock_start_job_async_or_sync.assert_called_once()


class TestDeleteTasks(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.task_1 = TaskFactory(project=cls.project)
        cls.task_2 = TaskFactory(project=cls.project)
        cls.task_3 = TaskFactory(project=cls.project)

    @patch('data_manager.actions.basic.start_job_async_or_sync')
    def test_partial_delete_returns_reload_false_without_async(self, mock_start_job_async_or_sync):
        """UTC-1043: a partial delete must not pair `reload: False` with `async: True`.

        The frontend (AppStore.js invokeAction) only skips its automatic Data Manager reload when
        both are set together, matching the genuinely async Bulk Review action. delete_tasks
        returns reload: False here for an unrelated reason (whether project tabs were reset), so it
        must fall through to the normal synchronous reload path.
        """
        queryset = Task.objects.filter(id=self.task_1.id)

        result = delete_tasks(self.project, queryset)

        assert result['reload'] is False
        assert 'async' not in result

    def test_full_delete_returns_reload_true(self):
        queryset = Task.objects.filter(project=self.project)

        result = delete_tasks(self.project, queryset)

        assert result['reload'] is True


class TestDeleteTasksPredictions(TestCase):
    """FIT-3400: the Delete predictions action must recompute the counters of the tasks it touched.

    Each selected task has two predictions on purpose: the per-instance ``pre_delete`` signal computes
    ``count - 1`` against rows that are still present, so it leaves ``total_predictions`` at 1. Only the
    counters job brings it back to 0, and it must target the tasks whose predictions were deleted.
    """

    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.task_1 = TaskFactory(project=cls.project)
        cls.task_2 = TaskFactory(project=cls.project)
        cls.untouched_task = TaskFactory(project=cls.project)
        for task in (cls.task_1, cls.task_2):
            PredictionFactory.create_batch(2, task=task)
        PredictionFactory(task=cls.untouched_task)

    def selected(self):
        return Task.objects.filter(id__in=[self.task_1.id, self.task_2.id])

    def assert_counters_recomputed(self):
        for task in (self.task_1, self.task_2):
            task.refresh_from_db()
            assert task.total_predictions == 0, (task.id, task.total_predictions)
        self.untouched_task.refresh_from_db()
        assert self.untouched_task.total_predictions == 1
        assert Prediction.objects.filter(task=self.untouched_task).count() == 1

    @patch('core.redis.redis_connected', return_value=False)
    def test_sync_path_recomputes_counters(self, _mock_redis_connected):
        result = delete_tasks_predictions(self.project, self.selected())

        assert result['processed_items'] == 4
        assert not Prediction.objects.filter(task__in=[self.task_1, self.task_2]).exists()
        self.assert_counters_recomputed()

    @patch('data_manager.actions.basic.start_job_async_or_sync')
    def test_async_path_recomputes_counters(self, mock_start_job_async_or_sync):
        """RQ pickles the job arguments at enqueue and the worker runs the job later, after the delete."""
        enqueued = []

        def enqueue(job, *args, **kwargs):
            kwargs.pop('job_tenant', None)
            enqueued.append((job, pickle.loads(pickle.dumps(args)), kwargs))

        mock_start_job_async_or_sync.side_effect = enqueue

        delete_tasks_predictions(self.project, self.selected())

        assert len(enqueued) == 1
        job, args, kwargs = enqueued[0]
        assert job is update_tasks_counters_by_ids
        job(*args, **kwargs)
        self.assert_counters_recomputed()

    @patch('data_manager.actions.basic.start_job_async_or_sync')
    def test_job_gets_task_ids_materialized_with_one_query(self, mock_start_job_async_or_sync):
        """The ids are read once, before the delete, and the job payload is those ids.

        Not a Prediction subquery (empty by the time it runs), and not a Task queryset: RQ pickles job
        arguments, and pickling a queryset evaluates it, which would put full Task rows in the payload.
        """
        with CaptureQueriesContext(connection) as ctx:
            delete_tasks_predictions(self.project, self.selected())

        materializations = [
            q['sql'] for q in ctx.captured_queries if 'DISTINCT' in q['sql'] and '"prediction"' in q['sql']
        ]
        assert len(materializations) == 1, materializations

        (job, task_ids), kwargs = mock_start_job_async_or_sync.call_args
        assert job is update_tasks_counters_by_ids
        assert kwargs == {'job_tenant': self.project.organization_id}
        assert isinstance(task_ids, list)
        assert sorted(task_ids) == sorted([self.task_1.id, self.task_2.id])
