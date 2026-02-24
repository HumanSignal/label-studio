"""
Root conftest for the label_studio package.

Ensures CurrentContext is cleared after every test to prevent leakage across tests.
With Postgres, test transactions are rolled back so User rows are removed, but
thread-local CurrentContext can still hold a stale User instance. The next test
then triggers FSM (e.g. on project save), which uses that user as triggered_by_id,
causing IntegrityError because the user row no longer exists.
"""

import pytest


@pytest.fixture(autouse=True)
def clear_current_context_after_test():
    """Clear thread-local CurrentContext after each test to prevent FK violations on Postgres."""
    yield
    from core.current_request import CurrentContext

    CurrentContext.clear()
