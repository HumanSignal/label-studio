"""
Tests for UUID7 utilities in the FSM system.

Tests the uuid-utils library integration and UUID7 functionality.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from unittest.mock import Mock, patch

# Additional imports for transition_utils coverage tests
import pytest
from django.test import TestCase
from fsm.registry import transition_registry
from fsm.transition_utils import (
    create_transition_from_dict,
    get_available_transitions,
    get_entity_state_flow,
    validate_transition_data,
)
from fsm.transitions import BaseTransition, TransitionContext, TransitionValidationError
from fsm.utils import (
    UUID7Generator,
    generate_uuid7,
    timestamp_from_uuid7,
    uuid7_from_timestamp,
    uuid7_time_range,
    validate_uuid7,
)
from pydantic import Field


class TestUUID7Utils(TestCase):
    """Test UUID7 utility functions"""

    def test_generate_uuid7(self):
        """Test UUID7 generation"""
        uuid7_id = generate_uuid7()

        # Check that it's a valid UUID
        assert isinstance(uuid7_id, uuid.UUID)

        # Check that it's version 7
        assert uuid7_id.version == 7

        # Check that it validates as UUID7
        assert validate_uuid7(uuid7_id)

    def test_uuid7_ordering(self):
        """Test that UUID7s have natural time ordering"""
        uuid1 = generate_uuid7()
        uuid2 = generate_uuid7()

        # UUID7s should be ordered by generation time
        assert uuid1.int < uuid2.int

    def test_timestamp_extraction(self):
        """Test timestamp extraction from UUID7"""
        before = datetime.now(timezone.utc)
        uuid7_id = generate_uuid7()
        after = datetime.now(timezone.utc)

        extracted_timestamp = timestamp_from_uuid7(uuid7_id)

        # Timestamp should be close to the generation time (within 1 second tolerance)
        # UUID7 has millisecond precision, so some rounding variance is expected
        time_diff_before = abs((extracted_timestamp - before).total_seconds())
        time_diff_after = abs((extracted_timestamp - after).total_seconds())

        assert time_diff_before < 1.0  # Within 1 second of before
        assert time_diff_after < 1.0   # Within 1 second of after

    def test_uuid7_from_timestamp(self):
        """Test creating UUID7 from specific timestamp"""
        test_time = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        uuid7_id = uuid7_from_timestamp(test_time)

        # Should be a valid UUID7
        assert validate_uuid7(uuid7_id)

        # Extracted timestamp should match (within millisecond precision)
        extracted = timestamp_from_uuid7(uuid7_id)
        time_diff = abs((extracted - test_time).total_seconds())
        assert time_diff < 0.001  # Within 1ms

    def test_uuid7_time_range(self):
        """Test UUID7 time range generation"""
        start_time = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        end_time = datetime(2024, 1, 15, 13, 0, 0, tzinfo=timezone.utc)

        start_uuid, end_uuid = uuid7_time_range(start_time, end_time)

        # Both should be valid UUID7s
        assert validate_uuid7(start_uuid)
        assert validate_uuid7(end_uuid)

        # Start should be less than end
        assert start_uuid.int < end_uuid.int

        # Timestamps should match input times (with 1ms buffer tolerance)
        start_extracted = timestamp_from_uuid7(start_uuid)
        end_extracted = timestamp_from_uuid7(end_uuid)

        # Account for 1ms buffer added in uuid7_time_range
        assert abs((start_extracted - start_time).total_seconds()) < 0.002
        assert abs((end_extracted - end_time).total_seconds()) < 0.002

    def test_uuid7_time_range_default_end(self):
        """Test UUID7 time range with default end time (now)"""
        start_time = datetime.now(timezone.utc) - timedelta(hours=1)
        before_call = datetime.now(timezone.utc)

        start_uuid, end_uuid = uuid7_time_range(start_time)

        after_call = datetime.now(timezone.utc)

        # End timestamp should be close to now (within 1 second tolerance)
        end_extracted = timestamp_from_uuid7(end_uuid)
        time_diff_before = abs((end_extracted - before_call).total_seconds())
        time_diff_after = abs((end_extracted - after_call).total_seconds())

        assert time_diff_before < 1.0  # Within 1 second of before_call
        assert time_diff_after < 1.0   # Within 1 second of after_call

    def test_validate_uuid7_with_other_versions(self):
        """Test UUID7 validation with other UUID versions"""
        # Test with UUID4
        uuid4_id = uuid.uuid4()
        assert not validate_uuid7(uuid4_id)

        # Test with UUID7
        uuid7_id = generate_uuid7()
        assert validate_uuid7(uuid7_id)


class TestUUID7Generator(TestCase):
    """Test UUID7Generator class"""

    def test_generator_basic(self):
        """Test basic UUID7 generator functionality"""
        generator = UUID7Generator()

        uuid7_id = generator.generate()
        assert validate_uuid7(uuid7_id)

    def test_generator_with_base_timestamp(self):
        """Test generator with custom base timestamp"""
        base_time = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        generator = UUID7Generator(base_timestamp=base_time)

        uuid7_id = generator.generate()
        extracted = timestamp_from_uuid7(uuid7_id)

        # Should be close to base time
        time_diff = abs((extracted - base_time).total_seconds())
        assert time_diff < 0.001

    def test_generator_with_offset(self):
        """Test generator with timestamp offset"""
        base_time = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        generator = UUID7Generator(base_timestamp=base_time)

        # Generate UUID with 1 second offset
        uuid7_id = generator.generate(offset_ms=1000)
        extracted = timestamp_from_uuid7(uuid7_id)

        expected_time = base_time + timedelta(milliseconds=1000)
        time_diff = abs((extracted - expected_time).total_seconds())
        assert time_diff < 0.001

    def test_generator_monotonic(self):
        """Test that generator produces monotonic UUIDs"""
        base_time = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        generator = UUID7Generator(base_timestamp=base_time)

        # Generate multiple UUIDs with same timestamp but different counters
        uuid1 = generator.generate(offset_ms=100)
        uuid2 = generator.generate(offset_ms=100)
        uuid3 = generator.generate(offset_ms=100)

        # Should be monotonic even with same timestamp
        assert uuid1.int < uuid2.int
        assert uuid2.int < uuid3.int


class MockEntity:
    """Mock entity for testing"""

    def __init__(self, pk=1):
        self.pk = pk
        self.id = pk
        self._meta = Mock()
        self._meta.model_name = 'testentity'
        self._meta.label_lower = 'tests.testentity'
        self.organization_id = 1


class TransitionUtilsTests(TestCase):
    """Tests for transition_utils module edge cases and error handling"""

    def setUp(self):
        self.entity = MockEntity()

    def test_transition_utils_unexpected_validation_error(self):
        """Test unexpected error during transition validation in get_available_transitions"""

        class BrokenTransition(BaseTransition):
            """Transition that raises unexpected error"""

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'BROKEN'

            def transition(self, context):
                return {}

            @classmethod
            def can_transition_from_state(cls, context):
                # Raise unexpected error
                raise RuntimeError('Unexpected validation error')

        # Register the broken transition
        transition_registry.register('testentity', 'broken_transition', BrokenTransition)

        # Should handle the error gracefully and log warning
        with patch('fsm.transition_utils.logger') as mock_logger:
            result = get_available_transitions(self.entity, validate=True)
            # Should not include the broken transition
            assert 'broken_transition' not in result
            # Should have logged the warning
            mock_logger.warning.assert_called_once()
            assert 'Unexpected error validating transition' in mock_logger.warning.call_args[0][0]

    def test_transition_utils_validation_error_handling(self):
        """Test TransitionValidationError handling in get_available_transitions"""

        class ValidatingTransition(BaseTransition):
            """Transition that raises validation error"""

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'VALIDATED'

            def transition(self, context):
                return {}

            @classmethod
            def can_transition_from_state(cls, context):
                raise TransitionValidationError('Not allowed from this state')

        transition_registry.register('testentity', 'validating_transition', ValidatingTransition)

        # Should exclude invalid transitions without logging
        import logging

        mock_logger = Mock()
        with patch.object(logging, 'getLogger', return_value=mock_logger):
            result = get_available_transitions(self.entity, validate=True)
            assert 'validating_transition' not in result
            # Should not log for expected validation errors
            mock_logger.warning.assert_not_called()

    def test_transition_utils_create_from_dict_error(self):
        """Test create_transition_from_dict error handling"""

        class StrictTransition(BaseTransition):
            """Transition with strict validation"""

            required_field: str = Field(...)

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'STRICT'

            def transition(self, context):
                return {'required_field': self.required_field}

        # Should raise ValueError with helpful message
        with pytest.raises(ValueError) as exc_info:
            create_transition_from_dict(StrictTransition, {})

        assert 'Failed to create StrictTransition' in str(exc_info.value)

    def test_transition_utils_validate_transition_data_errors(self):
        """Test validate_transition_data with various error cases"""

        class ValidationTransition(BaseTransition):
            """Transition with various field types"""

            required_field: str = Field(...)
            number_field: int = Field(default=0, ge=0)

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'VALIDATED'

            def transition(self, context):
                return {'required_field': self.required_field, 'number_field': self.number_field}

        # Test with missing required field
        errors = validate_transition_data(ValidationTransition, {})
        assert 'required_field' in errors
        assert any('required' in msg.lower() or 'missing' in msg.lower() for msg in errors['required_field'])

        # Test with invalid type
        errors = validate_transition_data(
            ValidationTransition, {'required_field': 123, 'number_field': 'not_a_number'}
        )
        # Either required_field or number_field should have type error
        assert len(errors) > 0

        # Test with validation constraint violation
        errors = validate_transition_data(ValidationTransition, {'required_field': 'test', 'number_field': -1})
        assert 'number_field' in errors

        # Test valid data returns empty dict
        errors = validate_transition_data(ValidationTransition, {'required_field': 'test', 'number_field': 5})
        assert errors == {}

    def test_transition_utils_validate_with_non_pydantic_error(self):
        """Test validate_transition_data with non-Pydantic errors"""

        class CustomErrorTransition(BaseTransition):
            """Transition that raises custom error in __init__"""

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'ERROR'

            def transition(self, context):
                return {}

            def __init__(self, **data):
                # Raise a non-ValidationError
                if 'trigger_error' in data:
                    raise RuntimeError('Custom initialization error')
                super().__init__(**data)

        errors = validate_transition_data(CustomErrorTransition, {'trigger_error': True})
        assert '__root__' in errors
        assert 'Custom initialization error' in errors['__root__'][0]

    def test_transition_utils_entity_state_flow_errors(self):
        """Test get_entity_state_flow with transitions that can't be instantiated"""

        class RequiredFieldTransition(BaseTransition):
            """Transition requiring fields to instantiate"""

            required_field: str = Field(...)

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'REQUIRED'

            def transition(self, context):
                return {'required_field': self.required_field}

        transition_registry.register('testentity', 'required_transition', RequiredFieldTransition)

        # Should skip transitions that can't be instantiated
        flows = get_entity_state_flow(self.entity)
        # Should not include the transition that requires fields
        assert not any(f['transition_name'] == 'required_transition' for f in flows)


