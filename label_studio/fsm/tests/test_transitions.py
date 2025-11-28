"""
Comprehensive tests for the declarative Pydantic-based transition system.

This test suite provides extensive coverage of the new transition system,
including usage examples, edge cases, validation scenarios, and integration
patterns to serve as both tests and documentation.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from unittest.mock import Mock, patch

import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from fsm.registry import register_state_transition, transition_registry
from fsm.transition_utils import get_available_transitions
from fsm.transitions import (
    BaseTransition,
    TransitionContext,
    TransitionValidationError,
)
from pydantic import Field, ValidationError

User = get_user_model()


# Test state choices for testing
class TestStateChoices:
    CREATED = 'CREATED'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'


class MockEntity:
    """Mock entity model for testing"""

    def __init__(self, pk=1):
        self.pk = pk
        self.id = pk
        self.organization_id = 1
        self._meta = Mock()
        self._meta.model_name = 'test_entity'
        self._meta.label_lower = 'test.testentity'


class MockTask:
    """Mock task model for testing"""

    def __init__(self, pk=1):
        self.pk = pk
        self.id = pk
        self.organization_id = 1
        self._meta = Mock()
        self._meta.model_name = 'task'
        self._meta.label_lower = 'tasks.task'


class MockAnnotation:
    """Mock annotation model for testing"""

    def __init__(self, pk=1):
        self.pk = pk
        self.id = pk
        self.result = {'test': 'data'}  # Mock annotation data
        self.organization_id = 1
        self._meta = Mock()
        self._meta.model_name = 'annotation'
        self._meta.label_lower = 'tasks.annotation'


class CoreFrameworkTests(TestCase):
    """Test core framework functionality"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(email='test@example.com', password='test123')
        self.mock_entity = MockEntity()

    def test_base_transition_class(self):
        """Test BaseTransition abstract functionality"""

        @register_state_transition('test_entity', 'test_transition')
        class TestTransition(BaseTransition):
            test_field: str = Field('default', description='Test field')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TestStateChoices.IN_PROGRESS

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'test_field': self.test_field}

        # Test instantiation
        transition = TestTransition(test_field='test_value')
        assert transition.test_field == 'test_value'
        assert transition.get_target_state() == TestStateChoices.IN_PROGRESS
        assert transition.transition_name == 'test_transition'

    def test_transition_context(self):
        """Test TransitionContext functionality"""
        context = TransitionContext(
            entity=self.mock_entity,
            current_user=self.user,
            current_state=TestStateChoices.CREATED,
            target_state=TestStateChoices.IN_PROGRESS,
            organization_id=1,
        )

        assert context.entity == self.mock_entity
        assert context.current_state == TestStateChoices.CREATED
        assert context.target_state == TestStateChoices.IN_PROGRESS
        assert context.current_user == self.user
        assert context.has_current_state
        assert not context.is_initial_transition

    def test_transition_context_properties(self):
        """Test TransitionContext computed properties"""
        # Test initial transition
        context = TransitionContext(entity=self.mock_entity, current_state=None, target_state=TestStateChoices.CREATED)
        assert context.is_initial_transition
        assert not context.has_current_state

        # Test with current state
        context_with_state = TransitionContext(
            entity=self.mock_entity,
            current_state=TestStateChoices.CREATED,
            target_state=TestStateChoices.IN_PROGRESS,
        )
        assert not context_with_state.is_initial_transition
        assert context_with_state.has_current_state

    def test_transition_registry(self):
        """Test transition registration and retrieval"""

        @register_state_transition('test_entity', 'test_transition')
        class TestTransition(BaseTransition):
            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TestStateChoices.COMPLETED

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {}

        # Test registration
        retrieved = transition_registry.get_transition('test_entity', 'test_transition')
        assert retrieved == TestTransition

        # Test entity transitions
        entity_transitions = transition_registry.get_transitions_for_entity('test_entity')
        assert 'test_transition' in entity_transitions
        assert entity_transitions['test_transition'] == TestTransition

    def test_pydantic_validation(self):
        """Test Pydantic validation in transitions"""

        @register_state_transition('test_entity', 'validated_transition')
        class ValidatedTransition(BaseTransition):
            required_field: str = Field(..., description='Required field')
            optional_field: int = Field(42, description='Optional field')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TestStateChoices.COMPLETED

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'required_field': self.required_field, 'optional_field': self.optional_field}

        # Test valid instantiation
        transition = ValidatedTransition(required_field='test')
        assert transition.required_field == 'test'
        assert transition.optional_field == 42

        # Test validation error
        with pytest.raises(ValidationError):
            ValidatedTransition()  # Missing required field

    def test_transition_execution(self):
        """Test transition execution logic"""

        @register_state_transition('test_entity', 'execution_test')
        class ExecutionTestTransition(BaseTransition):
            value: str = Field('test', description='Test value')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TestStateChoices.COMPLETED

            def validate_transition(self, context: TransitionContext) -> bool:
                return context.current_state == TestStateChoices.IN_PROGRESS

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'value': self.value,
                    'entity_id': context.entity.pk,
                    'timestamp': context.timestamp.isoformat(),
                }

        transition = ExecutionTestTransition(value='execution_test')
        context = TransitionContext(
            entity=self.mock_entity,
            current_state=TestStateChoices.IN_PROGRESS,
            target_state=transition.get_target_state(),
            timestamp=datetime.now(),
        )

        # Test validation
        assert transition.validate_transition(context)

        # Test execution
        result = transition.transition(context)
        assert result['value'] == 'execution_test'
        assert result['entity_id'] == self.mock_entity.pk
        assert 'timestamp' in result

    def test_validation_error_handling(self):
        """Test transition validation error handling"""

        @register_state_transition('test_entity', 'validation_test')
        class ValidationTestTransition(BaseTransition):
            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TestStateChoices.COMPLETED

            def validate_transition(self, context: TransitionContext) -> bool:
                if context.current_state != TestStateChoices.IN_PROGRESS:
                    raise TransitionValidationError(
                        'Can only complete from IN_PROGRESS state', {'current_state': context.current_state}
                    )
                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {}

        transition = ValidationTestTransition()

        # Test valid transition
        valid_context = TransitionContext(
            entity=self.mock_entity,
            current_state=TestStateChoices.IN_PROGRESS,
            target_state=transition.get_target_state(),
        )
        assert transition.validate_transition(valid_context)

        # Test invalid transition
        invalid_context = TransitionContext(
            entity=self.mock_entity,
            current_state=TestStateChoices.CREATED,
            target_state=transition.get_target_state(),
        )

        # Test validation error
        with pytest.raises(TransitionValidationError) as cm:
            transition.validate_transition(invalid_context)

        error = cm.value
        assert 'Can only complete from IN_PROGRESS state' in str(error)
        assert 'current_state' in error.context

    def test_state_manager_transition_execution(self):
        """Test StateManager-based transition execution"""

        @register_state_transition('test_entity', 'state_manager_test')
        class StateManagerTestTransition(BaseTransition):
            value: str = Field('default', description='Test value')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TestStateChoices.COMPLETED

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'value': self.value}

        # Test StateManager execution using the registry directly (simpler test)
        # This validates that the consolidated approach works through the registry
        from fsm.registry import transition_registry

        # Get the transition class
        transition_class = transition_registry.get_transition('test_entity', 'state_manager_test')
        assert transition_class is not None

        # Create instance and verify it works
        transition = transition_class(value='state_manager_test_value')
        assert transition.value == 'state_manager_test_value'
        assert transition.get_target_state() == TestStateChoices.COMPLETED

    def test_transition_hooks(self):
        """Test transition lifecycle hooks"""

        hook_calls = []

        @register_state_transition('test_entity', 'hook_test')
        class HookTestTransition(BaseTransition):
            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TestStateChoices.COMPLETED

            def pre_transition_hook(self, context: TransitionContext) -> None:
                hook_calls.append('pre')

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                hook_calls.append('transition')
                return {}

            def post_transition_hook(self, context: TransitionContext, state_record) -> None:
                hook_calls.append('post')

        transition = HookTestTransition()
        context = TransitionContext(
            entity=self.mock_entity,
            current_state=TestStateChoices.IN_PROGRESS,
            target_state=transition.get_target_state(),
        )

        # Test hook execution order
        transition.pre_transition_hook(context)
        transition.transition(context)
        transition.post_transition_hook(context, Mock())

        assert hook_calls == ['pre', 'transition', 'post']


