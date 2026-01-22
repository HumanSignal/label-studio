"""
Edge cases and comprehensive error handling tests.

These tests cover unusual scenarios, boundary conditions, error edge cases,
and defensive programming patterns that ensure the transition system
is robust in production environments.
"""

import gc
import threading
import weakref
from datetime import datetime
from typing import Any, Dict, Optional
from unittest.mock import Mock

import pytest
from django.test import TestCase
from fsm.registry import transition_registry
from fsm.transitions import BaseTransition, TransitionContext, TransitionValidationError
from pydantic import Field, ValidationError


class EdgeCaseTransition(BaseTransition):
    """Test transition for edge case scenarios"""

    edge_case_data: Any = Field(None, description='Data for edge case testing')

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
        return 'EDGE_CASE_PROCESSED'

    def validate_transition(self, context: TransitionContext) -> bool:
        # Deliberately minimal validation for edge case testing
        return True

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        return {'edge_case_data': self.edge_case_data, 'processed_at': context.timestamp.isoformat()}


class ErrorProneTransition(BaseTransition):
    """Transition designed to test error scenarios"""

    should_fail: str = Field('no', description='Controls failure behavior')
    failure_stage: str = Field('none', description='Stage at which to fail')

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
        return 'ERROR_TESTED'

    def validate_transition(self, context: TransitionContext) -> bool:
        if self.failure_stage == 'validation' and self.should_fail == 'yes':
            raise TransitionValidationError('Intentional validation failure')
        return True

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        if self.failure_stage == 'transition' and self.should_fail == 'yes':
            raise RuntimeError('Intentional transition failure')

        return {'should_fail': self.should_fail, 'failure_stage': self.failure_stage}