class TestUUID7FieldCoverage(TestCase):
    """Test coverage for UUID7Field utility methods"""

    def test_get_latest_by_uuid7(self):
        """Test UUID7Field.get_latest_by_uuid7 utility method"""
        from fsm.utils import UUID7Field

        mock_first = Mock()
        mock_queryset = Mock()
        mock_queryset.order_by.return_value.first.return_value = mock_first

        result = UUID7Field.get_latest_by_uuid7(mock_queryset)

        mock_queryset.order_by.assert_called_once_with('-id')
        assert result == mock_first

    def test_filter_by_time_range(self):
        """Test UUID7Field.filter_by_time_range utility method"""
        from fsm.utils import UUID7Field

        start_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
        end_time = datetime(2024, 1, 2, tzinfo=timezone.utc)

        mock_filtered = Mock()
        mock_queryset = Mock()
        mock_queryset.filter.return_value = mock_filtered

        result = UUID7Field.filter_by_time_range(mock_queryset, start_time, end_time)

        assert mock_queryset.filter.called
        assert result == mock_filtered

    def test_filter_since_time(self):
        """Test UUID7Field.filter_since_time utility method"""
        from fsm.utils import UUID7Field

        since_time = datetime(2024, 1, 1, tzinfo=timezone.utc)

        mock_filtered = Mock()
        mock_queryset = Mock()
        mock_queryset.filter.return_value = mock_filtered

        result = UUID7Field.filter_since_time(mock_queryset, since_time)

        assert mock_queryset.filter.called
        assert result == mock_filtered