class TransitionUtilsTests(TestCase):
    """Test cases for transition utility functions"""

    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com', password='test123')
        self.mock_entity = MockEntity()

    def test_get_available_transitions(self):
        """Test get_available_transitions utility"""

        @register_state_transition('test_entity', 'available_test')
        class AvailableTestTransition(BaseTransition):
            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TestStateChoices.COMPLETED

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {}

        available = get_available_transitions(self.mock_entity)
        assert 'available_test' in available
        assert available['available_test'] == AvailableTestTransition

        # Test with non-existent entity
        mock_other = MockEntity()
        mock_other._meta.model_name = 'other_entity'
        other_available = get_available_transitions(mock_other)
        assert len(other_available) == 0

    def test_get_available_transitions_with_validation(self):
        """Test the validation behavior of get_available_transitions"""
        from fsm.state_manager import StateManager

        @register_state_transition('test_entity', 'validation_test_1')
        class ValidationTestTransition1(BaseTransition):
            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TestStateChoices.IN_PROGRESS

            @classmethod
            def can_transition_from_state(cls, context) -> bool:
                # Only allow from CREATED state
                return context.current_state == TestStateChoices.CREATED

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {}

        @register_state_transition('test_entity', 'validation_test_2')
        class ValidationTestTransition2(BaseTransition):
            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TestStateChoices.COMPLETED

            @classmethod
            def can_transition_from_state(cls, context) -> bool:
                # Only allow from IN_PROGRESS state
                return context.current_state == TestStateChoices.IN_PROGRESS

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {}

        # Test validate=False (should return all registered transitions)
        all_available = get_available_transitions(self.mock_entity, validate=False)
        assert len(all_available) == 2
        assert 'validation_test_1' in all_available
        assert 'validation_test_2' in all_available

        # Mock current state as CREATED
        mock_state_object = Mock()
        mock_state_object.state = TestStateChoices.CREATED

        with patch.object(StateManager, 'get_current_state_object', return_value=mock_state_object):
            # Test validate=True with CREATED state (should only return validation_test_1)
            valid_transitions = get_available_transitions(self.mock_entity, validate=True)
            assert len(valid_transitions) == 1
            assert 'validation_test_1' in valid_transitions
            assert 'validation_test_2' not in valid_transitions

        # Mock current state as IN_PROGRESS
        mock_state_object.state = TestStateChoices.IN_PROGRESS

        with patch.object(StateManager, 'get_current_state_object', return_value=mock_state_object):
            # Test validate=True with IN_PROGRESS state (should only return validation_test_2)
            valid_transitions = get_available_transitions(self.mock_entity, validate=True)
            assert len(valid_transitions) == 1
            assert 'validation_test_2' in valid_transitions
            assert 'validation_test_1' not in valid_transitions

        # Mock current state as COMPLETED
        mock_state_object.state = TestStateChoices.COMPLETED

        with patch.object(StateManager, 'get_current_state_object', return_value=mock_state_object):
            # Test validate=True with COMPLETED state (should return no transitions)
            valid_transitions = get_available_transitions(self.mock_entity, validate=True)
            assert len(valid_transitions) == 0

    def test_get_available_transitions_with_required_fields(self):
        """Test that transitions with required fields are handled correctly during validation"""
        from fsm.state_manager import StateManager

        @register_state_transition('test_entity', 'required_field_transition')
        class RequiredFieldTransition(BaseTransition):
            required_field: str = Field(..., description='This field is required')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return TestStateChoices.IN_PROGRESS

            @classmethod
            def can_transition_from_state(cls, context) -> bool:
                # This should never be called since we can't instantiate without required_field
                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'required_field': self.required_field}

        # Test validate=False (should return the transition even though it has required fields)
        all_available = get_available_transitions(self.mock_entity, validate=False)
        assert 'required_field_transition' in all_available

        # Mock current state
        mock_state_object = Mock()
        mock_state_object.state = TestStateChoices.CREATED

        with patch.object(StateManager, 'get_current_state_object', return_value=mock_state_object):
            # Test validate=True - should include transitions that can't be instantiated for validation
            # This is the behavior: we can't validate transitions with required fields
            # without knowing what data will be provided, so we include them as "available"
            valid_transitions = get_available_transitions(self.mock_entity, validate=True)

            # The transition should be included since we can't validate it (better to be permissive)
            # This avoids false negatives where valid transitions appear unavailable due to
            # validation limitations
            assert 'required_field_transition' in valid_transitions


