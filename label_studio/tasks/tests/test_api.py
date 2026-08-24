from unittest.mock import patch

from organizations.tests.factories import OrganizationFactory
from projects.models import Project
from projects.tests.factories import ProjectFactory
from rest_framework.test import APITestCase
from tasks.models import Task
from tasks.tests.factories import AnnotationFactory, PredictionFactory, TaskFactory
from users.tests.factories import UserFactory


class TestTaskAPI(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        cls.project = ProjectFactory(organization=cls.organization)
        cls.user = cls.organization.created_by

    def test_get_task(self):
        task = TaskFactory(project=self.project, data={'text': 'test'})

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/')
        assert response.status_code == 200

        assert response.json() == {
            'id': task.id,
            'project': self.project.id,
            'created_at': task.created_at.isoformat().replace('+00:00', 'Z'),
            'updated_at': task.updated_at.isoformat().replace('+00:00', 'Z'),
            'annotations': [],
            'predictions': [],
            'drafts': [],
            'data': {'text': 'test'},
            'meta': {},
            'updated_by': [],
            'is_labeled': False,
            'overlap': 1,
            'file_upload': None,
            'annotations_ids': '',
            'annotations_results': '',
            'annotators': [],
            'completed_at': None,
            'predictions_model_versions': '',
            'draft_exists': False,
            'predictions_results': '',
            'predictions_score': None,
            'total_annotations': 0,
            'total_predictions': 0,
            'avg_lead_time': None,
            'cancelled_annotations': 0,
            'inner_id': task.inner_id,
            'storage_filename': None,
            'comment_authors': [],
            'comment_count': 0,
            'last_comment_updated_at': None,
            'unresolved_comment_count': 0,
        }

    def test_patch_task(self):
        task = TaskFactory(project=self.project, data={'text': 'test'})

        payload = {
            'annotations': [],
            'predictions': [],
            'data': {'text': 'changed test'},
            'meta': {},
            'created_at': '',
            'updated_at': '',
            'updated_by': None,
            'is_labeled': False,
            'file_upload': None,
        }

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(f'/api/tasks/{task.id}/', data=payload, format='json')
        assert response.status_code == 200
        task.refresh_from_db()
        assert response.json() == {
            'id': task.id,
            'project': self.project.id,
            'created_at': task.created_at.isoformat().replace('+00:00', 'Z'),
            'updated_at': task.updated_at.isoformat().replace('+00:00', 'Z'),
            'annotations': [],
            'predictions': [],
            'data': {'text': 'changed test'},
            'meta': {},
            'updated_by': None,
            'is_labeled': False,
            'overlap': 1,
            'file_upload': None,
            'total_annotations': 0,
            'total_predictions': 0,
            'cancelled_annotations': 0,
            'inner_id': task.inner_id,
            'comment_authors': [],
            'comment_count': 0,
            'last_comment_updated_at': None,
            'unresolved_comment_count': 0,
        }

    def test_create_task_without_project_id_fails(self):
        """Test that creating a task without project ID fails with appropriate error message"""
        payload = {
            'data': {'text': 'test task'},
            'meta': {},
        }

        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/tasks/', data=payload, format='json')

        assert response.status_code == 400
        response_data = response.json()
        assert response_data['validation_errors']['project'] == ['This field is required.']

    def test_create_task_with_project_id_succeeds(self):
        """Test that creating a task with valid project ID succeeds"""
        payload = {
            'project': self.project.id,
            'data': {'text': 'test task'},
            'meta': {},
        }

        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/tasks/', data=payload, format='json')

        assert response.status_code == 201
        response_data = response.json()
        assert response_data['project'] == self.project.id
        assert response_data['data'] == {'text': 'test task'}


class TestTaskAPIResolveUri(APITestCase):
    """Tests for resolve_uri query parameter in task detail endpoint.

    The resolve_uri parameter controls whether storage URLs (e.g., s3://bucket/file.jpg)
    are converted to proxy URLs. This is useful for debugging and viewing original
    source paths in task preview.
    """

    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        cls.project = ProjectFactory(organization=cls.organization)
        cls.user = cls.organization.created_by

    def test_get_task_resolve_uri_default_true(self):
        """Test that resolve_uri defaults to True when not specified.

        This test validates:
        - Creating a task with a storage-like URL in data
        - Fetching the task without resolve_uri parameter
        - Verifying that Task.resolve_uris method is called (default behavior)

        Critical validation: By default, URLs should be resolved for security,
        preventing direct exposure of storage credentials.
        """
        task = TaskFactory(project=self.project, data={'image': 's3://bucket/image.jpg'})
        self.client.force_authenticate(user=self.user)

        with patch.object(task.__class__, 'resolve_uris', return_value={'image': '/resolved/url'}) as mock_resolve:
            response = self.client.get(f'/api/tasks/{task.id}/')

        assert response.status_code == 200
        # resolve_uris should be called by default
        mock_resolve.assert_called_once()

    def test_get_task_resolve_uri_explicit_true(self):
        """Test that resolve_uri=true explicitly enables URL resolution.

        This test validates:
        - Creating a task with a storage-like URL in data
        - Fetching the task with resolve_uri=true
        - Verifying that Task.resolve_uris method is called

        Critical validation: Explicit resolve_uri=true should resolve URLs.
        """
        task = TaskFactory(project=self.project, data={'image': 's3://bucket/image.jpg'})
        self.client.force_authenticate(user=self.user)

        with patch.object(task.__class__, 'resolve_uris', return_value={'image': '/resolved/url'}) as mock_resolve:
            response = self.client.get(f'/api/tasks/{task.id}/?resolve_uri=true')

        assert response.status_code == 200
        mock_resolve.assert_called_once()

    def test_get_task_resolve_uri_false_preserves_original_urls(self):
        """Test that resolve_uri=false preserves original storage URLs.

        This test validates:
        - Creating a task with a storage-like URL in data
        - Fetching the task with resolve_uri=false
        - Verifying that Task.resolve_uris method is NOT called
        - Original URL is preserved in the response

        Critical validation: When resolve_uri=false, users should see original
        storage URLs (e.g., s3://bucket/file.jpg) for debugging purposes.
        """
        original_url = 's3://my-bucket/path/to/image.jpg'
        task = TaskFactory(project=self.project, data={'image': original_url, 'text': 'test'})
        self.client.force_authenticate(user=self.user)

        with patch.object(task.__class__, 'resolve_uris') as mock_resolve:
            response = self.client.get(f'/api/tasks/{task.id}/?resolve_uri=false')

        assert response.status_code == 200
        # resolve_uris should NOT be called when resolve_uri=false
        mock_resolve.assert_not_called()
        # Original URL should be preserved
        assert response.json()['data']['image'] == original_url
        assert response.json()['data']['text'] == 'test'

    def test_get_task_resolve_uri_false_with_multiple_url_fields(self):
        """Test resolve_uri=false with multiple URL fields in task data.

        This test validates:
        - Creating a task with multiple storage URLs
        - Fetching with resolve_uri=false
        - All original URLs are preserved

        Critical validation: All URL fields should preserve their original values.
        """
        task_data = {
            'image_1': 's3://bucket-1/image1.jpg',
            'image_2': 'gs://bucket-2/image2.png',
            'audio': 'azure-blob://container/audio.mp3',
            'text': 'Plain text field',
        }
        task = TaskFactory(project=self.project, data=task_data)
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/api/tasks/{task.id}/?resolve_uri=false')

        assert response.status_code == 200
        response_data = response.json()['data']
        # All original URLs should be preserved
        assert response_data['image_1'] == 's3://bucket-1/image1.jpg'
        assert response_data['image_2'] == 'gs://bucket-2/image2.png'
        assert response_data['audio'] == 'azure-blob://container/audio.mp3'
        assert response_data['text'] == 'Plain text field'


class TestTaskAgreementAPI(APITestCase):
    """Tests for TaskAgreementAPI (GET /api/tasks/<id>/agreement/)."""

    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        cls.project = ProjectFactory(organization=cls.organization)
        cls.user = cls.organization.created_by

    @patch('tasks.api.flag_set')
    def test_distribution_returns_404_for_nonexistent_task(self, mock_flag_set):
        mock_flag_set.return_value = True
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/tasks/99999/agreement/')
        assert response.status_code == 404
        assert response.json() == {'error': 'Task not found'}

    @patch('tasks.api.flag_set')
    @patch.object(Project, 'has_permission')
    def test_distribution_permission_denied_for_other_project(self, mock_has_permission, mock_flag_set):
        mock_flag_set.return_value = True
        other_org = OrganizationFactory()
        other_project = ProjectFactory(organization=other_org)
        task = TaskFactory(project=other_project)

        def has_perm(*args):
            if len(args) == 2:
                project, _ = args
                return project.id != other_project.id
            return False

        mock_has_permission.side_effect = has_perm
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/agreement/')
        assert response.status_code == 403

    @patch('tasks.api.flag_set')
    def test_distribution_empty_task_returns_zero_annotations(self, mock_flag_set):
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/agreement/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 0
        assert data['distributions'] == {}

    @patch('tasks.api.flag_set')
    def test_distribution_includes_predictions_in_label_counts(self, mock_flag_set):
        """Predictions are merged into distributions so aggregate matches client-side (develop / FF off)."""
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Car', 'Car']},
                }
            ],
        )
        PredictionFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Car']},
                }
            ],
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/agreement/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 1
        assert data['distributions']['label']['labels'] == {'Car': 3}