class TestResolveOrganizationIdCoverage(TestCase):
    """Test coverage for resolve_organization_id edge cases"""

    def setUp(self):
        from core.current_request import CurrentContext

        CurrentContext.clear()

    def tearDown(self):
        from core.current_request import CurrentContext

        CurrentContext.clear()

    def test_resolve_organization_id_with_none_entity(self):
        """Test resolve_organization_id when entity is None"""
        from fsm.utils import resolve_organization_id

        result = resolve_organization_id(entity=None, user=None)
        assert result is None

    def test_resolve_organization_id_from_context(self):
        """Test resolve_organization_id returns cached context value"""
        from core.current_request import CurrentContext
        from fsm.utils import resolve_organization_id

        CurrentContext.set_organization_id(999)

        # Even with entity, should return context value
        mock_entity = Mock()
        mock_entity.organization_id = 123

        result = resolve_organization_id(entity=mock_entity)
        assert result == 999

    def test_resolve_organization_id_from_entity_direct(self):
        """Test resolve_organization_id from entity.organization_id"""
        from fsm.utils import resolve_organization_id

        mock_entity = Mock()
        mock_entity.organization_id = 456

        result = resolve_organization_id(entity=mock_entity)
        assert result == 456

    def test_resolve_organization_id_from_project_relationship(self):
        """Test resolve_organization_id via entity.project.organization_id"""
        from fsm.utils import resolve_organization_id

        mock_project = Mock()
        mock_project.organization_id = 789

        mock_entity = Mock()
        mock_entity.organization_id = None
        mock_entity.project = mock_project

        result = resolve_organization_id(entity=mock_entity)
        assert result == 789

    def test_resolve_organization_id_from_task_project_relationship(self):
        """Test resolve_organization_id via entity.task.project.organization_id"""
        from fsm.utils import resolve_organization_id

        mock_project = Mock()
        mock_project.organization_id = 321

        mock_task = Mock()
        mock_task.project = mock_project

        mock_entity = Mock()
        mock_entity.organization_id = None
        mock_entity.project = None
        mock_entity.task = mock_task

        result = resolve_organization_id(entity=mock_entity)
        assert result == 321

    def test_resolve_organization_id_from_user_active_organization(self):
        """Test resolve_organization_id from user.active_organization"""
        from fsm.utils import resolve_organization_id

        mock_active_org = Mock()
        mock_active_org.id = 654

        mock_user = Mock()
        mock_user.active_organization = mock_active_org

        mock_entity = Mock()
        mock_entity.organization_id = None
        mock_entity.project = None
        mock_entity.task = None

        result = resolve_organization_id(entity=mock_entity, user=mock_user)
        assert result == 654

    def test_resolve_organization_id_caches_result(self):
        """Test that resolve_organization_id caches the result in CurrentContext"""
        from core.current_request import CurrentContext
        from fsm.utils import resolve_organization_id

        mock_entity = Mock()
        mock_entity.organization_id = 987

        result = resolve_organization_id(entity=mock_entity)
        assert result == 987

        # Verify it's cached
        cached = CurrentContext.get_organization_id()
        assert cached == 987