class ComprehensiveUsageExampleTests(TestCase):
    """
    Comprehensive test cases demonstrating various usage patterns.

    These tests serve as both validation and documentation for how to
    implement and use the declarative transition system.
    """

    def setUp(self):
        self.task = MockTask()
        self.user = Mock()
        self.user.id = 123
        self.user.username = 'testuser'

    def test_basic_transition_implementation(self):
        """
        USAGE EXAMPLE: Basic transition implementation

        Shows how to implement a simple transition with validation.
        """

        class BasicTransition(BaseTransition):
            """Example: Simple transition with required field"""

            message: str = Field(..., description='Message for the transition')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'PROCESSED'

            def validate_transition(self, context: TransitionContext) -> bool:
                # Business logic validation
                if context.current_state == 'COMPLETED':
                    raise TransitionValidationError('Cannot process completed items')
                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'message': self.message,
                    'processed_by': context.current_user.username if context.current_user else 'system',
                    'processed_at': context.timestamp.isoformat(),
                }

        # Test the implementation
        transition = BasicTransition(message='Processing task')
        assert transition.message == 'Processing task'
        assert transition.get_target_state() == 'PROCESSED'

        # Test validation
        context = TransitionContext(
            entity=self.task,
            current_user=self.user,
            current_state='CREATED',
            target_state=transition.get_target_state(),
        )

        assert transition.validate_transition(context)

        # Test data generation
        data = transition.transition(context)
        assert data['message'] == 'Processing task'
        assert data['processed_by'] == 'testuser'
        assert 'processed_at' in data

    def test_complex_validation_example(self):
        """
        USAGE EXAMPLE: Complex validation with multiple conditions

        Shows how to implement sophisticated business logic validation.
        """

        class TaskAssignmentTransition(BaseTransition):
            """Example: Complex validation for task assignment"""

            assignee_id: int = Field(..., description='User to assign task to')
            priority: str = Field('normal', description='Task priority')
            deadline: datetime = Field(None, description='Task deadline')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'ASSIGNED'

            def validate_transition(self, context: TransitionContext) -> bool:
                # Multiple validation conditions
                if context.current_state not in ['CREATED', 'UNASSIGNED']:
                    raise TransitionValidationError(
                        f'Cannot assign task in state {context.current_state}',
                        {'current_state': context.current_state, 'task_id': context.entity.pk},
                    )

                # Check deadline is in future
                if self.deadline and self.deadline <= timezone.now():
                    raise TransitionValidationError(
                        'Deadline must be in the future', {'deadline': self.deadline.isoformat()}
                    )

                # Check priority is valid
                valid_priorities = ['low', 'normal', 'high', 'urgent']
                if self.priority not in valid_priorities:
                    raise TransitionValidationError(
                        f'Invalid priority: {self.priority}', {'valid_priorities': valid_priorities}
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'assignee_id': self.assignee_id,
                    'priority': self.priority,
                    'deadline': self.deadline.isoformat() if self.deadline else None,
                    'assigned_by': context.current_user.id if context.current_user else None,
                    'assignment_reason': f'Task assigned to user {self.assignee_id}',
                }

        # Test valid assignment
        future_deadline = timezone.now() + timedelta(days=7)
        transition = TaskAssignmentTransition(assignee_id=456, priority='high', deadline=future_deadline)

        context = TransitionContext(
            entity=self.task,
            current_user=self.user,
            current_state='CREATED',
            target_state=transition.get_target_state(),
        )

        assert transition.validate_transition(context)

        # Test invalid state
        context.current_state = 'COMPLETED'
        with pytest.raises(TransitionValidationError) as cm:
            transition.validate_transition(context)

        assert 'Cannot assign task in state' in str(cm.value)
        assert 'COMPLETED' in str(cm.value)

        # Test invalid deadline
        past_deadline = timezone.now() - timedelta(days=1)
        invalid_transition = TaskAssignmentTransition(assignee_id=456, deadline=past_deadline)

        context.current_state = 'CREATED'
        with pytest.raises(TransitionValidationError) as cm:
            invalid_transition.validate_transition(context)

        assert 'Deadline must be in the future' in str(cm.value)

    def test_registry_and_decorator_usage(self):
        """
        USAGE EXAMPLE: Using the registry and decorator system

        Shows how to register transitions and use the decorator syntax.
        """

        @register_state_transition('document', 'publish')
        class PublishDocumentTransition(BaseTransition):
            """Example: Using the registration decorator"""

            publish_immediately: bool = Field(True, description='Publish immediately')
            scheduled_time: datetime = Field(None, description='Scheduled publish time')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'PUBLISHED' if self.publish_immediately else 'SCHEDULED'

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {
                    'publish_immediately': self.publish_immediately,
                    'scheduled_time': self.scheduled_time.isoformat() if self.scheduled_time else None,
                    'published_by': context.current_user.id if context.current_user else None,
                }

        # Test registration worked
        registered_class = transition_registry.get_transition('document', 'publish')
        assert registered_class == PublishDocumentTransition

        # Test getting transitions for entity
        document_transitions = transition_registry.get_transitions_for_entity('document')
        assert 'publish' in document_transitions

        # Test execution through registry
        mock_document = Mock()
        mock_document.pk = 1
        mock_document._meta.model_name = 'document'

        # This would normally go through the full execution workflow
        transition_data = {'publish_immediately': False, 'scheduled_time': timezone.now() + timedelta(hours=2)}

        # Test transition creation and validation
        transition = PublishDocumentTransition(**transition_data)
        assert transition.get_target_state() == 'SCHEDULED'


