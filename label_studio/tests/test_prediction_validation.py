"""
Test file for prediction validation functionality using LabelInterface.

This module tests the enhanced validation system for predictions during data import.
It covers various validation scenarios including:
- Valid prediction creation
- Invalid prediction structure
- Score validation
- Model version validation
- Result structure validation against project configuration using LabelInterface
- Preannotated fields validation
- Detailed error reporting from LabelInterface
"""

from unittest.mock import patch

import pytest
from data_import.api import ImportPredictionsAPI
from data_import.functions import reformat_predictions
from data_import.serializers import ImportApiSerializer
from django.contrib.auth import get_user_model
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory, force_authenticate
from tasks.models import Annotation, Prediction, Task
from tasks.tests.factories import TaskFactory
from users.tests.factories import UserFactory

User = get_user_model()


@pytest.mark.django_db
class TestPredictionValidation:
    """Test cases for prediction validation functionality using LabelInterface."""

    @pytest.fixture(autouse=True)
    def setup(self, django_db_setup, django_db_blocker):
        """Set up test data using factories."""
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
                        <TextArea name="summary" toName="text"/>
                    </View>
                """,
                organization=self.organization,
                created_by=self.user,
            )

            # Create a task
            self.task = TaskFactory(project=self.project, data={'text': 'This is a test text.'})

    def test_valid_prediction_creation(self):
        """Test that valid predictions are created successfully."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 0.95,
                        'model_version': 'v1.0',
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()
        created_tasks = serializer.save(project_id=self.project.id)

        assert len(created_tasks) == 1
        assert created_tasks[0].predictions.count() == 1

        prediction = created_tasks[0].predictions.first()
        assert prediction.score == 0.95
        assert prediction.model_version == 'v1.0'

    @patch('tasks.serializers.flag_set', return_value=True)
    @patch('tasks.serializers.LabelInterface')
    def test_import_tasks_sanitizes_prediction_before_validation(self, mock_li_cls, _mock_flag_set):
        """ImportApiSerializer must strip export-only keys before validate_prediction()."""
        mock_li = mock_li_cls.return_value

        def _validate_prediction(payload, return_errors=True):
            if 'state' in payload:
                return ['Unexpected field: state']
            return []

        mock_li.validate_prediction.side_effect = _validate_prediction
        tasks = [
            {
                'data': {'text': 'Sanitize before validate'},
                'predictions': [
                    {
                        'state': 'CREATED',
                        'id': 111,
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 0.9,
                        'model_version': 'mv-sanitize',
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid(), serializer.errors
        created_tasks = serializer.save(project_id=self.project.id)
        assert len(created_tasks) == 1

    @patch(
        'data_import.api.flag_set',
        side_effect=lambda flag_name, user='auto', **kwargs: (
            flag_name == 'fflag_feat_utc_210_prediction_validation_15082025'
        ),
    )
    @patch('data_import.api.LabelInterface')
    def test_import_predictions_endpoint_sanitizes_payload_before_validation(self, mock_li_cls, _mock_flag_set):
        """Bulk import API should sanitize payload before LabelInterface.validate_prediction()."""
        mock_li = mock_li_cls.return_value

        def _validate_prediction(payload, return_errors=True):
            if 'state' in payload:
                return ['Unexpected field: state']
            return []

        mock_li.validate_prediction.side_effect = _validate_prediction
        request_factory = APIRequestFactory()
        payload = [
            {
                'state': 'CREATED',
                'id': 222,
                'result': [
                    {
                        'from_name': 'sentiment',
                        'to_name': 'text',
                        'type': 'choices',
                        'value': {'choices': ['neutral']},
                    }
                ],
                'score': 0.5,
                'model_version': 'mv-sanitize-endpoint',
                'task': self.task.id,
            }
        ]
        request = request_factory.post(
            f'/api/projects/{self.project.id}/import/predictions',
            data=payload,
            format='json',
        )
        force_authenticate(request, user=self.user)
        response = ImportPredictionsAPI.as_view()(request, pk=self.project.id)
        assert response.status_code == 201
        assert response.data['created'] == 1

    def test_invalid_prediction_missing_result(self):
        """Test validation fails when prediction is missing result field."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'score': 0.95,
                        'model_version': 'v1.0'
                        # Missing 'result' field
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        # ImportApiSerializer validates structure and rejects missing result field
        assert not serializer.is_valid()
        assert serializer.errors

    def test_invalid_prediction_none_result(self):
        """Test validation fails when prediction result is None."""
        tasks = [
            {'data': {'text': 'Test text'}, 'predictions': [{'result': None, 'score': 0.95, 'model_version': 'v1.0'}]}
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        with pytest.raises(ValidationError) as exc_info:
            serializer.save(project_id=self.project.id)
        assert 'predictions' in exc_info.value.detail

    def test_valid_score_range(self):
        """Test that valid scores within 0.00-1.00 range are accepted."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 0.75,  # Valid score within range
                        'model_version': 'v1.0',
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        # Score validation should pass for valid scores
        created_tasks = serializer.save(project_id=self.project.id)
        assert len(created_tasks) == 1
        prediction = created_tasks[0].predictions.first()
        assert prediction.score == 0.75  # Score should be preserved

    def test_valid_score_boundary_values(self):
        """Test that boundary values 0.00 and 1.00 are accepted."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 0.0,  # Minimum valid score
                        'model_version': 'v1.0',
                    }
                ],
            },
            {
                'data': {'text': 'Test text 2'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['negative']},
                            }
                        ],
                        'score': 1.0,  # Maximum valid score
                        'model_version': 'v1.0',
                    }
                ],
            },
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        # Score validation should pass for boundary values
        created_tasks = serializer.save(project_id=self.project.id)
        assert len(created_tasks) == 2
        assert created_tasks[0].predictions.first().score == 0.0
        assert created_tasks[1].predictions.first().score == 1.0

    def test_invalid_score_range(self):
        """Test validation fails when score is outside valid range."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 1.5,  # Invalid score > 1.0
                        'model_version': 'v1.0',
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        # Score validation now fails for scores outside 0.00-1.00 range
        with pytest.raises(ValidationError) as exc_info:
            serializer.save(project_id=self.project.id)
        assert 'predictions' in exc_info.value.detail
        # Check that the error message mentions score validation
        error_text = str(exc_info.value.detail)
        assert 'Score must be between 0.00 and 1.00' in error_text

    def test_invalid_score_type(self):
        """Test validation fails when score is not a number."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 'invalid_score',  # Invalid score type
                        'model_version': 'v1.0',
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        # Score validation now fails for invalid score types
        with pytest.raises(ValidationError) as exc_info:
            serializer.save(project_id=self.project.id)
        assert 'predictions' in exc_info.value.detail
        # Check that the error message mentions score validation
        error_text = str(exc_info.value.detail)
        assert 'Score must be a valid number' in error_text

    def test_invalid_model_version_type(self):
        """Test validation fails when model_version is not a string."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 0.95,
                        'model_version': 123,  # Invalid type
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        # Model version validation is handled gracefully
        created_tasks = serializer.save(project_id=self.project.id)
        assert len(created_tasks) == 1
        prediction = created_tasks[0].predictions.first()
        assert prediction.model_version == '123'  # Converted to string

    def test_invalid_model_version_length(self):
        """Test validation fails when model_version is too long."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 0.95,
                        'model_version': 'a' * 300,  # Too long
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        # Model version validation is handled gracefully
        created_tasks = serializer.save(project_id=self.project.id)
        assert len(created_tasks) == 1
        prediction = created_tasks[0].predictions.first()
        # Long model version is truncated or handled gracefully
        assert prediction.model_version is not None

    def test_invalid_result_missing_required_fields(self):
        """Test validation fails when result items are missing required fields."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                # Missing 'to_name', 'type', 'value'
                            }
                        ],
                        'score': 0.95,
                        'model_version': 'v1.0',
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        with pytest.raises(ValidationError) as exc_info:
            serializer.save(project_id=self.project.id)
        assert 'predictions' in exc_info.value.detail

    def test_invalid_result_from_name_not_in_config(self):
        """Test validation fails when from_name doesn't exist in project config."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
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
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        with pytest.raises(ValidationError) as exc_info:
            serializer.save(project_id=self.project.id)
        assert 'predictions' in exc_info.value.detail

    def test_invalid_result_type_mismatch(self):
        """Test validation fails when result type doesn't match project config."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'labels',  # Wrong type
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 0.95,
                        'model_version': 'v1.0',
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        with pytest.raises(ValidationError) as exc_info:
            serializer.save(project_id=self.project.id)
        assert 'predictions' in exc_info.value.detail

    def test_invalid_result_to_name_mismatch(self):
        """Test validation fails when to_name doesn't match project config."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'wrong_target',  # Wrong to_name
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 0.95,
                        'model_version': 'v1.0',
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        with pytest.raises(ValidationError) as exc_info:
            serializer.save(project_id=self.project.id)
        assert 'predictions' in exc_info.value.detail

    def test_label_interface_detailed_error_reporting(self):
        """Test that LabelInterface provides detailed error messages."""
        from label_studio_sdk.label_interface import LabelInterface

        li = LabelInterface(self.project.label_config)

        # Test missing required field
        invalid_prediction = {
            'result': [
                {
                    'from_name': 'sentiment',
                    # Missing 'to_name', 'type', 'value'
                }
            ]
        }

        errors = li.validate_prediction(invalid_prediction, return_errors=True)
        assert isinstance(errors, list)
        assert len(errors) > 0
        # Check for any error message about missing fields
        error_text = ' '.join(errors)
        assert 'Missing required field' in error_text or 'missing' in error_text.lower()

    def test_label_interface_invalid_from_name(self):
        """Test LabelInterface reports invalid from_name errors."""
        from label_studio_sdk.label_interface import LabelInterface

        li = LabelInterface(self.project.label_config)

        invalid_prediction = {
            'result': [
                {
                    'from_name': 'nonexistent_tag',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['positive']},
                }
            ]
        }

        errors = li.validate_prediction(invalid_prediction, return_errors=True)
        assert isinstance(errors, list)
        assert len(errors) > 0
        error_text = ' '.join(errors)
        assert 'not found' in error_text

    def test_label_interface_invalid_type(self):
        """Test LabelInterface reports invalid type errors."""
        from label_studio_sdk.label_interface import LabelInterface

        li = LabelInterface(self.project.label_config)

        invalid_prediction = {
            'result': [
                {
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'labels',  # Wrong type
                    'value': {'choices': ['positive']},
                }
            ]
        }

        errors = li.validate_prediction(invalid_prediction, return_errors=True)
        assert isinstance(errors, list)
        assert len(errors) > 0
        error_text = ' '.join(errors)
        assert 'does not match expected type' in error_text or 'type' in error_text.lower()

    def test_label_interface_invalid_to_name(self):
        """Test LabelInterface reports invalid to_name errors."""
        from label_studio_sdk.label_interface import LabelInterface

        li = LabelInterface(self.project.label_config)

        invalid_prediction = {
            'result': [
                {
                    'from_name': 'sentiment',
                    'to_name': 'wrong_target',  # Wrong to_name
                    'type': 'choices',
                    'value': {'choices': ['positive']},
                }
            ]
        }

        errors = li.validate_prediction(invalid_prediction, return_errors=True)
        assert isinstance(errors, list)
        assert len(errors) > 0
        error_text = ' '.join(errors)
        assert 'not found' in error_text

    def test_preannotated_fields_validation(self):
        """Test validation of predictions created from preannotated fields."""
        tasks = [{'text': 'Test text 1', 'sentiment': 'positive'}, {'text': 'Test text 2', 'sentiment': 'negative'}]

        preannotated_fields = ['sentiment']

        # This should work correctly
        reformatted_tasks = reformat_predictions(tasks, preannotated_fields)

        assert len(reformatted_tasks) == 2
        assert 'data' in reformatted_tasks[0]
        assert 'predictions' in reformatted_tasks[0]
        assert len(reformatted_tasks[0]['predictions']) == 1

    def test_preannotated_fields_missing_field(self):
        """Test validation fails when preannotated field is missing."""
        tasks = [
            {'text': 'Test text 1'},  # Missing 'sentiment' field
            {'text': 'Test text 2', 'sentiment': 'negative'},
        ]

        preannotated_fields = ['sentiment']

        # This should raise a ValidationError
        with pytest.raises(ValidationError):
            reformat_predictions(tasks, preannotated_fields, raise_errors=True)

    def test_multiple_validation_errors(self):
        """Test that multiple validation errors are collected and reported."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {'result': None, 'score': 0.95, 'model_version': 'v1.0'},  # Invalid: None result
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 1.5,  # Invalid: score > 1.0
                        'model_version': 'v1.0',
                    },
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        with pytest.raises(ValidationError) as exc_info:
            serializer.save(project_id=self.project.id)
        assert 'predictions' in exc_info.value.detail

    def test_project_without_label_config(self):
        """Test validation fails when project has no label configuration."""
        # Create project with minimal but valid label config
        project_no_config = ProjectFactory(
            title='No Config Project',
            label_config='<View><Text name="text" value="$text"/></View>',
            organization=self.organization,
            created_by=self.user,
        )

        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 0.95,
                        'model_version': 'v1.0',
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': project_no_config})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
        with pytest.raises(ValidationError) as exc_info:
            serializer.save(project_id=project_no_config.id)
        assert 'predictions' in exc_info.value.detail

    def test_prediction_creation_with_exception_handling(self):
        """Test that exceptions during prediction creation are properly handled."""
        tasks = [
            {
                'data': {'text': 'Test text'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 0.95,
                        'model_version': 'v1.0',
                    }
                ],
            }
        ]

        # Mock prepare_prediction_result to raise an exception
        with patch('tasks.models.Prediction.prepare_prediction_result', side_effect=Exception('Test exception')):
            serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
            assert serializer.is_valid()  # ImportApiSerializer validates structure, not content
            with pytest.raises(ValidationError) as exc_info:
                serializer.save(project_id=self.project.id)
            assert 'predictions' in exc_info.value.detail

    def test_label_interface_backward_compatibility(self):
        """Test that LabelInterface.validate_prediction maintains backward compatibility."""
        from label_studio_sdk.label_interface import LabelInterface

        li = LabelInterface(self.project.label_config)

        # Test valid prediction with return_errors=False (default)
        valid_prediction = {
            'result': [
                {'from_name': 'sentiment', 'to_name': 'text', 'type': 'choices', 'value': {'choices': ['positive']}}
            ]
        }

        # Should return True for valid prediction
        result = li.validate_prediction(valid_prediction)
        assert result is True

        # Should return False for invalid prediction
        invalid_prediction = {
            'result': [
                {
                    'from_name': 'nonexistent_tag',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['positive']},
                }
            ]
        }

        result = li.validate_prediction(invalid_prediction)
        assert result is False

    def test_atomic_transaction_rollback_on_prediction_validation_failure(self):
        """Test that when prediction validation fails, the entire transaction is rolled back.

        This ensures that no tasks or annotations are saved to the database when
        prediction validation errors occur, since the entire create() method is wrapped
        in an atomic transaction.
        """
        # Get initial counts
        initial_task_count = Task.objects.filter(project=self.project).count()
        initial_annotation_count = Annotation.objects.filter(project=self.project).count()
        initial_prediction_count = Prediction.objects.filter(project=self.project).count()

        tasks = [
            {
                'data': {'text': 'Test text 1'},
                'annotations': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'completed_by': self.user.id,
                    }
                ],
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['positive']},
                            }
                        ],
                        'score': 0.95,
                        'model_version': 'v1.0',
                    }
                ],
            },
            {
                'data': {'text': 'Test text 2'},
                'annotations': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['negative']},
                            }
                        ],
                        'completed_by': self.user.id,
                    }
                ],
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'sentiment',
                                'to_name': 'text',
                                'type': 'choices',
                                'value': {'choices': ['invalid_choice']},  # This will cause validation failure
                            }
                        ],
                        'score': 0.85,
                        'model_version': 'v1.0',
                    }
                ],
            },
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': self.project})
        assert serializer.is_valid()  # ImportApiSerializer validates structure, not content

        # Attempt to save - this should fail due to invalid prediction in second task
        with pytest.raises(ValidationError) as exc_info:
            serializer.save(project_id=self.project.id)

        # Verify the error is about predictions
        assert 'predictions' in exc_info.value.detail

        # Verify that NO tasks, annotations, or predictions were saved
        # (the entire transaction should have been rolled back)
        final_task_count = Task.objects.filter(project=self.project).count()
        final_annotation_count = Annotation.objects.filter(project=self.project).count()
        final_prediction_count = Prediction.objects.filter(project=self.project).count()

        assert final_task_count == initial_task_count, 'Tasks should not be saved when prediction validation fails'
        assert (
            final_annotation_count == initial_annotation_count
        ), 'Annotations should not be saved when prediction validation fails'
        assert (
            final_prediction_count == initial_prediction_count
        ), 'Predictions should not be saved when prediction validation fails'

        # Verify the error message contains details about the validation failure
        error_message = str(exc_info.value.detail['predictions'][0])
        assert 'Task 1, prediction 0' in error_message
        assert 'invalid_choice' in error_message
        assert 'positive' in error_message or 'negative' in error_message or 'neutral' in error_message

    def test_import_predictions_with_default_and_changed_configs(self):
        """End-to-end: importing predictions before and after setting label config.

        1) With default config (empty View), predictions should not be validated and import succeeds.
        2) After setting a matching config, import with same prediction succeeds.
        3) After changing config to mismatch the prediction, import should fail with validation error.
        """
        # 1) Create a new project with default config (do not override label_config)
        project_default = ProjectFactory(organization=self.organization, created_by=self.user)
        # Ensure default config is indeed default
        assert project_default.label_config_is_not_default is False

        tasks = [
            {
                'data': {'image': 'https://example.com/img1.png'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'polylabel',
                                'to_name': 'image',
                                'type': 'polygonlabels',
                                'value': {'points': [[0, 0], [10, 10]], 'polygonlabels': ['A']},
                            }
                        ]
                    }
                ],
            }
        ]

        # Import should work (skip validation due to default config)
        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': project_default})
        assert serializer.is_valid()
        serializer.save(project_id=project_default.id)

        # 2) Set label config to match the prediction and import again
        matching_config = """
            <View>
              <Image name="image" value="$image"/>
              <PolygonLabels name="polylabel" toName="image">
                <Label value="A"/>
              </PolygonLabels>
            </View>
            """
        project_default.label_config = matching_config
        project_default.save()
        assert project_default.label_config_is_not_default

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': project_default})
        assert serializer.is_valid()
        serializer.save(project_id=project_default.id)  # should pass now that config matches

        # 3) Change config to not match the prediction (different control name)
        mismatching_config = """
            <View>
              <Image name="image" value="$image"/>
              <PolygonLabels name="otherlabel" toName="image">
                <Label value="A"/>
              </PolygonLabels>
            </View>
            """
        project_default.label_config = mismatching_config
        project_default.save()

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': project_default})
        assert serializer.is_valid()
        with pytest.raises(ValidationError) as exc_info:
            serializer.save(project_id=project_default.id)
        assert 'predictions' in exc_info.value.detail

    @pytest.mark.django_db
    def test_import_api_skip_then_validate(self, client):
        """Exercise the HTTP ImportAPI to verify validation skip with default config and enforcement later.

        - POST /api/projects/{id}/import?commit_to_project=false with default config should succeed (skip validation)
        - Update project to matching config: same request with commit_to_project=true should succeed
        - Update project to mismatching config: same request with commit_to_project=true should fail
        """
        from django.urls import reverse

        project = ProjectFactory(organization=self.organization, created_by=self.user)
        # Use DRF APIClient to authenticate
        from rest_framework.test import APIClient

        api_client = APIClient()
        api_client.force_authenticate(user=self.user)
        assert project.label_config_is_not_default is False

        tasks = [
            {
                'data': {'image': 'https://example.com/img1.png'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'polylabel',
                                'to_name': 'image',
                                'type': 'polygonlabels',
                                'value': {'points': [[0, 0], [10, 10]], 'polygonlabels': ['A']},
                            }
                        ]
                    }
                ],
            }
        ]

        url = reverse('data_import:api-projects:project-import', kwargs={'pk': project.id})

        # 1) Default config, commit_to_project=false -> async path, expect 201
        resp = api_client.post(f'{url}?commit_to_project=false', data=tasks, format='json')
        assert resp.status_code in (201, 200)

        # 2) Set matching config, commit_to_project=true -> sync path for community edition
        matching_config = """
            <View>
              <Image name="image" value="$image"/>
              <PolygonLabels name="polylabel" toName="image">
                <Label value="A"/>
              </PolygonLabels>
            </View>
            """
        project.label_config = matching_config
        project.save()

        resp2 = api_client.post(f'{url}?commit_to_project=true', data=tasks, format='json')
        assert resp2.status_code in (201, 200)

        # 3) Set mismatching config, commit_to_project=true -> should fail validation
        mismatching_config = """
            <View>
              <Image name="image" value="$image"/>
              <PolygonLabels name="otherlabel" toName="image">
                <Label value="A"/>
              </PolygonLabels>
            </View>
            """
        project.label_config = mismatching_config
        project.save()

        resp3 = api_client.post(f'{url}?commit_to_project=true', data=tasks, format='json')
        assert resp3.status_code == 400
        data = resp3.json() or {}
        assert ('predictions' in data) or (data.get('detail') == 'Validation error')

    def test_taxonomy_prediction_validation(self):
        """Taxonomy predictions with nested paths should validate using flattened labels subset check."""
        # Create a project with Taxonomy tag and labels covering both paths
        project = ProjectFactory(
            organization=self.organization,
            created_by=self.user,
            label_config=(
                """
                <View>
                  <Text name="text" value="$text"/>
                  <Taxonomy name="taxonomy" toName="text">
                    <Choice value="Eukarya"/>
                    <Choice value="Oppossum"/>
                    <Choice value="Bacteria"/>
                    <Choice value="Archaea"/>
                  </Taxonomy>
                </View>
                """
            ),
        )

        tasks = [
            {
                'data': {'text': 'Taxonomy sample'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'taxonomy',
                                'to_name': 'text',
                                'type': 'taxonomy',
                                'value': {
                                    'taxonomy': [
                                        ['Eukarya'],
                                        ['Eukarya', 'Oppossum'],
                                    ]
                                },
                            }
                        ]
                    }
                ],
            }
        ]

        serializer = ImportApiSerializer(data=tasks, many=True, context={'project': project})
        assert serializer.is_valid()
        # Should not raise due to taxonomy flattening in value label validation
        serializer.save(project_id=project.id)