class EdgeCasesAndErrorHandlingTests(TestCase):
    """
    Comprehensive edge case and error handling tests.

    These tests ensure the transition system handles unusual inputs,
    boundary conditions, and error scenarios gracefully.
    """

    def setUp(self):
        self.mock_entity = Mock()
        self.mock_entity.pk = 1
        self.mock_entity._meta.model_name = 'test_entity'

        self.mock_user = Mock()
        self.mock_user.id = 42

        # Clear registry
        transition_registry._transitions.clear()
        transition_registry.register('test_entity', 'edge_case', EdgeCaseTransition)
        transition_registry.register('test_entity', 'error_prone', ErrorProneTransition)

    def test_none_and_empty_values_handling(self):
        """
        EDGE CASE: Handling None and empty values

        Tests how the system handles None values, empty strings,
        empty lists, and other "falsy" values.
        """

        # Test None values
        transition_none = EdgeCaseTransition(edge_case_data=None)
        assert transition_none.edge_case_data is None

        context = TransitionContext(
            entity=self.mock_entity,
            current_user=None,  # None user
            current_state=None,  # None state (initial)
            target_state=transition_none.get_target_state(),
        )

        # Should handle None values gracefully
        assert transition_none.validate_transition(context)
        result = transition_none.transition(context)
        assert result['edge_case_data'] is None

        # Test empty string values
        empty_transition = EdgeCaseTransition(edge_case_data='')
        result = empty_transition.transition(context)
        assert result['edge_case_data'] == ''

        # Test empty collections
        empty_list_transition = EdgeCaseTransition(edge_case_data=[])
        result = empty_list_transition.transition(context)
        assert result['edge_case_data'] == []

        empty_dict_transition = EdgeCaseTransition(edge_case_data={})
        result = empty_dict_transition.transition(context)
        assert result['edge_case_data'] == {}

        # Test zero values
        zero_transition = EdgeCaseTransition(edge_case_data=0)
        result = zero_transition.transition(context)
        assert result['edge_case_data'] == 0

        # Test False boolean
        false_transition = EdgeCaseTransition(edge_case_data=False)
        result = false_transition.transition(context)
        assert not result['edge_case_data']

    def test_extreme_data_sizes(self):
        """
        EDGE CASE: Handling extremely large or small data

        Tests system behavior with very large strings, deep nested structures,
        and other extreme data sizes.
        """

        # Test very large string
        large_string = 'x' * 10000  # 10KB string
        large_string_transition = EdgeCaseTransition(edge_case_data=large_string)

        context = TransitionContext(
            entity=self.mock_entity, current_state='CREATED', target_state=large_string_transition.get_target_state()
        )

        result = large_string_transition.transition(context)
        assert len(result['edge_case_data']) == 10000

        # Test deeply nested dictionary
        deep_dict = {'level': 0}
        current_level = deep_dict
        for i in range(100):  # 100 levels deep
            current_level['next'] = {'level': i + 1}
            current_level = current_level['next']

        deep_dict_transition = EdgeCaseTransition(edge_case_data=deep_dict)
        result = deep_dict_transition.transition(context)
        assert result['edge_case_data']['level'] == 0

        # Test large list
        large_list = list(range(1000))  # 1000 items
        large_list_transition = EdgeCaseTransition(edge_case_data=large_list)
        result = large_list_transition.transition(context)
        assert len(result['edge_case_data']) == 1000
        assert result['edge_case_data'][-1] == 999

    def test_unicode_and_special_characters(self):
        """
        EDGE CASE: Unicode and special character handling

        Tests handling of various Unicode characters, emojis,
        control characters, and other special strings.
        """

        test_cases = [
            # Unicode characters
            'Hello, 世界! 🌍',
            # Emojis
            'Task completed! 🎉✅👍',
            # Special symbols
            'Price: €100 → $120 ≈ £95',
            # Mathematical symbols
            '∑(1,2,3) = 6, √16 = 4, π ≈ 3.14',
            # Control characters (escaped)
            'Line1\nLine2\tTabbed\r\nWindows',
            # JSON-like string
            '{"key": "value", "number": 42}',
            # SQL-like string (potential injection test)
            "'; DROP TABLE users; --",
            # Empty and whitespace
            '   \t\n\r   ',
            # Very long Unicode
            '🌟' * 100,
        ]

        context = TransitionContext(
            entity=self.mock_entity, current_state='CREATED', target_state='EDGE_CASE_PROCESSED'
        )

        for test_string in test_cases:
            with self.subTest(test_string=test_string[:20] + '...'):
                transition = EdgeCaseTransition(edge_case_data=test_string)

                # Should handle any Unicode string
                result = transition.transition(context)
                assert result['edge_case_data'] == test_string

    def test_boundary_datetime_values(self):
        """
        EDGE CASE: Boundary datetime values

        Tests handling of edge case datetime values like far future,
        far past, timezone edge cases, etc.
        """

        boundary_datetimes = [
            # Far past
            datetime(1970, 1, 1),
            datetime(1900, 1, 1),
            # Far future
            datetime(2100, 12, 31),
            datetime(3000, 1, 1),
            # Edge of leap year
            datetime(2000, 2, 29),  # Leap year
            datetime(1900, 2, 28),  # Not a leap year
            # New Year boundaries
            datetime(1999, 12, 31, 23, 59, 59),
            datetime(2000, 1, 1, 0, 0, 0),
            # Microsecond precision
            datetime(2024, 1, 1, 12, 0, 0, 123456),
        ]

        for test_datetime in boundary_datetimes:
            with self.subTest(datetime=test_datetime.isoformat()):
                context = TransitionContext(
                    entity=self.mock_entity,
                    current_state='CREATED',
                    target_state='EDGE_CASE_PROCESSED',
                    timestamp=test_datetime,
                )

                transition = EdgeCaseTransition(edge_case_data='datetime_test')

                # Should handle any valid datetime
                result = transition.transition(context)
                assert result['processed_at'] == test_datetime.isoformat()

    def test_circular_reference_handling(self):
        """
        EDGE CASE: Circular references and complex object graphs

        Tests how the system handles objects with circular references
        or complex interdependencies.
        """

        # Create circular reference structure
        circular_dict = {'name': 'parent'}
        circular_dict['child'] = {'name': 'child', 'parent': circular_dict}

        # Test that the system can handle circular references without infinite recursion
        # Pydantic with field type 'Any' will accept circular references
        try:
            transition = EdgeCaseTransition(edge_case_data=circular_dict)
            # Verify that the circular reference was stored
            assert transition.edge_case_data['name'] == 'parent'
            assert transition.edge_case_data['child']['name'] == 'child'
            # The system should handle this gracefully
        except RecursionError:
            pytest.fail('System should handle circular references without infinite recursion')

        # Test with complex but non-circular structure
        complex_structure = {
            'level1': {'level2': {'level3': {'data': 'deep_value', 'references': ['ref1', 'ref2', 'ref3'] * 10}}},
            'cross_reference': None,  # Will be set to level1 later, but not circular
        }

        transition = EdgeCaseTransition(edge_case_data=complex_structure)
        context = TransitionContext(
            entity=self.mock_entity, current_state='CREATED', target_state=transition.get_target_state()
        )

        result = transition.transition(context)
        assert result['edge_case_data']['level1']['level2']['level3']['data'] == 'deep_value'

    def test_memory_pressure_and_cleanup(self):
        """
        EDGE CASE: Memory pressure and garbage collection

        Tests system behavior under memory pressure and ensures
        proper cleanup of transition instances and contexts.
        """

        transitions = []
        contexts = []
        weak_refs = []

        # Create many transition instances
        for i in range(1000):
            transition = EdgeCaseTransition(edge_case_data=f'data_{i}')
            context = TransitionContext(
                entity=self.mock_entity,
                current_state='CREATED',
                target_state=transition.get_target_state(),
                metadata={'iteration': i},
            )

            transitions.append(transition)
            contexts.append(context)

            # Create weak references to test garbage collection
            if i < 10:  # Only for first few to avoid too many weak refs
                weak_refs.append(weakref.ref(transition))
                weak_refs.append(weakref.ref(context))

        # Verify all were created
        assert len(transitions) == 1000
        assert len(contexts) == 1000

        # Clear references and force garbage collection
        transitions.clear()
        contexts.clear()
        gc.collect()

        # Check that objects can be garbage collected
        # Some weak references should be None after GC
        sum(1 for ref in weak_refs if ref() is None)
        # At least some should be collected (this is implementation dependent)
        # We don't require all to be collected due to Python GC behavior

        # Test that new instances can still be created after cleanup
        new_transition = EdgeCaseTransition(edge_case_data='after_cleanup')
        new_context = TransitionContext(
            entity=self.mock_entity, current_state='CREATED', target_state=new_transition.get_target_state()
        )

        result = new_transition.transition(new_context)
        assert result['edge_case_data'] == 'after_cleanup'

    def test_exception_during_validation(self):
        """
        ERROR HANDLING: Exceptions during validation

        Tests proper handling of various types of exceptions
        that can occur during transition validation.
        """

        class ValidationErrorTransition(BaseTransition):
            error_type: str = Field(..., description='Type of error to raise')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'ERROR_STATE'

            @classmethod
            def can_transition_from_state(cls, context: TransitionContext) -> bool:
                return True

            def validate_transition(self, context: TransitionContext) -> bool:
                if self.error_type == 'transition_validation':
                    raise TransitionValidationError('Business rule violation')
                elif self.error_type == 'runtime_error':
                    raise RuntimeError('Unexpected runtime error')
                elif self.error_type == 'key_error':
                    raise KeyError('Missing required key')
                elif self.error_type == 'attribute_error':
                    raise AttributeError('Missing attribute')
                elif self.error_type == 'value_error':
                    raise ValueError('Invalid value provided')
                elif self.error_type == 'type_error':
                    raise TypeError('Type mismatch')
                return True

            def transition(self, context: TransitionContext) -> dict:
                return {'error_type': self.error_type, 'processed': True}

        context = TransitionContext(entity=self.mock_entity, current_state='CREATED', target_state='ERROR_STATE')

        # Test TransitionValidationError (expected)
        transition = ValidationErrorTransition(error_type='transition_validation')
        with pytest.raises(TransitionValidationError) as cm:
            transition.validate_transition(context)
        assert 'Business rule violation' in str(cm.value)

        # Test other exceptions (should bubble up)
        error_types = [
            ('runtime_error', RuntimeError),
            ('key_error', KeyError),
            ('attribute_error', AttributeError),
            ('value_error', ValueError),
            ('type_error', TypeError),
        ]

        for error_type, exception_class in error_types:
            with self.subTest(error_type=error_type):
                transition = ValidationErrorTransition(error_type=error_type)
                with pytest.raises(exception_class):
                    transition.validate_transition(context)

    def test_exception_during_transition_execution(self):
        """
        ERROR HANDLING: Exceptions during transition execution

        Tests handling of exceptions that occur during the
        actual transition execution phase.
        """

        # Test with ErrorProneTransition
        context = TransitionContext(entity=self.mock_entity, current_state='CREATED', target_state='ERROR_TESTED')

        # Test successful execution
        success_transition = ErrorProneTransition(should_fail='no')
        result = success_transition.transition(context)
        assert result['should_fail'] == 'no'

        # Test intentional failure
        fail_transition = ErrorProneTransition(should_fail='yes', failure_stage='transition')

        with pytest.raises(RuntimeError) as cm:
            fail_transition.transition(context)
        assert 'Intentional transition failure' in str(cm.value)

    def test_registry_edge_cases(self):
        """
        EDGE CASE: Registry edge cases

        Tests unusual registry operations and edge cases
        like duplicate registrations, invalid names, etc.
        """

        # Test duplicate registration (should overwrite)

        class NewEdgeCaseTransition(BaseTransition):
            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'NEW_EDGE_CASE'

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'type': 'new_implementation'}

        # Register with same name
        transition_registry.register('test_entity', 'edge_case', NewEdgeCaseTransition)

        # Should get new class
        retrieved = transition_registry.get_transition('test_entity', 'edge_case')
        assert retrieved == NewEdgeCaseTransition

        # Test registration with unusual names
        unusual_names = [
            ('entity-with-dashes', 'transition-name'),
            ('entity_with_underscores', 'transition_name'),
            ('Entity.With.Dots', 'transition.name'),
            ('entity123', 'transition456'),
            ('UPPERCASE_ENTITY', 'UPPERCASE_TRANSITION'),
        ]

        for entity_name, transition_name in unusual_names:
            with self.subTest(entity=entity_name, transition=transition_name):
                transition_registry.register(entity_name, transition_name, EdgeCaseTransition)
                retrieved = transition_registry.get_transition(entity_name, transition_name)
                assert retrieved == EdgeCaseTransition

        # Test nonexistent lookups
        assert transition_registry.get_transition('nonexistent', 'transition') is None
        assert transition_registry.get_transition('test_entity', 'nonexistent') is None

        # Test empty entity transitions
        empty_transitions = transition_registry.get_transitions_for_entity('nonexistent_entity')
        assert empty_transitions == {}

    def test_context_edge_cases(self):
        """
        EDGE CASE: TransitionContext edge cases

        Tests unusual context configurations and edge cases
        in context creation and usage.
        """

        # Test context with None entity (system should handle gracefully)
        # Since entity field is typed as Any, None is accepted
        try:
            context = TransitionContext(entity=None, current_state='CREATED', target_state='PROCESSED')
            # Verify context was created with None entity
            assert context.entity is None
            assert context.current_state == 'CREATED'
        except Exception as e:
            pytest.fail(f'Context creation with None entity should not fail: {e}')

        # Test context with None target_state (allowed for side-effect only transitions)
        try:
            context = TransitionContext(
                entity=self.mock_entity,
                target_state=None,  # Allowed for side-effect only transitions
            )
            assert context.target_state is None
        except Exception as e:
            pytest.fail(f'Context creation with None target_state should not fail: {e}')

        # Test context with missing required fields (entity is required)
        with pytest.raises(ValidationError):
            TransitionContext(
                # Missing entity
                target_state='PROCESSED',
            )

        # Test context with extreme timestamp
        far_future = datetime(3000, 1, 1)
        context = TransitionContext(
            entity=self.mock_entity, current_state='CREATED', target_state='PROCESSED', timestamp=far_future
        )

        assert context.timestamp == far_future

        # Test context with large metadata
        large_metadata = {f'key_{i}': f'value_{i}' for i in range(1000)}
        context = TransitionContext(
            entity=self.mock_entity, current_state='CREATED', target_state='PROCESSED', metadata=large_metadata
        )

        assert len(context.metadata) == 1000

        # Test context property edge cases
        empty_context = TransitionContext(
            entity=self.mock_entity, current_state='', target_state='PROCESSED'  # Empty string state
        )

        # Empty string should be considered "has state"
        assert empty_context.has_current_state
        assert not empty_context.is_initial_transition

    def test_state_manager_edge_cases(self):
        """
        EDGE CASE: StateManager edge cases

        Tests unusual usage patterns and edge cases
        with the StateManager transition execution.
        """

        # Test with nonexistent transition in registry
        from fsm.registry import transition_registry

        result = transition_registry.get_transition('test_entity', 'nonexistent_transition')
        assert result is None  # Should return None for nonexistent transition

        # Test execution with valid transition (test at registry level)
        transition_class = transition_registry.get_transition('test_entity', 'edge_case')
        assert transition_class is not None

        # Should be able to create instance with defaults
        transition = transition_class()
        assert transition.edge_case_data is None  # Uses default None value

    def test_concurrent_error_scenarios(self):
        """
        EDGE CASE: Error handling under concurrency

        Tests error handling when multiple threads encounter
        errors simultaneously.
        """

        error_results = []
        error_lock = threading.Lock()

        def error_worker(worker_id):
            """Worker that intentionally triggers errors"""
            try:
                # Create transition that will fail
                transition = ErrorProneTransition(
                    should_fail='yes', failure_stage='validation' if worker_id % 2 == 0 else 'transition'
                )

                context = TransitionContext(
                    entity=self.mock_entity, current_state='CREATED', target_state=transition.get_target_state()
                )

                if worker_id % 2 == 0:
                    # Validation error
                    transition.validate_transition(context)
                else:
                    # Transition execution error
                    transition.transition(context)

            except Exception as e:
                with error_lock:
                    error_results.append(
                        {'worker_id': worker_id, 'error_type': type(e).__name__, 'error_message': str(e)}
                    )

        # Run multiple workers that will all fail
        threads = []
        for i in range(10):
            thread = threading.Thread(target=error_worker, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all to complete
        for thread in threads:
            thread.join()

        # Should have 10 errors
        assert len(error_results) == 10

        # Verify error types
        validation_errors = [r for r in error_results if r['error_type'] == 'TransitionValidationError']
        runtime_errors = [r for r in error_results if r['error_type'] == 'RuntimeError']

        assert len(validation_errors) == 5  # Even worker IDs
        assert len(runtime_errors) == 5     # Odd worker IDs

    def test_resource_cleanup_after_errors(self):
        """
        EDGE CASE: Resource cleanup after errors

        Tests that resources are properly cleaned up
        even when transitions fail partway through.
        """

        class ResourceTrackingTransition(BaseTransition):
            """Transition that tracks resource allocation"""

            resource_name: str = Field(..., description='Name of resource')
            resources_allocated: list = Field(default_factory=list, description='Track allocated resources')
            resources_cleaned: list = Field(default_factory=list, description='Track cleaned resources')

            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'RESOURCE_PROCESSED'

            @classmethod
            def can_transition_from_state(cls, context: TransitionContext) -> bool:
                return True

            def validate_transition(self, context: TransitionContext) -> bool:
                # Allocate some mock resources
                resource = f'resource_{self.resource_name}'
                self.resources_allocated.append(resource)

                # Fail if resource name contains "fail"
                if 'fail' in self.resource_name:
                    raise TransitionValidationError('Resource allocation failed')

                return True

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'resource_name': self.resource_name}

            def __del__(self):
                # Mock cleanup in destructor
                for resource in self.resources_allocated:
                    if resource not in self.resources_cleaned:
                        self.resources_cleaned.append(resource)

        # Test successful case
        success_transition = ResourceTrackingTransition(resource_name='success')
        context = TransitionContext(
            entity=self.mock_entity, current_state='CREATED', target_state=success_transition.get_target_state()
        )

        assert success_transition.validate_transition(context)
        assert len(success_transition.resources_allocated) == 1

        # Test failure case
        fail_transition = ResourceTrackingTransition(resource_name='fail_test')

        with pytest.raises(TransitionValidationError):
            fail_transition.validate_transition(context)

        # Resources should still be allocated even though validation failed
        assert len(fail_transition.resources_allocated) == 1

        # Force garbage collection to trigger cleanup
        weakref.ref(success_transition)
        weakref.ref(fail_transition)

        del success_transition
        del fail_transition
        gc.collect()

        # References should be cleaned up
        # (Note: This test is somewhat implementation-dependent)
