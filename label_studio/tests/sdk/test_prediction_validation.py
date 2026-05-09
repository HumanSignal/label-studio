import pytest
from django.contrib.auth import get_user_model
from label_studio_sdk import LabelStudio
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from tasks.tests.factories import TaskFactory
from users.tests.factories import UserFactory

User = get_user_model()


class TestSDKPredictionValidation:
    """Comprehensive tests for prediction validation using Label Studio SDK"""

    @pytest.fixture(autouse=True)
    def setup(self, django_db_setup, django_db_blocker):
        """Set up test environment with user, organization, project, and task using factories"""
        with django_db_blocker.unblock():
            self.user = UserFactory()
            self.organization = OrganizationFactory(created_by=self.user)
            self.user.active_organization = self.organization
            self.user.save()

            # Create a project with a comprehensive label configuration
            self.project = ProjectFactory(
                title='Test Project',
                label_config="""
                <View>
                  <Text name="text" value="$text"/>
                  <Choices name="sentiment" toName="text">
                    <Choice value="positive"/>
                    <Choice value="negative"/>
                    <Choice value="neutral"/>
                  </Choices>
                  <Labels name="entities" toName="text">
                    <Label value="person" background="red"/>
                    <Label value="organization" background="blue"/>
                    <Label value="location" background="green"/>
                  </Labels>
                  <Rating name="quality" toName="text">
                    <Choice value="1"/>
                    <Choice value="2"/>
                    <Choice value="3"/>
                    <Choice value="4"/>
                    <Choice value="5"/>
                  </Rating>
                  <TextArea name="summary" toName="text"/>
                </View>
                """,
                created_by=self.user,
                organization=self.organization,
            )

            # Create a task
            self.task = TaskFactory(project=self.project, data={'text': 'John Smith works at Microsoft in Seattle.'})

    def test_valid_prediction_choices(self, django_live_url, business_client):
        """Test creating a valid prediction with choices using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {'from_name': 'sentiment', 'to_name': 'text', 'type': 'choices', 'value': {'choices': ['positive']}}
            ],
            'score': 0.95,
            'model_version': 'v1.0',
        }

        # Use the SDK to create prediction
        prediction = ls.predictions.create(**prediction_data)

        # Verify the prediction was created successfully
        assert prediction.id is not None
        assert prediction.task == self.task.id
        assert prediction.result == prediction_data['result']

    def test_valid_prediction_labels(self, django_live_url, business_client):
        """Test creating a valid prediction with labels using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'entities',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['person'], 'start': 0, 'end': 10, 'text': 'John Smith'},
                }
            ],
            'score': 0.85,
            'model_version': 'v1.0',
        }

        prediction = ls.predictions.create(**prediction_data)

        assert prediction.id is not None
        assert prediction.task == self.task.id
        assert prediction.result == prediction_data['result']

    def test_valid_prediction_rating(self, django_live_url, business_client):
        """Test creating a valid prediction with rating using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [{'from_name': 'quality', 'to_name': 'text', 'type': 'rating', 'value': {'rating': 4}}],
            'score': 0.90,
            'model_version': 'v1.0',
        }

        prediction = ls.predictions.create(**prediction_data)

        assert prediction.id is not None
        assert prediction.task == self.task.id
        assert prediction.result == prediction_data['result']

    def test_valid_prediction_textarea(self, django_live_url, business_client):
        """Test creating a valid prediction with textarea using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'summary',
                    'to_name': 'text',
                    'type': 'textarea',
                    'value': {'text': ['This is a summary of the text.']},
                }
            ],
            'score': 0.88,
            'model_version': 'v1.0',
        }

        prediction = ls.predictions.create(**prediction_data)

        assert prediction.id is not None
        assert prediction.task == self.task.id
        assert prediction.result == prediction_data['result']

    def test_missing_required_fields(self, django_live_url, business_client):
        """Test prediction with missing required fields using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'sentiment',
                    # Missing 'to_name', 'type', 'value'
                }
            ],
            'score': 0.95,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_invalid_from_name(self, django_live_url, business_client):
        """Test prediction with non-existent from_name using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'nonexistent_tag',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['positive']},
                }
            ],
            'score': 0.95,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_invalid_to_name(self, django_live_url, business_client):
        """Test prediction with non-existent to_name using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'sentiment',
                    'to_name': 'nonexistent_target',
                    'type': 'choices',
                    'value': {'choices': ['positive']},
                }
            ],
            'score': 0.95,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_type_mismatch(self, django_live_url, business_client):
        """Test prediction with type mismatch using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'labels',  # Wrong type - should be 'choices'
                    'value': {'choices': ['positive']},
                }
            ],
            'score': 0.95,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_invalid_choice_value(self, django_live_url, business_client):
        """Test prediction with invalid choice value using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['invalid_choice']},  # Not in available choices
                }
            ],
            'score': 0.95,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_invalid_rating_value(self, django_live_url, business_client):
        """Test prediction with invalid rating value using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'quality',
                    'to_name': 'text',
                    'type': 'rating',
                    'value': {'rating': 6},  # Rating should be 1-5
                }
            ],
            'score': 0.90,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_invalid_labels_value(self, django_live_url, business_client):
        """Test prediction with invalid labels value using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'entities',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {
                        'labels': ['invalid_label'],  # Not in available labels
                        'start': 0,
                        'end': 10,
                        'text': 'John Smith',
                    },
                }
            ],
            'score': 0.85,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_missing_value_field(self, django_live_url, business_client):
        """Test prediction with missing value field using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    # Missing 'value' field
                }
            ],
            'score': 0.95,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_empty_result_array(self, django_live_url, business_client):
        """Test prediction with empty result array using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {'task': self.task.id, 'result': [], 'score': 0.95, 'model_version': 'v1.0'}  # Empty array

        prediction = ls.predictions.create(**prediction_data)
        assert prediction.id is not None
        assert prediction.task == self.task.id
        assert prediction.result == prediction_data['result']

    def test_multiple_regions_mixed_validity(self, django_live_url, business_client):
        """Test prediction with multiple regions where some are valid and some are invalid using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {'from_name': 'sentiment', 'to_name': 'text', 'type': 'choices', 'value': {'choices': ['positive']}},
                {
                    'from_name': 'entities',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': [['person']], 'start': 0, 'end': 10, 'text': 'John Smith'},
                },
                {
                    'from_name': 'nonexistent_tag',  # Invalid
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['positive']},
                },
            ],
            'score': 0.85,
            'model_version': 'v1.0',
        }

        # This should fail validation due to the invalid region
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_complex_valid_prediction(self, django_live_url, business_client):
        """Test a complex valid prediction with multiple regions using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {'from_name': 'sentiment', 'to_name': 'text', 'type': 'choices', 'value': {'choices': ['positive']}},
                {
                    'from_name': 'entities',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['person'], 'start': 0, 'end': 10, 'text': 'John Smith'},
                },
                {
                    'from_name': 'entities',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['organization'], 'start': 17, 'end': 26, 'text': 'Microsoft'},
                },
                {'from_name': 'quality', 'to_name': 'text', 'type': 'rating', 'value': {'rating': 4}},
                {
                    'from_name': 'summary',
                    'to_name': 'text',
                    'type': 'textarea',
                    'value': {'text': ['A person works at an organization.']},
                },
            ],
            'score': 0.92,
            'model_version': 'v2.0',
        }

        prediction = ls.predictions.create(**prediction_data)

        assert prediction.id is not None
        assert prediction.task == self.task.id
        assert prediction.result == prediction_data['result']

    def test_invalid_textarea_value(self, django_live_url, business_client):
        """Test prediction with invalid textarea value structure using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'summary',
                    'to_name': 'text',
                    'type': 'textarea',
                    'value': {'text': 'This should be a list'},  # Should be list, not string
                }
            ],
            'score': 0.88,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_invalid_labels_structure(self, django_live_url, business_client):
        """Test prediction with invalid labels structure using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'entities',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {
                        'labels': 'person',  # Should be list of lists
                        'start': 0,
                        'end': 10,
                        'text': 'John Smith',
                    },
                }
            ],
            'score': 0.85,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_missing_text_in_labels(self, django_live_url, business_client):
        """Test prediction with missing text field in labels using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'entities',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {
                        'labels': [['person']],
                        'start': 0,
                        'end': 10,
                        # Missing 'text' field
                    },
                }
            ],
            'score': 0.85,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_invalid_start_end_positions(self, django_live_url, business_client):
        """Test prediction with invalid start/end positions using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'entities',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {
                        'labels': [['person']],
                        'start': 100,  # Beyond text length
                        'end': 110,
                        'text': 'John Smith',
                    },
                }
            ],
            'score': 0.85,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)

    def test_end_before_start(self, django_live_url, business_client):
        """Test prediction with end position before start position using SDK"""
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        prediction_data = {
            'task': self.task.id,
            'result': [
                {
                    'from_name': 'entities',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': [['person']], 'start': 10, 'end': 5, 'text': 'John Smith'},  # End before start
                }
            ],
            'score': 0.85,
            'model_version': 'v1.0',
        }

        # This should fail validation
        with pytest.raises(Exception):
            ls.predictions.create(**prediction_data)