class TestGetCurrentStateSafeCoverage(TestCase):
    """Test coverage for get_current_state_safe error handling"""

    def test_get_current_state_safe_when_fsm_disabled(self):
        """Test get_current_state_safe returns None when FSM is disabled"""
        from fsm.utils import get_current_state_safe

        mock_entity = Mock()
        mock_entity.pk = 1
        mock_entity._meta = Mock()
        mock_entity._meta.label_lower = 'test.entity'

        with patch('fsm.utils.is_fsm_enabled', return_value=False):
            result = get_current_state_safe(mock_entity)
            assert result is None


class TestGetOrInitializeStateParameters(TestCase):
    """Test coverage for get_or_initialize_state reason and context_data parameters.

    These tests validate that the reason and context_data parameters are correctly
    accepted and passed through to StateManager.execute_transition().
    """

    def setUp(self):
        self.mock_entity = MockEntity()

    def test_get_or_initialize_state_accepts_reason_parameter(self):
        """Test that get_or_initialize_state accepts reason parameter.

        This test validates step by step:
        - Calling get_or_initialize_state with a reason parameter
        - Verifying it's passed to StateManager.execute_transition

        Critical validation: The reason parameter allows callers to provide
        context-specific reasons for state initialization.
        """
        from fsm.utils import get_or_initialize_state

        custom_reason = 'Bulk import completed - initializing state'

        with patch('fsm.utils.is_fsm_enabled', return_value=True):
            with patch('fsm.utils.CurrentContext') as mock_context:
                mock_context.is_fsm_disabled.return_value = False

                # Mock StateManager - patch where it's imported (fsm.state_manager)
                with patch('fsm.state_manager.get_state_manager') as mock_get_sm:
                    mock_sm = Mock()
                    mock_sm.get_current_state_value.return_value = None  # No existing state
                    mock_get_sm.return_value = mock_sm

                    # Mock state inference
                    with patch('fsm.state_inference._get_or_infer_state', return_value='IN_PROGRESS'):
                        with patch('fsm.utils._get_initialization_transition_name', return_value='init_transition'):
                            # Call with reason
                            get_or_initialize_state(
                                self.mock_entity,
                                user=None,
                                inferred_state='IN_PROGRESS',
                                reason=custom_reason,
                            )

                            # Verify execute_transition was called with reason
                            mock_sm.execute_transition.assert_called_once()
                            call_kwargs = mock_sm.execute_transition.call_args[1]
                            assert call_kwargs.get('reason') == custom_reason

    def test_get_or_initialize_state_accepts_context_data_parameter(self):
        """Test that get_or_initialize_state accepts context_data parameter.

        This test validates step by step:
        - Calling get_or_initialize_state with a context_data parameter
        - Verifying it's passed to StateManager.execute_transition

        Critical validation: The context_data parameter allows callers to add
        additional data to be stored in the state record's JSONB context_data.
        """
        from fsm.utils import get_or_initialize_state

        custom_context_data = {
            'import_source_id': 123,
            'task_count': 456,
            'triggered_by_api': False,
        }

        with patch('fsm.utils.is_fsm_enabled', return_value=True):
            with patch('fsm.utils.CurrentContext') as mock_context:
                mock_context.is_fsm_disabled.return_value = False

                # Mock StateManager - patch where it's imported (fsm.state_manager)
                with patch('fsm.state_manager.get_state_manager') as mock_get_sm:
                    mock_sm = Mock()
                    mock_sm.get_current_state_value.return_value = None  # No existing state
                    mock_get_sm.return_value = mock_sm

                    # Mock state inference
                    with patch('fsm.state_inference._get_or_infer_state', return_value='IN_PROGRESS'):
                        with patch('fsm.utils._get_initialization_transition_name', return_value='init_transition'):
                            # Call with context_data
                            get_or_initialize_state(
                                self.mock_entity,
                                user=None,
                                inferred_state='IN_PROGRESS',
                                context_data=custom_context_data,
                            )

                            # Verify execute_transition was called with context_data
                            mock_sm.execute_transition.assert_called_once()
                            call_kwargs = mock_sm.execute_transition.call_args[1]
                            assert call_kwargs.get('context_data') == custom_context_data

    def test_get_or_initialize_state_with_both_reason_and_context_data(self):
        """Test get_or_initialize_state with both reason and context_data.

        This test validates step by step:
        - Calling get_or_initialize_state with both reason and context_data
        - Verifying both are passed to StateManager.execute_transition

        Critical validation: Both parameters should be passed independently
        without interference.
        """
        from fsm.utils import get_or_initialize_state

        custom_reason = 'Bulk import completed with configuration changes'
        custom_context_data = {
            'import_source_id': 123,
            'previous_task_count': 100,
            'new_task_count': 456,
            'triggered_by_api': False,
        }

        with patch('fsm.utils.is_fsm_enabled', return_value=True):
            with patch('fsm.utils.CurrentContext') as mock_context:
                mock_context.is_fsm_disabled.return_value = False

                # Mock StateManager - patch where it's imported (fsm.state_manager)
                with patch('fsm.state_manager.get_state_manager') as mock_get_sm:
                    mock_sm = Mock()
                    mock_sm.get_current_state_value.return_value = None  # No existing state
                    mock_get_sm.return_value = mock_sm

                    # Mock state inference
                    with patch('fsm.state_inference._get_or_infer_state', return_value='IN_PROGRESS'):
                        with patch('fsm.utils._get_initialization_transition_name', return_value='init_transition'):
                            # Call with both reason and context_data
                            get_or_initialize_state(
                                self.mock_entity,
                                user=None,
                                inferred_state='IN_PROGRESS',
                                reason=custom_reason,
                                context_data=custom_context_data,
                            )

                            # Verify execute_transition was called with both parameters
                            mock_sm.execute_transition.assert_called_once()
                            call_kwargs = mock_sm.execute_transition.call_args[1]
                            assert call_kwargs.get('reason') == custom_reason
                            assert call_kwargs.get('context_data') == custom_context_data

    def test_get_or_initialize_state_defaults_context_data_to_empty_dict(self):
        """Test that get_or_initialize_state defaults context_data to empty dict.

        This test validates step by step:
        - Calling get_or_initialize_state without context_data
        - Verifying empty dict is passed to StateManager.execute_transition

        Critical validation: When context_data is not provided, it should
        default to an empty dict (not None) to ensure proper merging behavior.
        """
        from fsm.utils import get_or_initialize_state

        with patch('fsm.utils.is_fsm_enabled', return_value=True):
            with patch('fsm.utils.CurrentContext') as mock_context:
                mock_context.is_fsm_disabled.return_value = False

                # Mock StateManager - patch where it's imported (fsm.state_manager)
                with patch('fsm.state_manager.get_state_manager') as mock_get_sm:
                    mock_sm = Mock()
                    mock_sm.get_current_state_value.return_value = None  # No existing state
                    mock_get_sm.return_value = mock_sm

                    # Mock state inference
                    with patch('fsm.state_inference._get_or_infer_state', return_value='IN_PROGRESS'):
                        with patch('fsm.utils._get_initialization_transition_name', return_value='init_transition'):
                            # Call without context_data
                            get_or_initialize_state(
                                self.mock_entity,
                                user=None,
                                inferred_state='IN_PROGRESS',
                            )

                            # Verify execute_transition was called with empty dict for context_data
                            mock_sm.execute_transition.assert_called_once()
                            call_kwargs = mock_sm.execute_transition.call_args[1]
                            assert call_kwargs.get('context_data') == {}
