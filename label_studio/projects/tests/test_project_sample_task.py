import json
from unittest.mock import patch

import projects.api
import pytest
from django.test import TestCase
from django.urls import reverse
from projects.tests.factories import ProjectFactory
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestProjectSampleTask(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()

    @property
    def url(self):
        return reverse('projects:api:project-sample-task', kwargs={'pk': self.project.id})

    def test_sample_task_with_happy_path(self):
        """Test that ProjectSampleTask.post successfully creates a complete sample task with annotations and predictions"""
        client = APIClient()
        client.force_authenticate(user=self.project.created_by)
        user_id = self.project.created_by.id
        label_config = """
        <View>
          <Text name='text' value='$text'/>
          <Choices name='sentiment' toName='text'>
            <Choice value='Positive'/>
            <Choice value='Negative'/>
            <Choice value='Neutral'/>
          </Choices>
        </View>
        """
        sample_prediction = {
            'model_version': 'sample model version',
            'result': [
                {
                    'id': 'abc123',
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['Positive']},
                }
            ],
            'score': 0.95,
        }
        sample_annotation = {
            'was_cancelled': False,
            'ground_truth': False,
            'result': [
                {
                    'id': 'def456',
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['Positive']},
                }
            ],
            'completed_by': -1,
        }
        sample_task = {
            'id': 1,
            'data': {'text': 'This is a sample task for labeling.'},
            'predictions': [sample_prediction],
            'annotations': [sample_annotation],
        }

        with patch.object(
            projects.api.LabelInterface,
            'generate_complete_sample_task',
            return_value=sample_task,
        ):
            response = client.post(
                self.url,
                data=json.dumps({'label_config': label_config, 'include_annotation_and_prediction': True}),
                content_type='application/json',
            )

            assert response.status_code == 200
            response_data = response.json()
            assert 'sample_task' in response_data
            sample_task_with_annotator_id_set = sample_task.copy()
            sample_task_with_annotator_id_set['annotations'][0]['completed_by'] = user_id
            assert response_data['sample_task'] == sample_task_with_annotator_id_set

    def test_sample_task_fallback_when_generate_task_fails(self):
        """Test fallback to project.get_sample_task when LabelInterface.generate_complete_sample_task fails"""
        client = APIClient()
        client.force_authenticate(user=self.project.created_by)
        label_config = """
        <View>
          <Text name='text' value='$text'/>
          <Choices name='sentiment' toName='text'>
            <Choice value='Positive'/>
            <Choice value='Negative'/>
            <Choice value='Neutral'/>
          </Choices>
        </View>
        """
        fallback_data = {'id': 999, 'data': {'text': 'Fallback task'}}

        with (
            patch.object(
                projects.api.LabelInterface,
                'generate_complete_sample_task',
                side_effect=ValueError('Failed to generate sample task'),
            ),
            patch('projects.api.Project.get_sample_task', return_value=fallback_data),
        ):
            response = client.post(
                self.url,
                data=json.dumps({'label_config': label_config, 'include_annotation_and_prediction': True}),
                content_type='application/json',
            )

            assert response.status_code == 200
            response_data = response.json()
            assert 'sample_task' in response_data
            assert response_data['sample_task'] == fallback_data

    def test_sample_task_fallback_when_prediction_generation_fails(self):
        """Test fallback to project.get_sample_task when LabelInterface.generate_sample_prediction raises an exception"""
        client = APIClient()
        client.force_authenticate(user=self.project.created_by)
        label_config = """
        <View>
          <Text name='text' value='$text'/>
          <Choices name='sentiment' toName='text'>
            <Choice value='Positive'/>
            <Choice value='Negative'/>
            <Choice value='Neutral'/>
          </Choices>
        </View>
        """
        fallback_data = {'id': 999, 'data': {'text': 'Fallback task'}}

        with (
            patch.object(
                projects.api.LabelInterface,
                'generate_sample_prediction',
                return_value=None,
            ),
            patch('projects.api.Project.get_sample_task', return_value=fallback_data),
        ):
            response = client.post(
                self.url,
                data=json.dumps({'label_config': label_config, 'include_annotation_and_prediction': True}),
                content_type='application/json',
            )

            assert response.status_code == 200
            response_data = response.json()
            assert 'sample_task' in response_data
            assert response_data['sample_task'] == fallback_data

    def test_sample_task_with_include_annotation_and_prediction_false(self):
        """Test that setting include_annotation_and_prediction=False bypasses LabelInterface.generate_complete_sample_task"""
        client = APIClient()
        client.force_authenticate(user=self.project.created_by)
        label_config = """
        <View>
          <Text name='text' value='$text'/>
          <Choices name='sentiment' toName='text'>
            <Choice value='Positive'/>
            <Choice value='Negative'/>
            <Choice value='Neutral'/>
          </Choices>
        </View>
        """

        with (
            patch('projects.api.Project.get_sample_task', return_value=None) as mock_get_sample_task,
            patch.object(
                projects.api.LabelInterface, 'generate_complete_sample_task', return_value=None
            ) as mock_generate_complete,
        ):  # Shouldn't be called
            client.post(
                self.url,
                data=json.dumps({'label_config': label_config, 'include_annotation_and_prediction': False}),
                content_type='application/json',
            )

            mock_get_sample_task.assert_called_once()
            mock_generate_complete.assert_not_called()

    def test_sample_task_default_behavior(self):
        """Test that omitting include_annotation_and_prediction defaults to False and uses simple sample task"""
        client = APIClient()
        client.force_authenticate(user=self.project.created_by)
        label_config = """
        <View>
          <Text name='text' value='$text'/>
          <Choices name='sentiment' toName='text'>
            <Choice value='Positive'/>
            <Choice value='Negative'/>
            <Choice value='Neutral'/>
          </Choices>
        </View>
        """

        with (
            patch('projects.api.Project.get_sample_task', return_value=None) as mock_get_sample_task,
            patch.object(
                projects.api.LabelInterface, 'generate_complete_sample_task', return_value=None
            ) as mock_generate_complete,
        ):  # Shouldn't be called
            client.post(
                self.url,
                data=json.dumps({'label_config': label_config}),
                content_type='application/json',
            )

            mock_get_sample_task.assert_called_once()
            mock_generate_complete.assert_not_called()
