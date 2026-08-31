from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.utils.http import urlencode
from projects.api import ProjectListAPI
from projects.models import ProjectManager, ProjectQuerySetWithFSM
from projects.tests.factories import ProjectFactory
from rest_framework.test import APIClient, APIRequestFactory, APITestCase, force_authenticate
from tasks.models import Task
from tasks.tests.factories import PredictionFactory, TaskFactory


class TestProjectListAPI(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.matching_project = ProjectFactory(title='Needle Project')
        cls.user = cls.matching_project.created_by
        cls.other_project = ProjectFactory(
            title='Unrelated Project',
            organization=cls.matching_project.organization,
            created_by=cls.user,
        )

    def setUp(self):
        self.client.force_authenticate(user=self.user)

    def get_view_queryset(self, **params):
        request = APIRequestFactory().get(reverse('projects:api:project-list'), params)
        force_authenticate(request, user=self.user)
        view = ProjectListAPI()
        view.request = view.initialize_request(request)
        view.args = ()
        view.kwargs = {}
        return view.get_queryset()

    def test_search_filters_projects_by_title(self):
        """The project list search parameter returns only projects whose title matches."""
        response = self.client.get(reverse('projects:api:project-list'), {'search': 'needle'})

        assert response.status_code == 200
        assert [project['id'] for project in response.json()['results']] == [self.matching_project.id]

    def test_fields_returns_sparse_project_shape(self):
        """The project list fields parameter limits each serialized project to the requested fields."""
        response = self.client.get(reverse('projects:api:project-list'), {'fields': 'id,title'})

        assert response.status_code == 200
        assert response.json()['results']
        assert all(set(project) == {'id', 'title'} for project in response.json()['results'])

    def test_fields_with_whitespace_matches_enrichment_skips(self):
        """Whitespace around fields tokens must not desync serializer flex-fields vs enrichment gating."""
        with (
            patch('projects.api.flag_set', return_value=True),
            patch(
                'projects.api.ProjectManager.with_counts_annotate',
                wraps=ProjectManager.with_counts_annotate,
            ) as with_counts,
            patch.object(
                ProjectQuerySetWithFSM,
                'with_state',
                autospec=True,
                side_effect=ProjectQuerySetWithFSM.with_state,
            ) as with_state,
        ):
            queryset = self.get_view_queryset(fields='id, title')
            response = self.client.get(reverse('projects:api:project-list'), {'fields': 'id, title'})

        with_counts.assert_not_called()
        with_state.assert_not_called()
        assert queryset._prefetch_related_lookups == ()
        assert response.status_code == 200
        assert response.json()['results']
        assert all(set(project) == {'id', 'title'} for project in response.json()['results'])

    def test_sparse_fields_skip_counts_state_and_related_prefetches(self):
        """The picker shape avoids unrelated list enrichment work."""
        with (
            patch('projects.api.flag_set', return_value=True),
            patch(
                'projects.api.ProjectManager.with_counts_annotate',
                wraps=ProjectManager.with_counts_annotate,
            ) as with_counts,
            patch.object(
                ProjectQuerySetWithFSM,
                'with_state',
                autospec=True,
                side_effect=ProjectQuerySetWithFSM.with_state,
            ) as with_state,
        ):
            queryset = self.get_view_queryset(fields='id,title', search='needle')

        with_counts.assert_not_called()
        with_state.assert_not_called()
        assert queryset._prefetch_related_lookups == ()

    def test_default_fields_preserve_project_list_enrichment(self):
        """The normal project list keeps its existing counts, state, and related prefetches."""
        with (
            patch('projects.api.flag_set', return_value=True),
            patch(
                'projects.api.ProjectManager.with_counts_annotate',
                wraps=ProjectManager.with_counts_annotate,
            ) as with_counts,
            patch.object(
                ProjectQuerySetWithFSM,
                'with_state',
                autospec=True,
                side_effect=ProjectQuerySetWithFSM.with_state,
            ) as with_state,
        ):
            queryset = self.get_view_queryset()

        with_counts.assert_called_once()
        with_state.assert_called_once()
        assert queryset._prefetch_related_lookups == ('members', 'created_by')


class TestProjectCountsListAPI(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project_1 = ProjectFactory()
        cls.project_2 = ProjectFactory(organization=cls.project_1.organization)
        Task.objects.create(project=cls.project_1, data={'text': 'Task 1'})
        Task.objects.create(project=cls.project_1, data={'text': 'Task 2'})
        Task.objects.create(project=cls.project_2, data={'text': 'Task 3'})

    def get_url(self, **params):
        return f'{reverse("projects:api:project-counts-list")}?{urlencode(params)}'

    def test_get_counts(self):
        client = APIClient()
        client.force_authenticate(user=self.project_1.created_by)
        response = client.get(self.get_url(include='id,task_number,finished_task_number,total_predictions_number'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 2)
        expected = [
            {
                'id': self.project_1.id,
                'task_number': 2,
                'finished_task_number': 0,
                'total_predictions_number': 0,
            },
            {
                'id': self.project_2.id,
                'task_number': 1,
                'finished_task_number': 0,
                'total_predictions_number': 0,
            },
        ]
        actual = sorted(response.json()['results'], key=lambda d: d['id'])
        self.assertEqual(actual, expected)


class TestProjectModelVersionsAPI(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.user = cls.project.created_by

        cls.task = TaskFactory(project=cls.project)
        cls.prediction_m1 = PredictionFactory(task=cls.task, model_version='model_1')
        cls.prediction_m1_2 = PredictionFactory(task=cls.task, model_version='model_1')
        cls.prediction_m2 = PredictionFactory(task=cls.task, model_version='model_2')
        cls.prediction_m3 = PredictionFactory(task=cls.task, model_version='model_3')

        # To test ordering by last used
        cls.prediction_m2.created_at = timezone.now()
        cls.prediction_m2.save()

    def test_no_params(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/projects/{self.project.id}/model-versions')
        assert response.status_code == 200
        assert response.json() == {
            'model_2': 1,
            'model_3': 1,
            'model_1': 2,
        }

    def test_limit(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/projects/{self.project.id}/model-versions?limit=2')
        assert response.status_code == 200
        assert response.json() == {
            'model_2': 1,
            'model_3': 1,
        }

    def test_extended(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/projects/{self.project.id}/model-versions?extended=true')
        assert response.status_code == 200
        assert response.json()['live'] is None
        assert response.json()['static'][0]['model_version'] == 'model_2'
        assert response.json()['static'][0]['count'] == 1
        assert response.json()['static'][1]['model_version'] == 'model_3'
        assert response.json()['static'][1]['count'] == 1
        assert response.json()['static'][2]['model_version'] == 'model_1'
        assert response.json()['static'][2]['count'] == 2


class TestDeletePredictionsAPI(APITestCase):
    """Covers the DELETE /api/projects/<pk>/model-versions endpoint.

    Regression coverage for issue #9717: predictions imported without a
    model_version (stored as NULL, empty string, or the legacy 'undefined'
    placeholder) must be deletable.
    """

    def setUp(self):
        self.project = ProjectFactory()
        self.user = self.project.created_by
        self.task = TaskFactory(project=self.project)
        self.client.force_authenticate(user=self.user)
        self.url = f'/api/projects/{self.project.id}/model-versions'

    def _prediction_count(self, **filters):
        return self.task.predictions.filter(**filters).count()

    def test_delete_by_specific_version(self):
        PredictionFactory(task=self.task, model_version='v1')
        PredictionFactory(task=self.task, model_version='v1')
        PredictionFactory(task=self.task, model_version='v2')

        response = self.client.delete(self.url, data={'model_version': 'v1'}, format='json')

        assert response.status_code == 200
        assert self._prediction_count(model_version='v1') == 0
        assert self._prediction_count(model_version='v2') == 1

    def test_delete_null_version_via_json_null(self):
        PredictionFactory(task=self.task, model_version=None)
        PredictionFactory(task=self.task, model_version='v1')

        response = self.client.delete(self.url, data={'model_version': None}, format='json')

        assert response.status_code == 200
        assert self._prediction_count(model_version__isnull=True) == 0
        assert self._prediction_count(model_version='v1') == 1

    def test_delete_null_version_via_empty_string(self):
        PredictionFactory(task=self.task, model_version='')
        PredictionFactory(task=self.task, model_version='v1')

        response = self.client.delete(self.url, data={'model_version': ''}, format='json')

        assert response.status_code == 200
        assert self._prediction_count(model_version='') == 0
        assert self._prediction_count(model_version='v1') == 1

    def test_delete_legacy_undefined_string(self):
        """Pre-migration rows have model_version='undefined'. Migration 0062
        backfills these to NULL, but the API still accepts the legacy string
        so it works during a rolling deployment.
        """
        PredictionFactory(task=self.task, model_version='undefined')
        PredictionFactory(task=self.task, model_version='v1')

        response = self.client.delete(self.url, data={'model_version': 'undefined'}, format='json')

        assert response.status_code == 200
        assert self._prediction_count(model_version='undefined') == 0
        assert self._prediction_count(model_version='v1') == 1

    def test_delete_null_version_groups_legacy_representations(self):
        """A single null-version delete request should sweep NULL, empty, and
        the legacy 'undefined' placeholder together so callers don't need to
        know about the pre-migration data layout.
        """
        PredictionFactory(task=self.task, model_version=None)
        PredictionFactory(task=self.task, model_version='')
        PredictionFactory(task=self.task, model_version='undefined')
        PredictionFactory(task=self.task, model_version='v1')

        response = self.client.delete(self.url, data={'model_version': None}, format='json')

        assert response.status_code == 200
        assert self.task.predictions.exclude(model_version='v1').count() == 0
        assert self._prediction_count(model_version='v1') == 1

    def test_delete_requires_model_version_key(self):
        PredictionFactory(task=self.task, model_version='v1')

        response = self.client.delete(self.url, data={}, format='json')

        assert response.status_code == 400
        assert self._prediction_count(model_version='v1') == 1