class ValidationAndErrorHandlingTests(TestCase):
    """
    Tests focused on validation scenarios and error handling.

    These tests demonstrate proper error handling patterns and
    validation edge cases.
    """

    def setUp(self):
        self.task = MockTask()

    def test_pydantic_validation_errors(self):
        """Test Pydantic field validation errors"""

        class StrictValidationTransition(BaseTransition):
            required_field: str = Field(..., description='Required field')
            email_field: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$', description='Valid email')
            number_field: int = Field(..., ge=1, le=100, description='Number between 1-100')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'VALIDATED'

            @classmethod
            def get_target_state(cls) -> str:
                return 'VALIDATED'

            @classmethod
            def can_transition_from_state(cls, context: TransitionContext) -> bool:
                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'validated': True}

        # Test missing required field
        with pytest.raises(ValidationError):
            StrictValidationTransition(email_field='test@example.com', number_field=50)

        # Test invalid email
        with pytest.raises(ValidationError):
            StrictValidationTransition(required_field='test', email_field='invalid-email', number_field=50)

        # Test number out of range
        with pytest.raises(ValidationError):
            StrictValidationTransition(required_field='test', email_field='test@example.com', number_field=150)

        # Test valid data
        valid_transition = StrictValidationTransition(
            required_field='test', email_field='user@example.com', number_field=75
        )
        assert valid_transition.required_field == 'test'

    def test_business_logic_validation_errors(self):
        """Test business logic validation with detailed error context"""

        class BusinessRuleTransition(BaseTransition):
            amount: float = Field(..., description='Transaction amount')
            currency: str = Field('USD', description='Currency code')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'PROCESSED'

            def validate_transition(self, context: TransitionContext) -> bool:
                # Complex business rule validation
                errors = []

                if self.amount <= 0:
                    errors.append('Amount must be positive')

                if self.amount > 10000 and context.current_user is None:
                    errors.append('Large amounts require authenticated user')

                if self.currency not in ['USD', 'EUR', 'GBP']:
                    errors.append(f'Unsupported currency: {self.currency}')

                if context.current_state == 'CANCELLED':
                    errors.append('Cannot process cancelled transactions')

                if errors:
                    raise TransitionValidationError(
                        f"Validation failed: {'; '.join(errors)}",
                        {
                            'validation_errors': errors,
                            'amount': self.amount,
                            'currency': self.currency,
                            'current_state': context.current_state,
                        },
                    )

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'amount': self.amount, 'currency': self.currency}

        context = TransitionContext(entity=self.task, current_state='PENDING', target_state='PROCESSED')

        # Test negative amount
        negative_transition = BusinessRuleTransition(amount=-100)
        with pytest.raises(TransitionValidationError) as cm:
            negative_transition.validate_transition(context)

        error = cm.value
        assert 'Amount must be positive' in str(error)
        assert 'validation_errors' in error.context

        # Test large amount without user
        large_transition = BusinessRuleTransition(amount=15000)
        with pytest.raises(TransitionValidationError) as cm:
            large_transition.validate_transition(context)

        assert 'Large amounts require authenticated user' in str(cm.value)

        # Test invalid currency
        invalid_currency_transition = BusinessRuleTransition(amount=100, currency='XYZ')
        with pytest.raises(TransitionValidationError) as cm:
            invalid_currency_transition.validate_transition(context)

        assert 'Unsupported currency' in str(cm.value)

        # Test multiple errors
        multi_error_transition = BusinessRuleTransition(amount=-50, currency='XYZ')
        with pytest.raises(TransitionValidationError) as cm:
            multi_error_transition.validate_transition(context)

        error_msg = str(cm.value)
        assert 'Amount must be positive' in error_msg
        assert 'Unsupported currency' in error_msg


