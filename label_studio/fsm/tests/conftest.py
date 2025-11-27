"""
FSM Test Configuration.

Ensures proper test isolation for FSM tests.
"""

import logging
from copy import deepcopy

import pytest
from django.core.cache import cache
from fsm.registry import state_choices_registry, state_model_registry, transition_registry
from fsm.state_manager import StateManager

logger = logging.getLogger(__name__)


@pytest.fixture(autouse=True, scope='function')
def fsm_test_isolation():
    """
    Ensure test isolation by:
    1. Saving and restoring the transition registry
    2. Clearing CurrentContext and cache

    This prevents test leakage when tests clear the registry for their own purposes.
    """
    from core.current_request import CurrentContext

    # Restore original registry state after test to avoid test pollution
    original_transitions = deepcopy(transition_registry._transitions)
    original_state_choices = deepcopy(state_choices_registry._choices)
    original_state_models = deepcopy(state_model_registry._models)

    yield

    # Clear context and cache after test
    CurrentContext.clear()
    cache.clear()
    StateManager.clear_fsm_cache()
    transition_registry.clear()
    state_choices_registry.clear()
    state_model_registry.clear()

    transition_registry._transitions = original_transitions
    state_choices_registry._choices = original_state_choices
    state_model_registry._models = original_state_models