class TestTaskSummaryAPI(APITestCase):
    """Tests for TaskSummaryAPI (GET /api/tasks/<id>/summary/)."""

    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        cls.project = ProjectFactory(organization=cls.organization)
        cls.user = cls.organization.created_by

    @patch('tasks.api.flag_set')
    def test_distribution_returns_404_for_nonexistent_task(self, mock_flag_set):
        mock_flag_set.return_value = True
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/tasks/99999/summary/')
        assert response.status_code == 404
        assert response.json() == {'error': 'Task not found'}

    @patch('tasks.api.flag_set')
    @patch.object(Project, 'has_permission')
    def test_distribution_permission_denied_for_other_project(self, mock_has_permission, mock_flag_set):
        mock_flag_set.return_value = True
        other_org = OrganizationFactory()
        other_project = ProjectFactory(organization=other_org)
        task = TaskFactory(project=other_project)

        # In OSS Project.has_permission is a stub that always returns True; patch so other_project denies access.
        # Class-level patch: the mock is invoked with (user) only, not (self, user).
        def has_perm(*args):
            if len(args) == 2:
                project, _ = args
                return project.id != other_project.id
            # Class-level method patch: mock is called as (user,) only.
            return False

        mock_has_permission.side_effect = has_perm
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 403

    @patch('tasks.api.flag_set')
    def test_distribution_empty_task_returns_zero_annotations(self, mock_flag_set):
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 0
        assert data['total_predictions'] == 0
        assert data['distributions'] == {}
        assert data['annotations'] == []
        assert data['task']['id'] == task.id

    @patch('tasks.api.flag_set')
    def test_distribution_with_rectanglelabels(self, mock_flag_set):
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Car', 'Car']},
                }
            ],
        )
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Person']},
                }
            ],
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 2
        assert data['distributions']['label'] == {
            'type': 'rectanglelabels',
            'labels': {'Car': 2, 'Person': 1},
        }

    @patch('tasks.api.flag_set')
    def test_distribution_with_choices(self, mock_flag_set):
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['Positive']},
                }
            ],
        )
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['Negative']},
                }
            ],
        )
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['Positive']},
                }
            ],
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 3
        assert data['distributions']['sentiment'] == {
            'type': 'choices',
            'labels': {'Positive': 2, 'Negative': 1},
        }

    @patch('tasks.api.flag_set')
    def test_distribution_with_rating(self, mock_flag_set):
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'rating',
                    'to_name': 'text',
                    'type': 'rating',
                    'value': {'rating': 4},
                }
            ],
        )
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'rating',
                    'to_name': 'text',
                    'type': 'rating',
                    'value': {'rating': 5},
                }
            ],
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 2
        assert data['distributions']['rating']['type'] == 'rating'
        assert data['distributions']['rating']['average'] == 4.5
        assert data['distributions']['rating']['count'] == 2
        assert 'values' not in data['distributions']['rating']

    @patch('tasks.api.flag_set')
    def test_distribution_with_number(self, mock_flag_set):
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'count',
                    'to_name': 'text',
                    'type': 'number',
                    'value': {'number': 10},
                }
            ],
        )
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'count',
                    'to_name': 'text',
                    'type': 'number',
                    'value': {'number': 20},
                }
            ],
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 2
        assert data['distributions']['count']['type'] == 'number'
        assert data['distributions']['count']['average'] == 15.0
        assert data['distributions']['count']['count'] == 2

    @patch('tasks.api.flag_set')
    def test_distribution_with_taxonomy(self, mock_flag_set):
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'tax',
                    'to_name': 'text',
                    'type': 'taxonomy',
                    'value': {'taxonomy': [['Animals', 'Dog']]},
                }
            ],
        )
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'tax',
                    'to_name': 'text',
                    'type': 'taxonomy',
                    'value': {'taxonomy': [['Animals', 'Cat']]},
                }
            ],
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 2
        assert data['distributions']['tax'] == {
            'type': 'taxonomy',
            'labels': {'Dog': 1, 'Cat': 1},
        }

    @patch('tasks.api.flag_set')
    def test_distribution_with_pairwise(self, mock_flag_set):
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'pair',
                    'to_name': 'text',
                    'type': 'pairwise',
                    'value': {'selected': 'left'},
                }
            ],
        )
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'pair',
                    'to_name': 'text',
                    'type': 'pairwise',
                    'value': {'selected': 'right'},
                }
            ],
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 2
        assert data['distributions']['pair'] == {
            'type': 'pairwise',
            'labels': {'left': 1, 'right': 1},
        }

    @patch('tasks.api.flag_set')
    def test_distribution_excludes_cancelled_annotations(self, mock_flag_set):
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Car']},
                }
            ],
        )
        AnnotationFactory(
            task=task,
            project=self.project,
            was_cancelled=True,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Person']},
                }
            ],
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 1
        assert data['distributions']['label']['labels'] == {'Car': 1}

    @patch('tasks.api.flag_set')
    def test_distribution_excludes_predictions_from_label_counts(self, mock_flag_set):
        """Predictions are not merged into distributions; only annotations are counted."""
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Car', 'Car']},
                }
            ],
        )
        PredictionFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Car']},
                }
            ],
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 1
        assert data['total_predictions'] == 1
        assert data['distributions']['label']['labels'] == {'Car': 2}

    @patch('tasks.api.flag_set')
    def test_distribution_excludes_ground_truth_annotations(self, mock_flag_set):
        """Ground truth annotations are excluded from distributions to match agreement filter."""
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Car']},
                }
            ],
        )
        AnnotationFactory(
            task=task,
            project=self.project,
            ground_truth=True,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Person']},
                }
            ],
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 2
        assert data['distributions']['label']['labels'] == {'Car': 1}
        assert 'Person' not in data['distributions']['label']['labels']

    @patch('tasks.api.flag_set')
    def test_distribution_excludes_null_result_annotations(self, mock_flag_set):
        """Annotations with null results are excluded from distributions to match agreement filter."""
        mock_flag_set.return_value = True
        task = TaskFactory(project=self.project)
        AnnotationFactory(
            task=task,
            project=self.project,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Car']},
                }
            ],
        )
        AnnotationFactory(
            task=task,
            project=self.project,
            result=None,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{task.id}/summary/')
        assert response.status_code == 200
        data = response.json()
        assert data['total_annotations'] == 2
        assert data['distributions']['label']['labels'] == {'Car': 1}


LABEL_CONFIG = (
    '<View><Text name="text" value="$text"/><Choices name="label" toName="text">'
    '<Choice value="pos"/><Choice value="neg"/></Choices></View>'
)
ANNOTATION_RESULT = [{'value': {'choices': ['pos']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}]


class TestTaskCreateOverlapInitialization(APITestCase):
    """ROOT-62: Task create must seed overlap from Quality settings.

    Full-overlap projects never rearrange on task add, so API create is the only
    assignment path. Import/storage already seed overlap=maximum_annotations.
    """

    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        cls.user = cls.organization.created_by
        cls.label_config = LABEL_CONFIG

    def _post_task(self, project, **extra):
        self.client.force_authenticate(user=self.user)
        payload = {'project': project.id, 'data': {'text': 'mid-project task'}, **extra}
        response = self.client.post('/api/tasks/', data=payload, format='json')
        assert response.status_code == 201, response.content
        return Task.objects.get(id=response.json()['id'])

    def test_full_overlap_project_seeds_overlap_and_stays_unlabeled_after_one_annotation(self):
        """100% overlap / max=3: new task overlap=3; one annotation leaves is_labeled False."""
        project = ProjectFactory(
            organization=self.organization,
            created_by=self.user,
            label_config=self.label_config,
            maximum_annotations=3,
            overlap_cohort_percentage=100,
        )
        task = self._post_task(project)

        assert task.overlap == 3
        assert task.is_labeled is False

        response = self.client.post(
            f'/api/tasks/{task.id}/annotations/',
            {'result': ANNOTATION_RESULT},
            format='json',
        )
        assert response.status_code == 201, response.content
        task.refresh_from_db()
        assert task.overlap == 3
        assert task.is_labeled is False

        for _ in range(2):
            annotator = UserFactory(active_organization=self.organization)
            AnnotationFactory(task=task, project=project, completed_by=annotator, result=ANNOTATION_RESULT)
        task.refresh_from_db()
        task.update_is_labeled()
        assert task.is_labeled is True

    def test_partial_overlap_project_keeps_default_overlap_when_omitted(self):
        """Cohort < 100% is not rearranged on single-task create; omitted overlap stays 1."""
        project = ProjectFactory(
            organization=self.organization,
            created_by=self.user,
            label_config=self.label_config,
            maximum_annotations=3,
            overlap_cohort_percentage=50,
        )
        task = self._post_task(project)
        assert task.overlap == 1
        assert task.is_labeled is False

    def test_explicit_overlap_in_payload_is_preserved(self):
        """Client-supplied overlap is not overwritten by project.maximum_annotations."""
        project = ProjectFactory(
            organization=self.organization,
            created_by=self.user,
            label_config=self.label_config,
            maximum_annotations=3,
            overlap_cohort_percentage=100,
        )
        task = self._post_task(project, overlap=2)
        assert task.overlap == 2

    def test_full_overlap_project_nested_create_seeds_overlap(self):
        """POST /api/projects/{id}/tasks/ also seeds overlap when the field is omitted."""
        project = ProjectFactory(
            organization=self.organization,
            created_by=self.user,
            label_config=self.label_config,
            maximum_annotations=3,
            overlap_cohort_percentage=100,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'/api/projects/{project.id}/tasks/',
            {'data': {'text': 'nested mid-project task'}},
            format='json',
        )
        assert response.status_code == 201, response.content
        task = Task.objects.get(id=response.json()['id'])
        assert task.overlap == 3
        assert task.is_labeled is False


class TestAnnotationDraftCreateWithMissingAnnotation(APITestCase):
    """Regression tests for the annotation-scoped draft-creation endpoint."""

    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        cls.project = ProjectFactory(organization=cls.organization)
        cls.user = cls.organization.created_by

    def test_create_draft_for_missing_annotation_does_not_violate_fk(self):
        # Reproduces: ENTERPRISE-V2-BACKEND-5S0
        # POST /api/tasks/{pk}/annotations/{annotation_id}/drafts blindly passes the URL's
        # annotation_id straight into serializer.save(). When that annotation does not exist
        # (e.g. it was deleted between the client loading the task and submitting the draft),
        # the INSERT into tasks_annotationdraft violates the annotation_id foreign key:
        #   insert or update on table "tasks_annotationdraft" violates foreign key constraint
        #   "tasks_annotationdraf_annotation_id_86db74e5_fk_task_comp"
        #   DETAIL: Key (annotation_id)=(...) is not present in table "task_completion".
        #
        # RED (unpatched): the endpoint persists a draft pointing at the missing annotation.
        # On production Postgres the FK is checked immediately, so the request raises
        # IntegrityError (the Sentry crash). SQLite (used by the test suite) defers FK
        # enforcement, so connection.check_constraints() below surfaces the identical
        # IntegrityError, failing this test with the same violation.
        # GREEN (fixed): the endpoint validates the annotation and rejects the request
        # gracefully (4xx) without persisting a dangling draft, so no violation occurs.
        from django.db import connection
        from tasks.models import AnnotationDraft

        task = TaskFactory(project=self.project, data={'text': 'test'})

        # An annotation that was created and then deleted — its id is now dangling.
        annotation = AnnotationFactory(task=task, project=self.project, result=[])
        missing_annotation_id = annotation.id
        annotation.delete()

        self.client.force_authenticate(user=self.user)

        # On Postgres this call itself raises IntegrityError inside the request.
        response = self.client.post(
            f'/api/tasks/{task.id}/annotations/{missing_annotation_id}/drafts',
            data={'result': []},
            format='json',
        )

        # On SQLite the FK check is deferred; surface the same violation explicitly.
        connection.check_constraints()

        # A fixed endpoint should refuse to create a draft for a non-existent annotation
        # instead of leaving a dangling reference behind.
        assert not AnnotationDraft.objects.filter(annotation_id=missing_annotation_id).exists()
        assert response.status_code in (400, 404), response.status_code
