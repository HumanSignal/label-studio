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

from label_studio.tests import conftest as ls_tests_conftest

logger = logging.getLogger(__name__)


# Re-export core fixtures from main LS test suite so FSM tests behave like OSS tests.
# NOTE: We alias the same underlying functions so pytest registers them as fixtures
# in this module as well (including their autouse behavior).
django_live_url = ls_tests_conftest.get_server_url
business_client = ls_tests_conftest.business_client

# Storage-related fixtures to mock cloud providers for import storages
aws_credentials = ls_tests_conftest.aws_credentials
s3 = ls_tests_conftest.s3
s3_with_images = ls_tests_conftest.s3_with_images
gcs_client = ls_tests_conftest.gcs_client
azure_client = ls_tests_conftest.azure_client


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