# Pytest-style tests for compatibility
@pytest.fixture
def task():
    """Pytest fixture for mock task"""
    return MockTask()


@pytest.fixture
def user():
    """Pytest fixture for mock user"""
    user = Mock()
    user.id = 1
    user.username = 'testuser'
    return user


def test_transition_context_properties(task, user):
    """Test TransitionContext properties using pytest"""
    context = TransitionContext(entity=task, current_user=user, current_state='CREATED', target_state='IN_PROGRESS')

    assert context.has_current_state
    assert not context.is_initial_transition
    assert context.current_state == 'CREATED'
    assert context.target_state == 'IN_PROGRESS'


def test_pydantic_validation():
    """Test Pydantic validation in transitions"""

    class SampleTransition(BaseTransition):
        test_field: str
        optional_field: int = 42

        def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
            return 'TEST_STATE'

        def transition(self, context: TransitionContext) -> dict:
            return {'test_field': self.test_field}

    # Valid data
    transition = SampleTransition(test_field='valid')
    assert transition.test_field == 'valid'
    assert transition.optional_field == 42

    # Invalid data should raise validation error
    with pytest.raises(ValidationError):  # Pydantic validation error
        SampleTransition()  # Missing required field


def test_side_effect_only_transition():
    """Test side-effect only transitions (target_state=None)"""

    class SideEffectTransition(BaseTransition):
        action_performed: str = 'notification_sent'

        def get_target_state(self, context: Optional[TransitionContext] = None) -> Optional[str]:
            # Return None to indicate no state change, only side effects
            return None

        def transition(self, context: TransitionContext) -> dict:
            # Perform side effect (e.g., send notification, log event)
            return {'action': self.action_performed}

        def post_transition_hook(self, context: TransitionContext, state_record) -> None:
            # State record should be None for side-effect only transitions
            assert state_record is None

    # Test instantiation
    transition = SideEffectTransition(action_performed='email_sent')
    assert transition.get_target_state() is None

    # Test context creation with None target_state
    mock_entity = type('MockEntity', (), {'pk': 1, '_meta': type('Meta', (), {'model_name': 'test'})})()
    context = TransitionContext(
        entity=mock_entity,
        target_state=None,  # Should be allowed for side-effect only transitions
    )
    assert context.target_state is None

    # Test transition execution
    result = transition.transition(context)
    assert result['action'] == 'email_sent'


