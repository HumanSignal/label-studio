from unittest.mock import patch

from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from rest_framework.test import APITestCase
from tasks.tests.factories import TaskFactory


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
        - Verifying that Task.resolve_uri method is called (default behavior)

        Critical validation: By default, URLs should be resolved for security,
        preventing direct exposure of storage credentials.
        """
        task = TaskFactory(project=self.project, data={'image': 's3://bucket/image.jpg'})
        self.client.force_authenticate(user=self.user)

        # Patch resolve_uri to track if it's called
        with patch.object(task.__class__, 'resolve_uri', return_value={'image': '/resolved/url'}) as mock_resolve:
            response = self.client.get(f'/api/tasks/{task.id}/')

        assert response.status_code == 200
        # resolve_uri should be called by default
        mock_resolve.assert_called_once()

    def test_get_task_resolve_uri_explicit_true(self):
        """Test that resolve_uri=true explicitly enables URL resolution.

        This test validates:
        - Creating a task with a storage-like URL in data
        - Fetching the task with resolve_uri=true
        - Verifying that Task.resolve_uri method is called

        Critical validation: Explicit resolve_uri=true should resolve URLs.
        """
        task = TaskFactory(project=self.project, data={'image': 's3://bucket/image.jpg'})
        self.client.force_authenticate(user=self.user)

        with patch.object(task.__class__, 'resolve_uri', return_value={'image': '/resolved/url'}) as mock_resolve:
            response = self.client.get(f'/api/tasks/{task.id}/?resolve_uri=true')

        assert response.status_code == 200
        mock_resolve.assert_called_once()

    def test_get_task_resolve_uri_false_preserves_original_urls(self):
        """Test that resolve_uri=false preserves original storage URLs.

        This test validates:
        - Creating a task with a storage-like URL in data
        - Fetching the task with resolve_uri=false
        - Verifying that Task.resolve_uri method is NOT called
        - Original URL is preserved in the response

        Critical validation: When resolve_uri=false, users should see original
        storage URLs (e.g., s3://bucket/file.jpg) for debugging purposes.
        """
        original_url = 's3://my-bucket/path/to/image.jpg'
        task = TaskFactory(project=self.project, data={'image': original_url, 'text': 'test'})
        self.client.force_authenticate(user=self.user)

        with patch.object(task.__class__, 'resolve_uri') as mock_resolve:
            response = self.client.get(f'/api/tasks/{task.id}/?resolve_uri=false')

        assert response.status_code == 200
        # resolve_uri should NOT be called when resolve_uri=false
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
