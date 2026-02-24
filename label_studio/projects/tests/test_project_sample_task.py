import json
from unittest.mock import patch

import projects.api
import pytest
from core.label_config import generate_sample_from_json_schema, generate_sample_task_without_check
from django.test import TestCase
from django.urls import reverse
from projects.tests.factories import ProjectFactory
from rest_framework.test import APIClient


class TestGenerateSampleFromJsonSchema:
    """Tests for generate_sample_from_json_schema function"""

    def test_string_type(self):
        schema = {'type': 'string'}
        result = generate_sample_from_json_schema(schema)
        assert result == 'Sample text value'

    def test_string_with_format_email(self):
        schema = {'type': 'string', 'format': 'email'}
        result = generate_sample_from_json_schema(schema)
        assert result == 'sample@example.com'

    def test_string_with_format_date(self):
        schema = {'type': 'string', 'format': 'date'}
        result = generate_sample_from_json_schema(schema)
        assert result == '2024-01-15'

    def test_string_with_enum(self):
        schema = {'type': 'string', 'enum': ['active', 'inactive', 'pending']}
        result = generate_sample_from_json_schema(schema)
        assert result == 'active'

    def test_integer_type(self):
        schema = {'type': 'integer'}
        result = generate_sample_from_json_schema(schema)
        assert result == 50

    def test_integer_with_min_max(self):
        schema = {'type': 'integer', 'minimum': 10, 'maximum': 20}
        result = generate_sample_from_json_schema(schema)
        assert result == 15

    def test_number_type(self):
        schema = {'type': 'number'}
        result = generate_sample_from_json_schema(schema)
        assert result == 50.0

    def test_boolean_type(self):
        schema = {'type': 'boolean'}
        result = generate_sample_from_json_schema(schema)
        assert result is True

    def test_object_type(self):
        schema = {
            'type': 'object',
            'properties': {'name': {'type': 'string'}, 'age': {'type': 'integer'}},
        }
        result = generate_sample_from_json_schema(schema)
        assert result == {'name': 'Sample text value', 'age': 50}

    def test_nested_object(self):
        schema = {
            'type': 'object',
            'properties': {'user': {'type': 'object', 'properties': {'email': {'type': 'string', 'format': 'email'}}}},
        }
        result = generate_sample_from_json_schema(schema)
        assert result == {'user': {'email': 'sample@example.com'}}

    def test_array_type(self):
        schema = {'type': 'array', 'items': {'type': 'string'}}
        result = generate_sample_from_json_schema(schema)
        assert result == ['Sample text value', 'Sample text value']

    def test_array_of_objects(self):
        schema = {
            'type': 'array',
            'items': {'type': 'object', 'properties': {'id': {'type': 'integer'}, 'label': {'type': 'string'}}},
        }
        result = generate_sample_from_json_schema(schema)
        assert len(result) == 2
        assert result[0] == {'id': 50, 'label': 'Sample text value'}

    def test_shorthand_properties(self):
        # Schema without explicit type but with properties
        schema = {'properties': {'name': {'type': 'string'}}}
        result = generate_sample_from_json_schema(schema)
        assert result == {'name': 'Sample text value'}

    def test_string_schema(self):
        # Schema as JSON string
        schema_str = '{"type": "object", "properties": {"name": {"type": "string"}}}'
        result = generate_sample_from_json_schema(schema_str)
        assert result == {'name': 'Sample text value'}

    def test_invalid_json_string(self):
        result = generate_sample_from_json_schema('not valid json')
        assert result is None

    def test_empty_schema(self):
        result = generate_sample_from_json_schema({})
        assert result is None

    def test_none_schema(self):
        result = generate_sample_from_json_schema(None)
        assert result is None


class TestGenerateSampleTaskWithReactCode:
    """Tests for ReactCode tag handling in generate_sample_task_without_check"""

    def test_reactcode_with_data_attribute(self):
        label_config = '''
        <View>
          <ReactCode name="custom" data="$myData" inputs='{"type": "object", "properties": {"name": {"type": "string"}, "age": {"type": "integer"}}}' />
        </View>
        '''
        result = generate_sample_task_without_check(label_config)
        assert 'myData' in result
        assert result['myData'] == {'name': 'Sample text value', 'age': 50}

    def test_reactcode_without_data_attribute(self):
        # When data attribute is not set, sample data should be merged at root level
        label_config = '''
        <View>
          <ReactCode name="custom" inputs='{"type": "object", "properties": {"title": {"type": "string"}, "count": {"type": "number"}}}' />
        </View>
        '''
        result = generate_sample_task_without_check(label_config)
        assert 'title' in result
        assert 'count' in result
        assert result['title'] == 'Sample text value'
        assert result['count'] == 50.0

    def test_reactcode_with_existing_fields(self):
        # ReactCode should not overwrite existing fields from other tags
        label_config = '''
        <View>
          <Text name="text" value="$title"/>
          <ReactCode name="custom" inputs='{"type": "object", "properties": {"title": {"type": "string"}, "extra": {"type": "boolean"}}}' />
        </View>
        '''
        result = generate_sample_task_without_check(label_config)
        # title should come from Text tag
        assert 'title' in result
        assert result['title'] != 'Sample text value'  # From Text tag, not ReactCode
        # extra should come from ReactCode
        assert result['extra'] is True

    def test_custominterface_with_inputs(self):
        label_config = '''
        <View>
          <CustomInterface name="custom" data="$content" inputs='{"type": "object", "properties": {"message": {"type": "string"}}}' />
        </View>
        '''
        result = generate_sample_task_without_check(label_config)
        assert 'content' in result
        assert result['content'] == {'message': 'Sample text value'}

    def test_reactcode_without_inputs(self):
        # ReactCode without inputs schema should not affect task data
        label_config = '''
        <View>
          <Text name="text" value="$text"/>
          <ReactCode name="custom" data="$myData" />
        </View>
        '''
        result = generate_sample_task_without_check(label_config)
        assert 'text' in result
        assert 'myData' not in result

    def test_reactcode_with_complex_nested_schema(self):
        label_config = '''
        <View>
          <ReactCode name="custom" data="$formData" inputs='{"type": "object", "properties": {"user": {"type": "object", "properties": {"email": {"type": "string", "format": "email"}, "verified": {"type": "boolean"}}}, "items": {"type": "array", "items": {"type": "string"}}}}' />
        </View>
        '''
        result = generate_sample_task_without_check(label_config)
        assert 'formData' in result
        assert result['formData']['user'] == {'email': 'sample@example.com', 'verified': True}
        assert result['formData']['items'] == ['Sample text value', 'Sample text value']


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

        with patch('projects.api.Project.get_sample_task', return_value=None) as mock_get_sample_task, patch.object(
            projects.api.LabelInterface, 'generate_complete_sample_task', return_value=None
        ) as mock_generate_complete:  # Shouldn't be called

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

        with patch('projects.api.Project.get_sample_task', return_value=None) as mock_get_sample_task, patch.object(
            projects.api.LabelInterface, 'generate_complete_sample_task', return_value=None
        ) as mock_generate_complete:  # Shouldn't be called

            client.post(
                self.url,
                data=json.dumps({'label_config': label_config}),
                content_type='application/json',
            )

            mock_get_sample_task.assert_called_once()
            mock_generate_complete.assert_not_called()
