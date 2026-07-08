from unittest.mock import patch

from data_manager.actions.basic import (
    delete_tasks_annotations,
    delete_tasks_annotations_form,
    delete_tasks_annotations_job,
)
from django.http import HttpRequest
from django.test import TestCase
from projects.tests.factories import ProjectFactory
from tasks.models import Annotation, AnnotationDraft, Task
from tasks.tests.factories import AnnotationDraftFactory, AnnotationFactory, TaskFactory
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
    def test_schedules_job_when_selection_only_has_drafts(self, mock_start_job_async_or_sync):
        AnnotationDraftFactory(task=self.task_1, user=self.user_1)

        request = HttpRequest()
        request.user = self.user_1
        request.data = {'annotator': str(self.user_1.id)}
        result = delete_tasks_annotations(self.project, Task.objects.filter(id=self.task_1.id), request=request)

        assert result == mock_start_job_async_or_sync.return_value
        mock_start_job_async_or_sync.assert_called_once()
