from unittest.mock import patch

import pytest
from fsm.state_choices import ProjectStateChoices, TaskStateChoices
from fsm.state_manager import get_state_manager
from fsm.state_models import AnnotationState, ProjectState, TaskState
from projects.tests.factories import ProjectFactory
from rest_framework.test import APITestCase
from tasks.tests.factories import AnnotationFactory, TaskFactory

pytestmark = pytest.mark.django_db


class FSMEntityTransitionAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.user = cls.project.created_by
        cls.task = TaskFactory(project=cls.project)
        cls.annotation = AnnotationFactory(task=cls.task, completed_by=cls.user)
        # Clean any pre-existing FSM state to have a known baseline
        ProjectState.objects.all().delete()
        TaskState.objects.all().delete()
        AnnotationState.objects.all().delete()

    def setUp(self):
        self.client.force_authenticate(user=self.user)
        self.StateManager = get_state_manager()

    @patch('fsm.state_manager.flag_set', return_value=True)
    def test_success_task_manual_transition(self, _mock_flag):
        response = self.client.post(
            f'/api/fsm/entities/task/{self.task.id}/transition/',
            data={'transition_name': 'task_completed', 'transition_data': {'reason': 'test complete'}},
            format='json',
        )
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['new_state'] == TaskStateChoices.COMPLETED
        assert data['state_record']['triggered_by']['id'] == self.user.id

        # Ensure a state record exists
        current_state = self.StateManager.get_current_state_value(self.task)
        assert current_state == TaskStateChoices.COMPLETED

    @patch('fsm.state_manager.flag_set', return_value=True)
    def test_success_project_manual_transition(self, _mock_flag):
        response = self.client.post(
            f'/api/fsm/entities/project/{self.project.id}/transition/',
            data={'transition_name': 'project_in_progress'},
            format='json',
        )
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['new_state'] == ProjectStateChoices.IN_PROGRESS
        assert data['state_record']['triggered_by']['id'] == self.user.id

    @patch('fsm.state_manager.flag_set', return_value=True)
    def test_request_body_validation_missing_transition_name(self, _mock_flag):
        response = self.client.post(
            f'/api/fsm/entities/task/{self.task.id}/transition/',
            data={},
            format='json',
        )
        assert response.status_code == 400
        body = response.json()
        assert body.get('detail') == 'Validation error'
        assert 'validation_errors' in body
        assert 'transition_name' in body['validation_errors']

    @patch('fsm.state_manager.flag_set', return_value=True)
    def test_returns_detailed_error_messages_on_failed_transition(self, _mock_flag):
        # Use an unknown transition to trigger a detailed validation error response
        response = self.client.post(
            f'/api/fsm/entities/task/{self.task.id}/transition/',
            data={'transition_name': 'does_not_exist', 'transition_data': {}},
            format='json',
        )
        assert response.status_code == 400
        body = response.json()
        assert 'detail' in body

    @patch('fsm.state_manager.flag_set', return_value=True)
    def test_cannot_trigger_auto_triggered_transitions_manually(self, _mock_flag):
        # 'annotation_submitted' is auto-triggered on create
        response = self.client.post(
            f'/api/fsm/entities/annotation/{self.annotation.id}/transition/',
            data={'transition_name': 'annotation_submitted'},
            format='json',
        )
        assert response.status_code == 400
        body = response.json()
        assert body.get('detail') == 'Validation error'
        assert 'validation_errors' in body
        assert 'transition_name' in body['validation_errors']

    @patch('fsm.state_manager.flag_set', return_value=True)
    def test_audit_trail_captures_triggered_by(self, _mock_flag):
        response = self.client.post(
            f'/api/fsm/entities/project/{self.project.id}/transition/',
            data={'transition_name': 'project_in_progress'},
            format='json',
        )
        assert response.status_code == 200
        body = response.json()
        assert body['state_record']['triggered_by']['id'] == self.user.id

    @patch('fsm.state_manager.flag_set', return_value=True)
    def test_unknown_transition_returns_400(self, _mock_flag):
        response = self.client.post(
            f'/api/fsm/entities/task/{self.task.id}/transition/',
            data={'transition_name': 'does_not_exist', 'transition_data': {}},
            format='json',
        )
        assert response.status_code == 400
        body = response.json()
        assert 'detail' in body


class LsoFSMEntityTransitionAPITests(FSMEntityTransitionAPITests, APITestCase):
    """Tests for LSO only that should not be inherited in LSE"""

    @patch('fsm.state_manager.flag_set', return_value=False)
    def test_feature_flag_respected_no_state_record_created(self, _mock_flag):
        """LSE State manager infers missing states, LSO does not"""
        # Execute a manual transition with FSM disabled
        response = self.client.post(
            f'/api/fsm/entities/task/{self.task.id}/transition/',
            data={'transition_name': 'task_completed'},
            format='json',
        )
        # Endpoint should still respond; state should not be created
        assert response.status_code == 200
        current_state = self.StateManager.get_current_state_value(self.task)
        assert current_state is None