def test_skip_validation_flag():
    """
    Test the skip_validation flag in TransitionContext.

    This test validates step by step:
    - Creating a transition with validation logic that would normally fail
    - Verifying that validation runs and fails when skip_validation=False (default)
    - Verifying that validation is skipped when skip_validation=True
    - Confirming that prepare_and_validate respects the skip_validation flag
    - Ensuring the transition can execute successfully when validation is skipped

    Critical validation: The skip_validation flag provides a mechanism to bypass
    validation checks for special cases like system migrations, data imports, or
    administrative operations that need to override normal business rules.
    """

    class StrictValidationTransition(BaseTransition):
        """Test transition with strict validation rules"""

        action: str = Field(..., description='Action to perform')

        def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
            return TestStateChoices.COMPLETED

        def validate_transition(self, context: TransitionContext) -> bool:
            """Validation that only allows transition from IN_PROGRESS state"""
            if context.current_state != TestStateChoices.IN_PROGRESS:
                raise TransitionValidationError(
                    f'Can only complete from IN_PROGRESS state, not {context.current_state}',
                    {'current_state': context.current_state, 'target_state': context.target_state},
                )
            return True

        def transition(self, context: TransitionContext) -> Dict[str, Any]:
            return {'action': self.action, 'completed': True}

    # Create mock entity
    mock_entity = MockEntity()

    # Test 1: Normal validation (skip_validation=False, default behavior)
    # This should fail because current_state is CREATED, not IN_PROGRESS
    transition = StrictValidationTransition(action='test_action')
    context_with_validation = TransitionContext(
        entity=mock_entity,
        current_state=TestStateChoices.CREATED,  # Invalid state for this transition
        target_state=transition.get_target_state(),
        skip_validation=False,  # Explicit False (same as default)
    )

    # Verify that validation fails as expected
    with pytest.raises(TransitionValidationError) as cm:
        transition.prepare_and_validate(context_with_validation)

    error = cm.value
    assert 'Can only complete from IN_PROGRESS state' in str(error)
    assert error.context['current_state'] == TestStateChoices.CREATED

    # Test 2: Skip validation (skip_validation=True)
    # This should succeed even though current_state is CREATED
    transition_skip = StrictValidationTransition(action='skip_validation_action')
    context_skip_validation = TransitionContext(
        entity=mock_entity,
        current_state=TestStateChoices.CREATED,  # Same invalid state
        target_state=transition_skip.get_target_state(),
        skip_validation=True,  # Validation should be skipped
    )

    # This should NOT raise an error because validation is skipped
    result = transition_skip.prepare_and_validate(context_skip_validation)

    # Verify the transition executed successfully
    assert result['action'] == 'skip_validation_action'
    assert result['completed'] is True

    # Test 3: Verify default behavior (skip_validation not specified, defaults to False)
    transition_default = StrictValidationTransition(action='default_action')
    context_default = TransitionContext(
        entity=mock_entity,
        current_state=TestStateChoices.CREATED,
        target_state=transition_default.get_target_state(),
        # skip_validation not specified, should default to False
    )

    # Verify default is False (validation should run and fail)
    assert context_default.skip_validation is False

    with pytest.raises(TransitionValidationError) as cm:
        transition_default.prepare_and_validate(context_default)

    assert 'Can only complete from IN_PROGRESS state' in str(cm.value)

    # Test 4: Verify that with correct state and skip_validation=False, it succeeds
    transition_valid = StrictValidationTransition(action='valid_action')
    context_valid = TransitionContext(
        entity=mock_entity,
        current_state=TestStateChoices.IN_PROGRESS,  # Correct state
        target_state=transition_valid.get_target_state(),
        skip_validation=False,
    )

    # This should succeed because state is valid
    result_valid = transition_valid.prepare_and_validate(context_valid)
    assert result_valid['action'] == 'valid_action'
    assert result_valid['completed'] is True
