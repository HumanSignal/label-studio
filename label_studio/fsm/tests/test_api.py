from datetime import timedelta
from unittest.mock import patch
from urllib.parse import quote

from fsm.state_choices import AnnotationStateChoices, ProjectStateChoices, TaskStateChoices
from fsm.state_manager import get_state_manager
from fsm.state_models import AnnotationState, ProjectState, TaskState
from fsm.tests.factories import AnnotationStateFactory, ProjectStateFactory, TaskStateFactory
from projects.tests.factories import ProjectFactory
from rest_framework.test import APITestCase
from tasks.tests.factories import AnnotationFactory, TaskFactory


class FSMEntityHistoryAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.user = cls.project.created_by
        ProjectState.objects.all().delete()   # Clean everything just in case

        cls.task = TaskFactory(project=cls.project)
        TaskState.objects.all().delete()   # Clean everything just in case

        cls.annotation = AnnotationFactory(task=cls.task, completed_by=cls.user)
        AnnotationState.objects.all().delete()   # Clean everything just in case

    def test_invalid_entity_name(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/fsm/entities/invalid/1/history')
        assert response.status_code == 404

    def test_project_not_found(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/fsm/entities/project/999999/history')
        assert response.status_code == 404

    def test_empty_project_history(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/fsm/entities/project/{self.project.id}/history')
        assert response.status_code == 200
        assert response.json()['results'] == []

    def test_project_history(self):
        state_1 = ProjectStateFactory(project=self.project, state=ProjectStateChoices.CREATED)
        state_1.created_at = state_1.created_at - timedelta(seconds=10)
        state_1.save()
        state_2 = ProjectStateFactory(
            project=self.project,
            state=ProjectStateChoices.IN_PROGRESS,
            previous_state=ProjectStateChoices.CREATED,
            triggered_by=self.user,
            reason='Project started by user',
        )
        state_3 = ProjectStateFactory(
            project=self.project,
            state=ProjectStateChoices.COMPLETED,
            previous_state=ProjectStateChoices.IN_PROGRESS,
            transition_name='complete_project',
            reason='All tasks completed',
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/fsm/entities/project/{self.project.id}/history')
        assert response.status_code == 200
        results = response.json()['results']
        assert len(results) == 3
        assert results[0]['id'] == str(state_3.id)
        assert results[1]['id'] == str(state_2.id)
        assert results[2]['id'] == str(state_1.id)

        # Test that reason is returned as a top-level field (not nested in context_data)
        assert 'reason' in results[0]
        assert results[0]['reason'] == 'All tasks completed'
        assert results[1]['reason'] == 'Project started by user'

        # Test ordering
        response = self.client.get(f'/api/fsm/entities/project/{self.project.id}/history?ordering=id')
        assert response.status_code == 200
        assert len(response.json()['results']) == 3
        assert response.json()['results'][0]['id'] == str(state_1.id)
        assert response.json()['results'][1]['id'] == str(state_2.id)
        assert response.json()['results'][2]['id'] == str(state_3.id)

        # Test state filtering
        response = self.client.get(
            f'/api/fsm/entities/project/{self.project.id}/history?state={ProjectStateChoices.COMPLETED}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_3.id)

        # Test previous_state filtering
        response = self.client.get(
            f'/api/fsm/entities/project/{self.project.id}/history?previous_state={ProjectStateChoices.IN_PROGRESS}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_3.id)

        # Test transition_name filtering
        response = self.client.get(
            f'/api/fsm/entities/project/{self.project.id}/history?transition_name=complete_project'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_3.id)

        # Test triggered_by filtering
        response = self.client.get(f'/api/fsm/entities/project/{self.project.id}/history?triggered_by={self.user.id}')
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_2.id)
        assert response.json()['results'][0]['triggered_by']['id'] == self.user.id

        # Test date filtering
        created_at_from = (state_2.created_at - timedelta(seconds=1)).isoformat()
        created_at_to = state_3.created_at.isoformat()
        response = self.client.get(
            f'/api/fsm/entities/project/{self.project.id}/history?created_at_from={quote(created_at_from)}&created_at_to={quote(created_at_to)}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 2
        assert response.json()['results'][0]['id'] == str(state_3.id)
        assert response.json()['results'][1]['id'] == str(state_2.id)

    def test_task_not_found(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/fsm/entities/task/999999/history')
        assert response.status_code == 404

    def test_empty_task_history(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/fsm/entities/task/{self.task.id}/history')
        assert response.status_code == 200
        assert response.json()['results'] == []

    def test_task_history(self):
        state_1 = TaskStateFactory(task=self.task, state=TaskStateChoices.CREATED)
        state_1.created_at = state_1.created_at - timedelta(seconds=10)
        state_1.save()
        state_2 = TaskStateFactory(
            task=self.task,
            state=TaskStateChoices.IN_PROGRESS,
            previous_state=TaskStateChoices.CREATED,
            triggered_by=self.user,
        )
        state_3 = TaskStateFactory(
            task=self.task,
            state=TaskStateChoices.COMPLETED,
            previous_state=TaskStateChoices.IN_PROGRESS,
            transition_name='complete_task',
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/fsm/entities/task/{self.task.id}/history')
        assert response.status_code == 200
        assert len(response.json()['results']) == 3
        assert response.json()['results'][0]['id'] == str(state_3.id)
        assert response.json()['results'][1]['id'] == str(state_2.id)
        assert response.json()['results'][2]['id'] == str(state_1.id)

        # Test ordering
        response = self.client.get(f'/api/fsm/entities/task/{self.task.id}/history?ordering=id')
        assert response.status_code == 200
        assert len(response.json()['results']) == 3
        assert response.json()['results'][0]['id'] == str(state_1.id)
        assert response.json()['results'][1]['id'] == str(state_2.id)
        assert response.json()['results'][2]['id'] == str(state_3.id)

        # Test state filtering
        response = self.client.get(f'/api/fsm/entities/task/{self.task.id}/history?state={TaskStateChoices.COMPLETED}')
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_3.id)

        # Test previous_state filtering
        response = self.client.get(
            f'/api/fsm/entities/task/{self.task.id}/history?previous_state={TaskStateChoices.IN_PROGRESS}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_3.id)

        # Test transition_name filtering
        response = self.client.get(f'/api/fsm/entities/task/{self.task.id}/history?transition_name=complete_task')
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_3.id)

        # Test triggered_by filtering
        response = self.client.get(f'/api/fsm/entities/task/{self.task.id}/history?triggered_by={self.user.id}')
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_2.id)
        assert response.json()['results'][0]['triggered_by']['id'] == self.user.id

        # Test date filtering
        created_at_from = (state_2.created_at - timedelta(seconds=1)).isoformat()
        created_at_to = state_3.created_at.isoformat()
        response = self.client.get(
            f'/api/fsm/entities/task/{self.task.id}/history?created_at_from={quote(created_at_from)}&created_at_to={quote(created_at_to)}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 2
        assert response.json()['results'][0]['id'] == str(state_3.id)
        assert response.json()['results'][1]['id'] == str(state_2.id)

    def test_annotation_not_found(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/fsm/entities/annotation/999999/history')
        assert response.status_code == 404

    def test_empty_annotation_history(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/fsm/entities/annotation/{self.annotation.id}/history')
        assert response.status_code == 200
        assert response.json()['results'] == []

    def test_annotation_history(self):
        state_1 = AnnotationStateFactory(annotation=self.annotation, state=AnnotationStateChoices.CREATED)
        state_1.created_at = state_1.created_at - timedelta(seconds=10)
        state_1.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/fsm/entities/annotation/{self.annotation.id}/history')
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_1.id)

        # Test state filtering
        response = self.client.get(
            f'/api/fsm/entities/annotation/{self.annotation.id}/history?state={AnnotationStateChoices.CREATED}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_1.id)

        # No previous_state, triggered_by, or transition_name filtering because initial transition is not provided by factory
        response = self.client.get(
            f'/api/fsm/entities/annotation/{self.annotation.id}/history?previous_state={AnnotationStateChoices.CREATED}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 0

        # Test date filtering
        created_at_from = (state_1.created_at - timedelta(seconds=1)).isoformat()
        created_at_to = state_1.created_at.isoformat()
        response = self.client.get(
            f'/api/fsm/entities/annotation/{self.annotation.id}/history?created_at_from={quote(created_at_from)}&created_at_to={quote(created_at_to)}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_1.id)


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
        # 'annotation_created' is auto-triggered on create
        response = self.client.post(
            f'/api/fsm/entities/annotation/{self.annotation.id}/transition/',
            data={'transition_name': 'annotation_created'},
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
