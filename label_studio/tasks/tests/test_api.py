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
