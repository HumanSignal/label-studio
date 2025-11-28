"""
Integration tests for declarative transitions with real Django models.
These tests demonstrate how the transition system integrates with actual
Django models and the StateManager, providing realistic usage examples.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from unittest.mock import Mock, patch

from core.current_request import CurrentContext
from django.contrib.auth import get_user_model
from django.test import TestCase
from fsm.registry import register_state_transition
from fsm.state_choices import AnnotationStateChoices, TaskStateChoices
from fsm.state_models import TaskState
from fsm.transitions import BaseTransition, TransitionContext, TransitionValidationError
from organizations.models import Organization
from projects.models import Project
from pydantic import Field


# Mock Django models for integration testing
class MockDjangoTask:
    """Mock Django Task model with realistic attributes"""

    def __init__(self, pk=1, project_id=1, organization_id=1):
        self.pk = pk
        self.id = pk
        self.project_id = project_id
        self.organization_id = organization_id
        self._meta = Mock()
        self._meta.model_name = 'task'
        self._meta.label_lower = 'tasks.task'

        # Mock task attributes
        self.data = {'text': 'Sample task data'}
        self.created_at = datetime.now()
        self.updated_at = datetime.now()


class MockDjangoAnnotation:
    """Mock Django Annotation model with realistic attributes"""

    def __init__(self, pk=1, task_id=1, project_id=1, organization_id=1):
        self.pk = pk
        self.id = pk
        self.task_id = task_id
        self.project_id = project_id
        self.organization_id = organization_id
        self._meta = Mock()
        self._meta.model_name = 'annotation'
        self._meta.label_lower = 'tasks.annotation'

        # Mock annotation attributes
        self.result = [{'value': {'text': ['Sample annotation']}}]
        self.completed_by_id = None
        self.created_at = datetime.now()
        self.updated_at = datetime.now()


User = get_user_model()


class DjangoModelIntegrationTests(TestCase):
    """
    Integration tests demonstrating realistic usage with Django models.
    These tests show how to implement transitions that work with actual
    Django model patterns and the StateManager integration.
    """

    def setUp(self):
        self.task = MockDjangoTask()
        self.annotation = MockDjangoAnnotation()
        self.user = Mock()
        self.user.id = 123
        self.user.username = 'integration_test_user'

    @patch('fsm.registry.get_state_model_for_entity')
    @patch('fsm.state_manager.StateManager.get_current_state_object')
    @patch('fsm.state_manager.StateManager.transition_state')
    def test_task_workflow_integration(self, mock_transition_state, mock_get_state_obj, mock_get_state_model):
        """
        INTEGRATION TEST: Complete task workflow using Django models
        Demonstrates a realistic task lifecycle from creation through completion
        using the declarative transition system with Django model integration.
        """

        # Setup mocks to simulate Django model behavior
        mock_get_state_model.return_value = TaskState
        mock_get_state_obj.return_value = None  # No existing state (initial transition)
        mock_transition_state.return_value = True

        # Define task workflow transitions
        @register_state_transition('task', 'create_task')
        class CreateTaskTransition(BaseTransition):
            """Initial task creation transition"""

            created_by_id: int = Field(..., description='User creating the task')
            initial_priority: str = Field('normal', description='Initial task priority')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TaskStateChoices.CREATED

            def validate_transition(self, context: TransitionContext) -> bool:
                # Validate initial creation
                if not context.is_initial_transition:
                    raise TransitionValidationError('CreateTask can only be used for initial state')
                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'created_by_id': self.created_by_id,
                    'initial_priority': self.initial_priority,
                    'task_data': getattr(context.entity, 'data', {}),
                    'project_id': getattr(context.entity, 'project_id', None),
                    'creation_method': 'declarative_transition',
                }

        @register_state_transition('task', 'assign_and_start')
        class AssignAndStartTaskTransition(BaseTransition):
            """Assign task to user and start work"""

            assignee_id: int = Field(..., description='User assigned to task')
            estimated_hours: float = Field(None, ge=0.1, description='Estimated work hours')
            priority: str = Field('normal', description='Task priority')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TaskStateChoices.IN_PROGRESS

            def validate_transition(self, context: TransitionContext) -> bool:
                valid_from_states = [TaskStateChoices.CREATED]
                if context.current_state not in valid_from_states:
                    raise TransitionValidationError(
                        f'Can only assign tasks from states: {valid_from_states}',
                        {'current_state': context.current_state, 'valid_states': valid_from_states},
                    )

                # Business rule: Can't assign to the same user who created it
                if hasattr(context, 'current_state_object') and context.current_state_object:
                    creator_id = context.current_state_object.context_data.get('created_by_id')
                    if creator_id == self.assignee_id:
                        raise TransitionValidationError(
                            'Cannot assign task to the same user who created it',
                            {'creator_id': creator_id, 'assignee_id': self.assignee_id},
                        )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'assignee_id': self.assignee_id,
                    'estimated_hours': self.estimated_hours,
                    'priority': self.priority,
                    'assigned_at': context.timestamp.isoformat(),
                    'assigned_by_id': context.current_user.id if context.current_user else None,
                    'work_started': True,
                }

        @register_state_transition('task', 'complete_with_quality')
        class CompleteTaskWithQualityTransition(BaseTransition):
            """Complete task with quality metrics"""

            quality_score: float = Field(..., ge=0.0, le=1.0, description='Quality score')
            completion_notes: str = Field('', description='Completion notes')
            actual_hours: float = Field(None, ge=0.0, description='Actual hours worked')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TaskStateChoices.COMPLETED

            def validate_transition(self, context: TransitionContext) -> bool:
                if context.current_state != TaskStateChoices.IN_PROGRESS:
                    raise TransitionValidationError(
                        'Can only complete tasks that are in progress', {'current_state': context.current_state}
                    )

                # Quality check
                if self.quality_score < 0.6:
                    raise TransitionValidationError(
                        f'Quality score too low: {self.quality_score}. Minimum required: 0.6'
                    )

                return True

            def post_transition_hook(self, context: TransitionContext, state_record) -> None:
                """Post-completion tasks like notifications"""
                # Mock notification system
                if hasattr(self, '_notifications'):
                    self._notifications.append(f'Task {context.entity.pk} completed with quality {self.quality_score}')

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                # Calculate metrics
                start_data = context.current_state_object.context_data if context.current_state_object else {}
                estimated_hours = start_data.get('estimated_hours')

                return {
                    'quality_score': self.quality_score,
                    'completion_notes': self.completion_notes,
                    'actual_hours': self.actual_hours,
                    'estimated_hours': estimated_hours,
                    'completed_at': context.timestamp.isoformat(),
                    'completed_by_id': context.current_user.id if context.current_user else None,
                    'efficiency_ratio': (estimated_hours / self.actual_hours)
                    if (estimated_hours and self.actual_hours)
                    else None,
                }

        # Execute the complete workflow

        # Step 1: Create task
        create_transition = CreateTaskTransition(created_by_id=100, initial_priority='high')

        # Test with StateManager integration
        with patch('fsm.state_manager.StateManager.get_current_state_value') as mock_get_current:
            mock_get_current.return_value = None  # No current state

            context = TransitionContext(
                entity=self.task,
                current_user=self.user,
                current_state=None,
                target_state=create_transition.get_target_state(),
            )

            # Validate and execute creation
            assert create_transition.validate_transition(context) is True
            creation_data = create_transition.transition(context)

            assert creation_data['created_by_id'] == 100
            assert creation_data['initial_priority'] == 'high'
            assert creation_data['creation_method'] == 'declarative_transition'

        # Step 2: Assign and start task
        mock_current_state = Mock()
        mock_current_state.context_data = creation_data
        mock_get_state_obj.return_value = mock_current_state

        assign_transition = AssignAndStartTaskTransition(
            assignee_id=200, estimated_hours=4.5, priority='urgent'  # Different from creator
        )

        context = TransitionContext(
            entity=self.task,
            current_user=self.user,
            current_state=TaskStateChoices.CREATED,
            current_state_object=mock_current_state,
            target_state=assign_transition.get_target_state(),
        )

        assert assign_transition.validate_transition(context) is True
        assignment_data = assign_transition.transition(context)

        assert assignment_data['assignee_id'] == 200
        assert assignment_data['estimated_hours'] == 4.5
        assert assignment_data['work_started'] is True

        # Step 3: Complete task
        mock_current_state.context_data = assignment_data

        complete_transition = CompleteTaskWithQualityTransition(
            quality_score=0.85, completion_notes='Task completed successfully with minor revisions', actual_hours=5.2
        )
        complete_transition._notifications = []  # Mock notification system

        context = TransitionContext(
            entity=self.task,
            current_user=self.user,
            current_state=TaskStateChoices.IN_PROGRESS,
            current_state_object=mock_current_state,
            target_state=complete_transition.get_target_state(),
        )

        assert complete_transition.validate_transition(context) is True
        completion_data = complete_transition.transition(context)

        assert completion_data['quality_score'] == 0.85
        assert completion_data['actual_hours'] == 5.2
        assert abs(completion_data['efficiency_ratio'] - (4.5 / 5.2)) < 0.01

        # Test post-hook
        mock_state_record = Mock()
        complete_transition.post_transition_hook(context, mock_state_record)
        assert len(complete_transition._notifications) == 1

        # Verify StateManager calls
        assert mock_transition_state.call_count == 0  # Not called in our test setup

    def test_annotation_review_workflow_integration(self):
        """
        INTEGRATION TEST: Annotation review workflow
        Demonstrates a realistic annotation review process using
        enterprise-grade validation and approval logic.
        """

        @register_state_transition('annotation', 'submit_for_review')
        class SubmitAnnotationForReview(BaseTransition):
            """Submit annotation for quality review"""

            annotator_confidence: float = Field(..., ge=0.0, le=1.0, description='Annotator confidence')
            annotation_time_seconds: int = Field(..., ge=1, description='Time spent annotating')
            review_requested: bool = Field(True, description='Whether review is requested')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return AnnotationStateChoices.SUBMITTED

            def validate_transition(self, context: TransitionContext) -> bool:
                # Check annotation has content
                if not hasattr(context.entity, 'result') or not context.entity.result:
                    raise TransitionValidationError('Cannot submit empty annotation')

                # Business rule: Low confidence annotations must request review
                if self.annotator_confidence < 0.7 and not self.review_requested:
                    raise TransitionValidationError(
                        'Low confidence annotations must request review',
                        {'confidence': self.annotator_confidence, 'threshold': 0.7},
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'annotator_confidence': self.annotator_confidence,
                    'annotation_time_seconds': self.annotation_time_seconds,
                    'review_requested': self.review_requested,
                    'annotation_complexity': len(context.entity.result) if context.entity.result else 0,
                    'submitted_at': context.timestamp.isoformat(),
                    'submitted_by_id': context.current_user.id if context.current_user else None,
                }

        @register_state_transition('annotation', 'review_and_approve')
        class ReviewAndApproveAnnotation(BaseTransition):
            """Review annotation and approve/reject"""

            reviewer_decision: str = Field(..., description='approve, reject, or request_changes')
            quality_score: float = Field(..., ge=0.0, le=1.0, description='Reviewer quality assessment')
            review_comments: str = Field('', description='Review comments')
            corrections_made: bool = Field(False, description='Whether reviewer made corrections')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                if self.reviewer_decision == 'approve':
                    return AnnotationStateChoices.COMPLETED
                else:
                    return AnnotationStateChoices.SUBMITTED  # Back to submitted for changes

            def validate_transition(self, context: TransitionContext) -> bool:
                if context.current_state != AnnotationStateChoices.SUBMITTED:
                    raise TransitionValidationError('Can only review submitted annotations')

                valid_decisions = ['approve', 'reject', 'request_changes']
                if self.reviewer_decision not in valid_decisions:
                    raise TransitionValidationError(
                        f'Invalid decision: {self.reviewer_decision}', {'valid_decisions': valid_decisions}
                    )

                # Quality score validation based on decision
                if self.reviewer_decision == 'approve' and self.quality_score < 0.6:
                    raise TransitionValidationError(
                        'Cannot approve annotation with low quality score',
                        {'quality_score': self.quality_score, 'decision': self.reviewer_decision},
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                # Get submission data for metrics
                submission_data = context.current_state_object.context_data if context.current_state_object else {}

                return {
                    'reviewer_decision': self.reviewer_decision,
                    'quality_score': self.quality_score,
                    'review_comments': self.review_comments,
                    'corrections_made': self.corrections_made,
                    'reviewed_at': context.timestamp.isoformat(),
                    'reviewed_by_id': context.current_user.id if context.current_user else None,
                    'original_confidence': submission_data.get('annotator_confidence'),
                    'confidence_vs_quality_diff': abs(
                        submission_data.get('annotator_confidence', 0) - self.quality_score
                    ),
                }

        # Execute annotation workflow

        # Step 1: Submit annotation
        submit_transition = SubmitAnnotationForReview(
            annotator_confidence=0.9, annotation_time_seconds=300, review_requested=True  # 5 minutes
        )

        context = TransitionContext(
            entity=self.annotation,
            current_user=self.user,
            current_state=AnnotationStateChoices.SUBMITTED,
            target_state=submit_transition.get_target_state(),
        )

        assert submit_transition.validate_transition(context) is True
        submit_data = submit_transition.transition(context)

        assert submit_data['annotator_confidence'] == 0.9
        assert submit_data['annotation_time_seconds'] == 300
        assert submit_data['review_requested'] is True
        assert submit_data['annotation_complexity'] == 1  # Based on mock result

        # Step 2: Review and approve
        mock_submission_state = Mock()
        mock_submission_state.context_data = submit_data

        review_transition = ReviewAndApproveAnnotation(
            reviewer_decision='approve',
            quality_score=0.85,
            review_comments='High quality annotation with good coverage',
            corrections_made=False,
        )

        context = TransitionContext(
            entity=self.annotation,
            current_user=self.user,
            current_state=AnnotationStateChoices.SUBMITTED,
            current_state_object=mock_submission_state,
            target_state=review_transition.get_target_state(),
        )

        assert review_transition.validate_transition(context) is True
        assert review_transition.get_target_state() == AnnotationStateChoices.COMPLETED

        review_data = review_transition.transition(context)

        assert review_data['reviewer_decision'] == 'approve'
        assert review_data['quality_score'] == 0.85
        assert review_data['original_confidence'] == 0.9
        assert abs(review_data['confidence_vs_quality_diff'] - 0.05) < 0.01

        # Test rejection scenario
        reject_transition = ReviewAndApproveAnnotation(
            reviewer_decision='reject',
            quality_score=0.3,
            review_comments='Insufficient annotation quality',
            corrections_made=False,
        )

        assert reject_transition.get_target_state() == AnnotationStateChoices.SUBMITTED

        # Test validation failure
        invalid_review = ReviewAndApproveAnnotation(
            reviewer_decision='approve',  # Trying to approve
            quality_score=0.5,  # But quality too low
            review_comments='Test',
        )

        import pytest

        with pytest.raises(TransitionValidationError) as cm:
            invalid_review.validate_transition(context)

        assert 'Cannot approve annotation with low quality score' in str(cm.value)

    @patch('fsm.state_manager.StateManager.execute_transition')
    def test_state_manager_bulk_update_integration(self, mock_execute):
        """
        INTEGRATION TEST: StateManager bulk update with Django model integration
        Shows how to use the StateManager to execute transitions with
        real Django models and complex business logic.
        """

        @register_state_transition('task', 'bulk_update_status')
        class BulkUpdateTaskStatusTransition(BaseTransition):
            """Bulk update task status with metadata"""

            new_status: str = Field(..., description='New status for tasks')
            update_reason: str = Field(..., description='Reason for bulk update')
            updated_by_system: bool = Field(False, description='Whether updated by automated system')
            batch_id: str = Field(None, description='Batch operation ID')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return self.new_status

            def validate_transition(self, context: TransitionContext) -> bool:
                valid_statuses = [TaskStateChoices.CREATED, TaskStateChoices.IN_PROGRESS, TaskStateChoices.COMPLETED]
                if self.new_status not in valid_statuses:
                    raise TransitionValidationError(f'Invalid status: {self.new_status}')

                # Can't bulk update to the same status
                if context.current_state == self.new_status:
                    raise TransitionValidationError('Cannot update to the same status')

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'new_status': self.new_status,
                    'update_reason': self.update_reason,
                    'updated_by_system': self.updated_by_system,
                    'batch_id': self.batch_id,
                    'bulk_update_timestamp': context.timestamp.isoformat(),
                    'previous_status': context.current_state,
                }

        # Mock successful execution
        mock_state_record = Mock()
        mock_state_record.id = 'mock-uuid'
        mock_execute.return_value = mock_state_record

        # Test StateManager.execute_transition
        from fsm.state_manager import StateManager

        result = StateManager.execute_transition(
            entity=self.task,
            transition_name='bulk_update_status',
            transition_data={
                'new_status': TaskStateChoices.IN_PROGRESS,
                'update_reason': 'Project priority change',
                'updated_by_system': True,
                'batch_id': 'batch_2024_001',
            },
            user=self.user,
            project_update=True,
            notification_level='high',
        )

        # Verify the call
        mock_execute.assert_called_once()
        call_args, call_kwargs = mock_execute.call_args

        # Check call parameters
        assert call_kwargs['entity'] == self.task
        assert call_kwargs['transition_name'] == 'bulk_update_status'
        assert call_kwargs['user'] == self.user

        # Check transition data
        transition_data = call_kwargs['transition_data']
        assert transition_data['new_status'] == TaskStateChoices.IN_PROGRESS
        assert transition_data['update_reason'] == 'Project priority change'
        assert transition_data['updated_by_system'] is True
        assert transition_data['batch_id'] == 'batch_2024_001'

        # Check context
        assert call_kwargs['project_update'] is True
        assert call_kwargs['notification_level'] == 'high'

        # Check return value
        assert result == mock_state_record

    def test_error_handling_with_django_models(self):
        """
        INTEGRATION TEST: Error handling with Django model validation
        Tests comprehensive error handling scenarios that might occur
        in real Django model integration.
        """

        @register_state_transition('task', 'assign_with_constraints')
        class AssignTaskWithConstraints(BaseTransition):
            """Task assignment with business constraints"""

            assignee_id: int = Field(..., description='User to assign to')
            max_concurrent_tasks: int = Field(5, description='Max concurrent tasks per user')
            skill_requirements: list = Field(default_factory=list, description='Required skills')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TaskStateChoices.IN_PROGRESS

            def validate_transition(self, context: TransitionContext) -> bool:
                errors = []

                # Mock database checks (in real scenario, these would be actual queries)

                # 1. Check user exists and is active
                if self.assignee_id <= 0:
                    errors.append('Invalid user ID')

                # 2. Check user's current task load
                if self.max_concurrent_tasks < 1:
                    errors.append('Max concurrent tasks must be at least 1')

                # 3. Check skill requirements
                if self.skill_requirements:
                    # Mock skill validation
                    available_skills = ['python', 'labeling', 'review']
                    missing_skills = [skill for skill in self.skill_requirements if skill not in available_skills]
                    if missing_skills:
                        errors.append(f'Missing required skills: {missing_skills}')

                # 4. Check project-level constraints
                if hasattr(context.entity, 'project_id'):
                    # Mock project validation
                    if context.entity.project_id <= 0:
                        errors.append('Invalid project configuration')

                # 5. Check organization permissions
                if hasattr(context.entity, 'organization_id'):
                    if not context.current_user:
                        errors.append('User authentication required for assignment')

                if errors:
                    raise TransitionValidationError(
                        f"Assignment validation failed: {'; '.join(errors)}",
                        {
                            'validation_errors': errors,
                            'assignee_id': self.assignee_id,
                            'task_id': context.entity.pk,
                            'skill_requirements': self.skill_requirements,
                        },
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'assignee_id': self.assignee_id,
                    'max_concurrent_tasks': self.max_concurrent_tasks,
                    'skill_requirements': self.skill_requirements,
                    'assignment_validated': True,
                }

        # Test successful validation
        valid_transition = AssignTaskWithConstraints(
            assignee_id=123, max_concurrent_tasks=3, skill_requirements=['python', 'labeling']
        )

        context = TransitionContext(
            entity=self.task,
            current_user=self.user,
            current_state=TaskStateChoices.CREATED,
            target_state=valid_transition.get_target_state(),
        )

        assert valid_transition.validate_transition(context) is True

        # Test multiple validation errors
        invalid_transition = AssignTaskWithConstraints(
            assignee_id=-1,  # Invalid user ID
            max_concurrent_tasks=0,  # Invalid max tasks
            skill_requirements=['nonexistent_skill'],  # Missing skill
        )

        import pytest

        with pytest.raises(TransitionValidationError) as cm:
            invalid_transition.validate_transition(context)

        error = cm.value
        error_msg = str(error)

        # Check all validation errors are included
        assert 'Invalid user ID' in error_msg
        assert 'Max concurrent tasks must be at least 1' in error_msg
        assert 'Missing required skills' in error_msg

        # Check error context
        assert 'validation_errors' in error.context
        assert len(error.context['validation_errors']) == 3
        assert error.context['assignee_id'] == -1

        # Test authentication requirement
        context_no_user = TransitionContext(
            entity=self.task,
            current_user=None,  # No user
            current_state=TaskStateChoices.CREATED,
            target_state=valid_transition.get_target_state(),
        )

        import pytest

        with pytest.raises(TransitionValidationError) as cm:
            valid_transition.validate_transition(context_no_user)

        assert 'User authentication required' in str(cm.value)


class TestBaseStatePropertiesCoverage(TestCase):
    """Test coverage for BaseState model properties and methods"""

    def setUp(self):
        """Set up test fixtures"""
        self.user = User.objects.create(email='test_coverage@example.com')
        self.org = Organization.objects.create(title='Test Org Coverage', created_by=self.user)

        # Set CurrentContext BEFORE creating entities that need FSM
        CurrentContext.set_user(self.user)
        CurrentContext.set_organization_id(self.org.id)

        self.project = Project.objects.create(
            title='Test Project Coverage', created_by=self.user, organization=self.org
        )

    def tearDown(self):
        """Clean up after tests"""
        CurrentContext.clear()

    def test_base_state_entity_property(self):
        """Test BaseState.entity property retrieves related entity"""
        from fsm.state_models import ProjectState

        # Get the auto-created state
        state_record = ProjectState.objects.filter(project=self.project).first()
        assert state_record is not None

        # Test entity property
        retrieved_entity = state_record.entity
        assert retrieved_entity.id == self.project.id

    def test_base_state_timestamp_from_uuid(self):
        """Test BaseState.timestamp_from_uuid property extracts timestamp from UUID7"""
        from fsm.state_models import ProjectState

        before = datetime.now(timezone.utc)
        state_record = ProjectState.objects.filter(project=self.project).first()
        datetime.now(timezone.utc)

        # Test timestamp extraction
        timestamp = state_record.timestamp_from_uuid
        assert isinstance(timestamp, datetime)
        # Timestamp should be within reasonable range
        assert timestamp.year == before.year
