from datetime import timedelta
from urllib.parse import quote

from fsm.state_choices import AnnotationStateChoices, ProjectStateChoices, TaskStateChoices
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
        )
        state_3 = ProjectStateFactory(
            project=self.project,
            state=ProjectStateChoices.COMPLETED,
            previous_state=ProjectStateChoices.IN_PROGRESS,
            transition_name='complete_project',
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/fsm/entities/project/{self.project.id}/history')
        assert response.status_code == 200
        assert len(response.json()['results']) == 3
        assert response.json()['results'][0]['id'] == str(state_3.id)
        assert response.json()['results'][1]['id'] == str(state_2.id)
        assert response.json()['results'][2]['id'] == str(state_1.id)

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
        state_1 = AnnotationStateFactory(annotation=self.annotation, state=AnnotationStateChoices.SUBMITTED)
        state_1.created_at = state_1.created_at - timedelta(seconds=10)
        state_1.save()
        state_2 = AnnotationStateFactory(
            annotation=self.annotation,
            state=AnnotationStateChoices.COMPLETED,
            previous_state=AnnotationStateChoices.SUBMITTED,
            triggered_by=self.user,
            transition_name='complete_annotation',
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/fsm/entities/annotation/{self.annotation.id}/history')
        assert response.status_code == 200
        assert len(response.json()['results']) == 2
        assert response.json()['results'][0]['id'] == str(state_2.id)
        assert response.json()['results'][1]['id'] == str(state_1.id)

        # Test ordering
        response = self.client.get(f'/api/fsm/entities/annotation/{self.annotation.id}/history?ordering=id')
        assert response.status_code == 200
        assert len(response.json()['results']) == 2
        assert response.json()['results'][0]['id'] == str(state_1.id)
        assert response.json()['results'][1]['id'] == str(state_2.id)

        # Test state filtering
        response = self.client.get(
            f'/api/fsm/entities/annotation/{self.annotation.id}/history?state={AnnotationStateChoices.COMPLETED}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_2.id)

        # Test previous_state filtering
        response = self.client.get(
            f'/api/fsm/entities/annotation/{self.annotation.id}/history?previous_state={AnnotationStateChoices.SUBMITTED}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_2.id)

        # Test transition_name filtering
        response = self.client.get(
            f'/api/fsm/entities/annotation/{self.annotation.id}/history?transition_name=complete_annotation'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_2.id)

        # Test triggered_by filtering
        response = self.client.get(
            f'/api/fsm/entities/annotation/{self.annotation.id}/history?triggered_by={self.user.id}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_2.id)
        assert response.json()['results'][0]['triggered_by']['id'] == self.user.id

        # Test date filtering
        created_at_from = (state_2.created_at - timedelta(seconds=1)).isoformat()
        created_at_to = state_2.created_at.isoformat()
        response = self.client.get(
            f'/api/fsm/entities/annotation/{self.annotation.id}/history?created_at_from={quote(created_at_from)}&created_at_to={quote(created_at_to)}'
        )
        assert response.status_code == 200
        assert len(response.json()['results']) == 1
        assert response.json()['results'][0]['id'] == str(state_2.id)
