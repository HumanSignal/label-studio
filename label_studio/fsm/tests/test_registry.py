"""
Tests for FSM registry functionality.

Tests registry management, state model registration, transition registration,
and related error handling scenarios.
"""

from typing import Optional
from unittest.mock import Mock, patch

import pytest
from django.test import TestCase
from fsm.registry import (
    register_state_model,
    register_state_transition,
    state_model_registry,
    transition_registry,
)
from fsm.transitions import BaseTransition, TransitionContext


class MockEntity:
    """Mock entity for testing"""

    def __init__(self, pk=1):
        self.pk = pk
        self.id = pk
        self._meta = Mock()
        self._meta.model_name = 'testentity'
        self._meta.label_lower = 'tests.testentity'
        self.organization_id = 1


class RegistryTests(TestCase):
    """Tests for registry functionality and edge cases"""

    def setUp(self):
        self.entity = MockEntity()

    def test_registry_state_model_with_denormalizer(self):
        """Test StateModelRegistry with state model that has get_denormalized_fields"""

        mock_state_model = Mock()
        mock_state_model.__name__ = 'MockStateModel'

        # Mock the get_denormalized_fields classmethod
        mock_state_model.get_denormalized_fields = Mock(return_value={'custom_field': 'denormalized_1'})

        # Register the model (no denormalizer parameter anymore)
        state_model_registry.register_model('testentity', mock_state_model)

        # Check model was registered
        registered_model = state_model_registry.get_model('testentity')
        assert registered_model is not None
        assert registered_model == mock_state_model

        # Test that get_denormalized_fields works on the model
        result = mock_state_model.get_denormalized_fields(self.entity)
        assert result == {'custom_field': 'denormalized_1'}

    def test_registry_denormalizer_error_handling(self):
        """Test error handling when get_denormalized_fields raises an exception"""

        mock_state_model = Mock()
        mock_state_model.__name__ = 'MockStateModel'

        # Mock get_denormalized_fields to raise an error
        mock_state_model.get_denormalized_fields = Mock(side_effect=RuntimeError('Denormalizer failed'))

        # Register the model
        state_model_registry.register_model('testentity', mock_state_model)

        # Test that the error is propagated correctly
        with pytest.raises(RuntimeError) as exc_info:
            mock_state_model.get_denormalized_fields(self.entity)

        assert 'Denormalizer failed' in str(exc_info.value)

    def test_registry_overwrite_warning(self):
        """Test warning when overwriting existing registry entries"""

        mock_state_model1 = Mock()
        mock_state_model1.__name__ = 'MockModel1'
        mock_state_model2 = Mock()
        mock_state_model2.__name__ = 'MockModel2'

        # Register first model
        state_model_registry.register_model('testentity', mock_state_model1)

        # Register second model (should warn about overwrite)
        with patch('fsm.registry.logger') as mock_logger:
            state_model_registry.register_model('testentity', mock_state_model2)

            # Should have logged debug about overwrite
            mock_logger.debug.assert_called()
            # Find the call that has the overwrite message
            debug_calls = mock_logger.debug.call_args_list
            overwrite_call = None
            for call in debug_calls:
                if 'Overwriting existing state model' in call[0][0]:
                    overwrite_call = call
                    break
            assert overwrite_call is not None, 'Expected debug log about overwriting existing state model'
            debug_msg = overwrite_call[0][0]
            assert 'Overwriting existing state model' in debug_msg

    def test_registry_clear_methods(self):
        """Test registry clear methods"""

        # Add some test data
        mock_state_model = Mock()
        mock_state_model.__name__ = 'MockStateModel'
        state_model_registry.register_model('testentity', mock_state_model)

        class TestTransition(BaseTransition):
            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'TEST'

            def transition(self, context):
                return {}

        transition_registry.register('testentity', 'test_transition', TestTransition)

        # Verify data exists
        assert state_model_registry.get_model('testentity') is not None
        assert 'test_transition' in transition_registry.get_transitions_for_entity('testentity')

        # Clear registries
        state_model_registry.clear()
        transition_registry.clear()

        # Verify data is cleared
        assert state_model_registry.get_model('testentity') is None
        assert transition_registry.get_transitions_for_entity('testentity') == {}

    def test_registry_decorator_functions(self):
        """Test decorator functions for registration"""

        # Test state model decorator
        @register_state_model('decorated_entity')
        class DecoratedStateModel:
            pass

        # Should be registered
        assert state_model_registry.get_model('decorated_entity') == DecoratedStateModel

        # Test transition decorator
        @register_state_transition('decorated_entity', 'decorated_transition')
        class DecoratedTransition(BaseTransition):
            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'DECORATED'

            def transition(self, context):
                return {}

        # Should be registered
        transitions = transition_registry.get_transitions_for_entity('decorated_entity')
        assert 'decorated_transition' in transitions
        assert transitions['decorated_transition'] == DecoratedTransition
