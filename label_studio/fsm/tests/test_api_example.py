"""
API usage examples and documentation tests for the declarative transition system.

These tests serve as both validation and comprehensive documentation,
showing how to integrate the transition system with APIs, handle
JSON serialization, generate schemas, and implement real-world patterns.
"""

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from unittest.mock import Mock

import pytest
from django.test import TestCase
from fsm.registry import register_state_transition, transition_registry
from fsm.transition_utils import (
    get_transition_schema,
)
from fsm.transitions import (
    BaseTransition,
    TransitionContext,
    TransitionValidationError,
)
from pydantic import Field, validator


class APIIntegrationExampleTests(TestCase):
    """
    API integration examples demonstrating real-world usage patterns.

    These tests show how to integrate the transition system with
    REST APIs, handle JSON data, validate requests, and format responses.
    """

    def setUp(self):
        from copy import deepcopy

        self.mock_entity = Mock()
        self.mock_entity.pk = 1
        self.mock_entity._meta.model_name = 'task'
        self.mock_entity.organization_id = 100

        self.mock_user = Mock()
        self.mock_user.id = 42
        self.mock_user.username = 'api_user'

        # Save registry state and clear for this test
        self._original_transitions = deepcopy(transition_registry._transitions)
        transition_registry._transitions.clear()

    def tearDown(self):
        # Restore original transition registry to prevent test leakage
        transition_registry._transitions = self._original_transitions

    def test_rest_api_task_assignment_example(self):
        """
        API EXAMPLE: REST endpoint for task assignment

        Shows how to implement a REST API endpoint that uses
        declarative transitions with proper validation and error handling.
        """

        @register_state_transition('task', 'api_assign_task')
        class APITaskAssignmentTransition(BaseTransition):
            """Task assignment via API with comprehensive validation"""

            assignee_id: int = Field(..., description='ID of user to assign task to')
            priority: str = Field('normal', description='Task priority level')
            deadline: Optional[datetime] = Field(None, description='Assignment deadline')
            assignment_notes: str = Field('', description='Notes about the assignment')
            notify_assignee: bool = Field(True, description='Whether to notify the assignee')

            @validator('priority')
            def validate_priority(cls, v):
                valid_priorities = ['low', 'normal', 'high', 'urgent']
                if v not in valid_priorities:
                    raise ValueError(f'Priority must be one of: {valid_priorities}')
                return v

            @validator('deadline')
            def validate_deadline(cls, v):
                if v and v <= datetime.now():
                    raise ValueError('Deadline must be in the future')
                return v

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'ASSIGNED'

            def validate_transition(self, context: TransitionContext) -> bool:
                # Business logic validation
                if context.current_state not in ['CREATED', 'UNASSIGNED']:
                    raise TransitionValidationError(
                        f'Cannot assign task in state: {context.current_state}',
                        {'valid_states': ['CREATED', 'UNASSIGNED']},
                    )

                # Mock user existence check
                if self.assignee_id <= 0:
                    raise TransitionValidationError('Invalid assignee ID', {'assignee_id': self.assignee_id})

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'assignee_id': self.assignee_id,
                    'priority': self.priority,
                    'deadline': self.deadline.isoformat() if self.deadline else None,
                    'assignment_notes': self.assignment_notes,
                    'notify_assignee': self.notify_assignee,
                    'assigned_by_id': context.current_user.id if context.current_user else None,
                    'assigned_at': context.timestamp.isoformat(),
                    'api_version': 'v1',
                }

        # Simulate API request data (JSON from client)
        api_request_data = {
            'assignee_id': 123,
            'priority': 'high',
            'deadline': (datetime.now() + timedelta(days=7)).isoformat(),
            'assignment_notes': 'Critical task requiring immediate attention',
            'notify_assignee': True,
        }

        # API endpoint simulation: Parse and validate JSON
        try:
            # Step 1: Create transition from API data
            transition = APITaskAssignmentTransition(**api_request_data)

            # Step 2: Execute transition
            context = TransitionContext(
                entity=self.mock_entity,
                current_user=self.mock_user,
                current_state='CREATED',
                target_state=transition.get_target_state(),
                request_data=api_request_data,
            )

            # Validate
            assert transition.validate_transition(context)

            # Execute
            result_data = transition.transition(context)

            # Step 3: Format API response
            api_response = {
                'success': True,
                'message': 'Task assigned successfully',
                'data': {
                    'task_id': self.mock_entity.pk,
                    'new_state': transition.get_target_state(),
                    'assignment_details': result_data,
                },
                'timestamp': datetime.now().isoformat(),
            }

            # Validate API response
            assert api_response['success']
            assert api_response['data']['new_state'] == 'ASSIGNED'
            assert api_response['data']['assignment_details']['assignee_id'] == 123
            assert api_response['data']['assignment_details']['priority'] == 'high'

        except ValueError as e:
            # Handle Pydantic validation errors
            api_response = {
                'success': False,
                'error': 'Validation Error',
                'message': str(e),
                'timestamp': datetime.now().isoformat(),
            }

        except TransitionValidationError as e:
            # Handle business logic validation errors
            api_response = {
                'success': False,
                'error': 'Business Rule Violation',
                'message': str(e),
                'context': e.context,
                'timestamp': datetime.now().isoformat(),
            }

        # Test error handling with invalid data
        invalid_request = {
            'assignee_id': -1,  # Invalid ID
            'priority': 'invalid_priority',  # Invalid priority
            'deadline': '2020-01-01T00:00:00',  # Past deadline
        }

        with pytest.raises(ValueError):
            APITaskAssignmentTransition(**invalid_request)

    def test_json_schema_generation_for_api_docs(self):
        """
        API DOCUMENTATION: JSON Schema generation

        Shows how to generate OpenAPI/JSON schemas for API documentation
        from Pydantic transition models.
        """

        @register_state_transition('annotation', 'api_submit_annotation')
        class APIAnnotationSubmissionTransition(BaseTransition):
            """Submit annotation via API with rich metadata"""

            confidence_score: float = Field(
                ..., ge=0.0, le=1.0, description="Annotator's confidence in the annotation (0.0-1.0)"
            )
            annotation_quality: str = Field(
                'good', description='Subjective quality assessment', pattern='^(excellent|good|fair|poor)$'
            )
            time_spent_seconds: int = Field(..., ge=1, description='Time spent on annotation in seconds')
            difficulty_level: str = Field('medium', description='Perceived difficulty of the annotation task')
            review_requested: bool = Field(False, description='Whether the annotator requests manual review')
            tags: List[str] = Field(default_factory=list, description='Optional tags for categorization')
            metadata: Dict[str, Any] = Field(
                default_factory=dict, description='Additional metadata about the annotation process'
            )

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'CREATED'

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'confidence_score': self.confidence_score,
                    'annotation_quality': self.annotation_quality,
                    'time_spent_seconds': self.time_spent_seconds,
                    'difficulty_level': self.difficulty_level,
                    'review_requested': self.review_requested,
                    'tags': self.tags,
                    'metadata': self.metadata,
                    'submitted_at': context.timestamp.isoformat(),
                }

        # Generate JSON schema
        schema = get_transition_schema(APIAnnotationSubmissionTransition)

        # Validate schema structure
        assert 'properties' in schema
        assert 'required' in schema

        # Check specific field schemas
        properties = schema['properties']

        # confidence_score should have min/max constraints
        confidence_schema = properties['confidence_score']
        assert confidence_schema['type'] == 'number'
        assert confidence_schema['minimum'] == 0.0
        assert confidence_schema['maximum'] == 1.0
        assert "Annotator's confidence" in confidence_schema['description']

        # annotation_quality should have pattern constraint
        quality_schema = properties['annotation_quality']
        assert quality_schema['type'] == 'string'
        assert 'pattern' in quality_schema

        # time_spent_seconds should have minimum constraint
        time_schema = properties['time_spent_seconds']
        assert time_schema['type'] == 'integer'
        assert time_schema['minimum'] == 1

        # tags should be array type
        tags_schema = properties['tags']
        assert tags_schema['type'] == 'array'
        assert tags_schema['items']['type'] == 'string'

        # metadata should be object type
        metadata_schema = properties['metadata']
        assert metadata_schema['type'] == 'object'

        # Required fields
        required_fields = schema['required']
        assert 'confidence_score' in required_fields
        assert 'time_spent_seconds' in required_fields
        assert 'tags' not in required_fields  # Optional field

        # Test schema-driven validation
        valid_data = {
            'confidence_score': 0.85,
            'annotation_quality': 'good',
            'time_spent_seconds': 120,
            'difficulty_level': 'hard',
            'review_requested': True,
            'tags': ['important', 'complex'],
            'metadata': {'tool_version': '1.2.3', 'browser': 'chrome'},
        }

        transition = APIAnnotationSubmissionTransition(**valid_data)
        assert transition.confidence_score == 0.85
        assert len(transition.tags) == 2

        # Print schema for documentation (would be used in API docs)
        schema_json = json.dumps(schema, indent=2)
        assert isinstance(schema_json, str)
        assert 'confidence_score' in schema_json

    def test_bulk_operations_api_pattern(self):
        """
        API EXAMPLE: Bulk operations with transitions

        Shows how to handle bulk operations where multiple entities
        need to be transitioned with the same or different parameters.
        """

        @register_state_transition('task', 'bulk_status_update')
        class BulkStatusUpdateTransition(BaseTransition):
            """Bulk status update for multiple tasks"""

            new_status: str = Field(..., description='New status for all tasks')
            update_reason: str = Field(..., description='Reason for bulk update')
            batch_id: str = Field(..., description='Unique identifier for this batch')
            force_update: bool = Field(False, description='Force update even if invalid states')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return self.new_status

            def validate_transition(self, context: TransitionContext) -> bool:
                valid_statuses = ['CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
                if self.new_status not in valid_statuses:
                    raise TransitionValidationError(f'Invalid status: {self.new_status}')

                # Skip state validation if force update
                if not self.force_update:
                    if context.current_state == self.new_status:
                        raise TransitionValidationError('Cannot update to same status')

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'new_status': self.new_status,
                    'update_reason': self.update_reason,
                    'batch_id': self.batch_id,
                    'force_update': self.force_update,
                    'updated_at': context.timestamp.isoformat(),
                    'entity_id': context.entity.pk,
                }

        # Simulate bulk API request
        bulk_request = {
            'task_ids': [1, 2, 3, 4, 5],
            'transition_data': {
                'new_status': 'IN_PROGRESS',
                'update_reason': 'Project phase change',
                'batch_id': 'batch_2024_001',
                'force_update': False,
            },
        }

        # Process bulk request
        batch_results = []
        failed_updates = []

        for task_id in bulk_request['task_ids']:
            # Create mock entity for each task
            mock_task = Mock()
            mock_task.pk = task_id
            mock_task._meta.model_name = 'task'

            try:
                # Create transition
                transition = BulkStatusUpdateTransition(**bulk_request['transition_data'])

                # Mock different current states for testing
                current_states = ['CREATED', 'CREATED', 'IN_PROGRESS', 'CREATED', 'COMPLETED']
                current_state = current_states[task_id - 1]  # Adjust for 0-based indexing

                context = TransitionContext(
                    entity=mock_task,
                    current_user=self.mock_user,
                    current_state=current_state,
                    target_state=transition.get_target_state(),
                )

                # Validate and execute
                if transition.validate_transition(context):
                    result = transition.transition(context)
                    batch_results.append({'task_id': task_id, 'success': True, 'result': result})

            except TransitionValidationError as e:
                failed_updates.append(
                    {'task_id': task_id, 'success': False, 'error': str(e), 'context': getattr(e, 'context', {})}
                )

        # API response for bulk operation
        api_response = {
            'batch_id': bulk_request['transition_data']['batch_id'],
            'total_requested': len(bulk_request['task_ids']),
            'successful_updates': len(batch_results),
            'failed_updates': len(failed_updates),
            'results': batch_results,
            'failures': failed_updates,
            'timestamp': datetime.now().isoformat(),
        }

        # Validate bulk results
        assert api_response['total_requested'] == 5
        assert api_response['successful_updates'] > 0

        # Some tasks should succeed, some might fail due to state validation
        total_processed = api_response['successful_updates'] + api_response['failed_updates']
        assert total_processed == 5

        # Check individual results
        for result in batch_results:
            assert result['success']
            assert result['result']['new_status'] == 'IN_PROGRESS'
            assert result['result']['batch_id'] == 'batch_2024_001'

    def test_webhook_integration_pattern(self):
        """
        API EXAMPLE: Webhook integration with transitions

        Shows how to integrate transitions with webhook systems
        for external notifications and integrations.
        """

        @register_state_transition('task', 'webhook_completion')
        class WebhookTaskCompletionTransition(BaseTransition):
            """Task completion with webhook notifications"""

            completion_quality: float = Field(..., ge=0.0, le=1.0)
            completion_notes: str = Field('', description='Completion notes')
            webhook_urls: List[str] = Field(default_factory=list, description='Webhook URLs to notify')
            notification_data: Dict[str, Any] = Field(default_factory=dict, description='Data to send in webhooks')
            webhook_responses: List[Dict[str, Any]] = Field(
                default_factory=list, description='Webhook response tracking'
            )

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'COMPLETED'

            def validate_transition(self, context: TransitionContext) -> bool:
                if context.current_state != 'IN_PROGRESS':
                    raise TransitionValidationError('Can only complete in-progress tasks')
                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'completion_quality': self.completion_quality,
                    'completion_notes': self.completion_notes,
                    'webhook_urls': self.webhook_urls,
                    'notification_data': self.notification_data,
                    'completed_at': context.timestamp.isoformat(),
                    'completed_by_id': context.current_user.id if context.current_user else None,
                }

            def post_transition_hook(self, context: TransitionContext, state_record) -> None:
                """Send webhook notifications after successful transition"""
                if self.webhook_urls:
                    webhook_payload = {
                        'event': 'task.completed',
                        'task_id': context.entity.pk,
                        'state_record_id': getattr(state_record, 'id', 'mock-id'),
                        'completion_data': {
                            'quality': self.completion_quality,
                            'notes': self.completion_notes,
                            'completed_by': context.current_user.id if context.current_user else None,
                            'completed_at': context.timestamp.isoformat(),
                        },
                        'custom_data': self.notification_data,
                        'timestamp': datetime.now().isoformat(),
                    }

                    # Mock webhook sending (in real implementation, use async requests)
                    for url in self.webhook_urls:
                        webhook_response = {
                            'url': url,
                            'payload': webhook_payload,
                            'status': 'sent',
                            'timestamp': datetime.now().isoformat(),
                        }
                        self.webhook_responses.append(webhook_response)

        # Test webhook transition
        transition = WebhookTaskCompletionTransition(
            completion_quality=0.95,
            completion_notes='Task completed with excellent quality',
            webhook_urls=[
                'https://api.example.com/webhooks/task-completed',
                'https://notifications.example.com/task-events',
            ],
            notification_data={'project_id': 123, 'priority': 'high', 'client_id': 'client_456'},
        )

        context = TransitionContext(
            entity=self.mock_entity,
            current_user=self.mock_user,
            current_state='IN_PROGRESS',
            target_state=transition.get_target_state(),
        )

        # Validate and execute
        assert transition.validate_transition(context)
        transition.transition(context)

        # Simulate state record creation
        mock_state_record = Mock()
        mock_state_record.id = 'state-uuid-123'

        # Execute post-hook (webhook sending)
        transition.post_transition_hook(context, mock_state_record)

        # Validate webhook responses
        assert len(transition.webhook_responses) == 2

        for response in transition.webhook_responses:
            assert 'url' in response
            assert 'payload' in response
            assert response['status'] == 'sent'

            # Validate webhook payload structure
            payload = response['payload']
            assert payload['event'] == 'task.completed'
            assert payload['task_id'] == self.mock_entity.pk
            assert payload['completion_data']['quality'] == 0.95
            assert payload['custom_data']['project_id'] == 123

    def test_api_error_handling_patterns(self):
        """
        API EXAMPLE: Comprehensive error handling patterns

        Shows how to implement robust error handling for API endpoints
        using the transition system with proper HTTP status codes and messages.
        """

        @register_state_transition('task', 'api_critical_update')
        class APICriticalUpdateTransition(BaseTransition):
            """Critical update with extensive validation"""

            update_type: str = Field(..., description='Type of critical update')
            severity_level: int = Field(..., ge=1, le=5, description='Severity level 1-5')
            authorization_token: str = Field(..., description='Authorization token for critical updates')
            backup_required: bool = Field(True, description='Whether backup is required before update')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'CRITICALLY_UPDATED'

            def validate_transition(self, context: TransitionContext) -> bool:
                errors = []

                # Authorization check
                if len(self.authorization_token) < 10:
                    errors.append('Invalid authorization token')

                # Severity validation
                if self.severity_level >= 4 and not context.current_user:
                    errors.append('High severity updates require authenticated user')

                # Update type validation
                valid_types = ['security_patch', 'critical_fix', 'emergency_update']
                if self.update_type not in valid_types:
                    errors.append(f'Invalid update type. Must be one of: {valid_types}')

                # State validation
                if context.current_state in ['COMPLETED', 'ARCHIVED']:
                    errors.append(f'Cannot perform critical updates on {context.current_state.lower()} tasks')

                # Backup requirement
                if self.backup_required and self.severity_level >= 3:
                    # Mock backup check
                    backup_exists = True  # In real implementation, check backup system
                    if not backup_exists:
                        errors.append('Backup required but not available')

                if errors:
                    raise TransitionValidationError(
                        'Critical update validation failed',
                        {
                            'validation_errors': errors,
                            'error_count': len(errors),
                            'severity_level': self.severity_level,
                            'update_type': self.update_type,
                        },
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'update_type': self.update_type,
                    'severity_level': self.severity_level,
                    'backup_required': self.backup_required,
                    'authorized_by': context.current_user.id if context.current_user else None,
                    'updated_at': context.timestamp.isoformat(),
                    'critical_update_id': f'crit_{int(context.timestamp.timestamp())}',
                }

        # Test various error scenarios and API responses

        # 1. Test successful request
        valid_request = {
            'update_type': 'security_patch',
            'severity_level': 3,
            'authorization_token': 'valid_token_12345',
            'backup_required': True,
        }

        def simulate_api_endpoint(request_data, current_state='IN_PROGRESS'):
            """Simulate API endpoint with proper error handling"""
            try:
                # Parse and validate request
                transition = APICriticalUpdateTransition(**request_data)

                # Create context
                context = TransitionContext(
                    entity=self.mock_entity,
                    current_user=self.mock_user,
                    current_state=current_state,
                    target_state=transition.get_target_state(),
                )

                # Validate business logic
                transition.validate_transition(context)

                # Execute transition
                result = transition.transition(context)

                return {
                    'status_code': 200,
                    'success': True,
                    'data': {
                        'task_id': self.mock_entity.pk,
                        'new_state': transition.get_target_state(),
                        'update_details': result,
                    },
                }

            except ValueError as e:
                # Pydantic validation error (400 Bad Request)
                return {
                    'status_code': 400,
                    'success': False,
                    'error': 'Bad Request',
                    'message': 'Invalid request data',
                    'details': str(e),
                }

            except TransitionValidationError as e:
                # Business logic validation error (422 Unprocessable Entity)
                return {
                    'status_code': 422,
                    'success': False,
                    'error': 'Validation Failed',
                    'message': str(e),
                    'validation_errors': e.context.get('validation_errors', []),
                    'context': e.context,
                }

            except Exception as e:
                # Unexpected error (500 Internal Server Error)
                return {
                    'status_code': 500,
                    'success': False,
                    'error': 'Internal Server Error',
                    'message': 'An unexpected error occurred',
                    'details': str(e) if not isinstance(e, Exception) else 'Server error',
                }

        # Test successful request
        response = simulate_api_endpoint(valid_request)
        assert response['status_code'] == 200
        assert response['success']
        assert 'update_details' in response['data']

        # Test Pydantic validation error (invalid severity level)
        invalid_request = {
            'update_type': 'security_patch',
            'severity_level': 10,  # Invalid: > 5
            'authorization_token': 'valid_token_12345',
        }

        response = simulate_api_endpoint(invalid_request)
        assert response['status_code'] == 400
        assert not response['success']
        assert response['error'] == 'Bad Request'

        # Test business logic validation error
        business_logic_error_request = {
            'update_type': 'invalid_type',  # Invalid update type
            'severity_level': 5,
            'authorization_token': 'short',  # Too short
            'backup_required': True,
        }

        response = simulate_api_endpoint(business_logic_error_request)
        assert response['status_code'] == 422
        assert not response['success']
        assert response['error'] == 'Validation Failed'
        assert 'validation_errors' in response
        assert len(response['validation_errors']) > 0

        # Test state validation error
        response = simulate_api_endpoint(valid_request, current_state='COMPLETED')
        assert response['status_code'] == 422
        # The error message is in validation_errors list, not the main message
        validation_errors = response.get('validation_errors', [])
        assert any('completed tasks' in error for error in validation_errors)

    def test_api_versioning_and_backward_compatibility(self):
        """
        API EXAMPLE: API versioning with backward compatibility

        Shows how to handle API versioning using transition inheritance
        and maintain backward compatibility.
        """

        # Version 1 API
        @register_state_transition('task', 'update_task_v1')
        class UpdateTaskV1Transition(BaseTransition):
            """Version 1 task update API"""

            status: str = Field(..., description='New task status')
            notes: str = Field('', description='Update notes')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return self.status

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'status': self.status,
                    'notes': self.notes,
                    'api_version': 'v1',
                    'updated_at': context.timestamp.isoformat(),
                }

        # Version 2 API with additional features
        @register_state_transition('task', 'update_task_v2')
        class UpdateTaskV2Transition(UpdateTaskV1Transition):
            """Version 2 task update API with enhanced features"""

            priority: Optional[str] = Field(None, description='Task priority')
            tags: List[str] = Field(default_factory=list, description='Task tags')
            estimated_hours: Optional[float] = Field(None, ge=0, description='Estimated hours')
            metadata: Dict[str, Any] = Field(default_factory=dict, description='Additional metadata')

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                # Call parent method for base functionality
                base_data = super().transition(context)

                # Add V2 specific data
                v2_data = {
                    'priority': self.priority,
                    'tags': self.tags,
                    'estimated_hours': self.estimated_hours,
                    'metadata': self.metadata,
                    'api_version': 'v2',
                }

                return {**base_data, **v2_data}

        # Test V1 API (backward compatibility)
        v1_request = {'status': 'IN_PROGRESS', 'notes': 'Started working on task'}

        v1_transition = UpdateTaskV1Transition(**v1_request)
        context = TransitionContext(
            entity=self.mock_entity, current_state='CREATED', target_state=v1_transition.get_target_state()
        )

        v1_result = v1_transition.transition(context)
        assert v1_result['api_version'] == 'v1'
        assert v1_result['status'] == 'IN_PROGRESS'
        assert 'priority' not in v1_result  # V1 doesn't have priority

        # Test V2 API with enhanced features
        v2_request = {
            'status': 'IN_PROGRESS',
            'notes': 'Started working on task with enhanced tracking',
            'priority': 'high',
            'tags': ['urgent', 'client-facing'],
            'estimated_hours': 4.5,
            'metadata': {'client_id': 123, 'project_phase': 'development'},
        }

        v2_transition = UpdateTaskV2Transition(**v2_request)
        v2_result = v2_transition.transition(context)

        assert v2_result['api_version'] == 'v2'
        assert v2_result['status'] == 'IN_PROGRESS'  # Inherited from V1
        assert v2_result['priority'] == 'high'  # V2 feature
        assert len(v2_result['tags']) == 2  # V2 feature
        assert v2_result['estimated_hours'] == 4.5  # V2 feature
        assert 'client_id' in v2_result['metadata']  # V2 feature

        # Test V2 API with minimal data (backward compatible)
        v2_minimal_request = {'status': 'COMPLETED', 'notes': 'Task finished'}

        v2_minimal_transition = UpdateTaskV2Transition(**v2_minimal_request)
        v2_minimal_result = v2_minimal_transition.transition(context)

        assert v2_minimal_result['api_version'] == 'v2'
        assert v2_minimal_result['status'] == 'COMPLETED'
        assert v2_minimal_result['priority'] is None  # Optional field
        assert v2_minimal_result['tags'] == []  # Default value
        assert v2_minimal_result['estimated_hours'] is None  # Optional field
        assert v2_minimal_result['metadata'] == {}  # Default value
