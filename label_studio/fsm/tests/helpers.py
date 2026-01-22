"""
Test helper functions and assertion utilities for LSE FSM tests.

This module provides reusable helper functions for FSM testing, including:
- FSM state assertions for all entity types
- SDK client setup utilities
- Common test data factories
- State verification helpers
"""

import logging
from typing import Optional

from core.current_request import CurrentContext
from django.core.cache import cache
from fsm.state_manager import get_state_manager
from label_studio_sdk.client import LabelStudio
from projects.models import Project
from tasks.models import Annotation, AnnotationDraft, Task

logger = logging.getLogger(__name__)

# Get the configured StateManager
StateManager = get_state_manager()


# ============================================================================
# SDK Client Setup
# ============================================================================


def create_sdk_client(django_live_url: str, business_client) -> LabelStudio:
    """
    Create and configure an SDK client for testing.

    Args:
        django_live_url: Base URL for the Django test server
        business_client: Business client fixture with API key

    Returns:
        Configured LabelStudio SDK client
    """
    return LabelStudio(base_url=django_live_url, api_key=business_client.api_key)


def setup_fsm_context(user):
    """
    Set up CurrentContext for FSM operations.

    This ensures FSM transitions execute properly during tests by:
    - Setting the current user in CurrentContext
    - Clearing any existing cache

    Args:
        user: User instance to set as current user
    """
    CurrentContext.clear()
    cache.clear()
    CurrentContext.set_user(user)
    logger.info(
        f'FSM test context set up for user {user.id}',
        extra={'event': 'fsm.test_context_setup', 'user_id': user.id},
    )


# ============================================================================
# State Assertion Helpers
# ============================================================================


def assert_task_state(task_id: int, expected_state: str, msg: Optional[str] = None):
    """
    Assert that a task has the expected FSM state.

    This test validates step by step:
    - Task exists in database
    - Task has an FSM state record
    - FSM state matches expected value

    Args:
        task_id: Task ID to check
        expected_state: Expected TaskStateChoices value
        msg: Optional custom assertion message

    Raises:
        AssertionError: If state doesn't match expected value
    """
    task = Task.objects.get(id=task_id)
    actual_state = StateManager.get_current_state_value(task)

    error_msg = msg or f'Task {task_id} state mismatch: expected {expected_state}, got {actual_state}'
    assert actual_state == expected_state, error_msg

    logger.info(
        f'✓ Task {task_id} has correct state: {actual_state}',
        extra={
            'event': 'fsm.test_assertion_pass',
            'entity_type': 'task',
            'entity_id': task_id,
            'state': actual_state,
        },
    )


def assert_annotation_state(annotation_id: int, expected_state: str, msg: Optional[str] = None):
    """
    Assert that an annotation has the expected FSM state.

    This test validates step by step:
    - Annotation exists in database
    - Annotation has an FSM state record
    - FSM state matches expected value

    Args:
        annotation_id: Annotation ID to check
        expected_state: Expected AnnotationStateChoices value
        msg: Optional custom assertion message

    Raises:
        AssertionError: If state doesn't match expected value
    """
    annotation = Annotation.objects.get(id=annotation_id)
    actual_state = StateManager.get_current_state_value(annotation)

    error_msg = msg or f'Annotation {annotation_id} state mismatch: expected {expected_state}, got {actual_state}'
    assert actual_state == expected_state, error_msg

    logger.info(
        f'✓ Annotation {annotation_id} has correct state: {actual_state}',
        extra={
            'event': 'fsm.test_assertion_pass',
            'entity_type': 'annotation',
            'entity_id': annotation_id,
            'state': actual_state,
        },
    )


def assert_draft_state(draft_id: int, expected_state: str, msg: Optional[str] = None):
    """
    Assert that a draft has the expected FSM state.

    This test validates step by step:
    - Draft exists in database
    - Draft has an FSM state record
    - FSM state matches expected value

    Args:
        draft_id: AnnotationDraft ID to check
        expected_state: Expected AnnotationDraftStateChoices value
        msg: Optional custom assertion message

    Raises:
        AssertionError: If state doesn't match expected value
    """
    draft = AnnotationDraft.objects.get(id=draft_id)
    actual_state = StateManager.get_current_state_value(draft)

    error_msg = msg or f'Draft {draft_id} state mismatch: expected {expected_state}, got {actual_state}'
    assert actual_state == expected_state, error_msg

    logger.info(
        f'✓ Draft {draft_id} has correct state: {actual_state}',
        extra={
            'event': 'fsm.test_assertion_pass',
            'entity_type': 'draft',
            'entity_id': draft_id,
            'state': actual_state,
        },
    )


def assert_project_state(project_id: int, expected_state: str, msg: Optional[str] = None):
    """
    Assert that a project has the expected FSM state.

    This test validates step by step:
    - Project exists in database
    - Project has an FSM state record
    - FSM state matches expected value

    Args:
        project_id: Project ID to check
        expected_state: Expected ProjectStateChoices value
        msg: Optional custom assertion message

    Raises:
        AssertionError: If state doesn't match expected value
    """
    project = Project.objects.get(id=project_id)
    actual_state = StateManager.get_current_state_value(project)

    error_msg = msg or f'Project {project_id} state mismatch: expected {expected_state}, got {actual_state}'
    assert actual_state == expected_state, error_msg

    logger.info(
        f'✓ Project {project_id} has correct state: {actual_state}',
        extra={
            'event': 'fsm.test_assertion_pass',
            'entity_type': 'project',
            'entity_id': project_id,
            'state': actual_state,
        },
    )


def assert_state_exists(entity, entity_type: str = None):
    """
    Assert that an entity has an FSM state record.

    This test validates:
    - Entity has a state record in the FSM system
    - State is not None

    Args:
        entity: Entity instance (Task, Annotation, etc.)
        entity_type: Optional entity type string for better error messages

    Raises:
        AssertionError: If entity has no FSM state record
    """
    actual_state = StateManager.get_current_state_value(entity)
    entity_type = entity_type or entity._meta.label_lower

    assert actual_state is not None, f'{entity_type} {entity.id} has no FSM state record'

    logger.info(
        f'✓ {entity_type} {entity.id} has FSM state: {actual_state}',
        extra={
            'event': 'fsm.test_state_exists',
            'entity_type': entity_type,
            'entity_id': entity.id,
            'state': actual_state,
        },
    )


def assert_state_not_exists(entity, entity_type: str = None):
    """
    Assert that an entity does NOT have an FSM state record.

    Useful for testing scenarios where FSM should be skipped.

    Args:
        entity: Entity instance (Task, Annotation, etc.)
        entity_type: Optional entity type string for better error messages

    Raises:
        AssertionError: If entity has an FSM state record
    """
    actual_state = StateManager.get_current_state_value(entity)
    entity_type = entity_type or entity._meta.label_lower

    assert actual_state is None, f'{entity_type} {entity.id} unexpectedly has FSM state: {actual_state}'

    logger.info(
        f'✓ {entity_type} {entity.id} correctly has no FSM state',
        extra={
            'event': 'fsm.test_no_state',
            'entity_type': entity_type,
            'entity_id': entity.id,
        },
    )


# ============================================================================
# Common Test Label Configs
# ============================================================================

SIMPLE_TEXT_CLASSIFICATION_CONFIG = """
<View>
    <Text name="text" value="$text"/>
    <Choices name="sentiment" toName="text">
        <Choice value="positive"/>
        <Choice value="negative"/>
        <Choice value="neutral"/>
    </Choices>
</View>
"""

IMAGE_CLASSIFICATION_CONFIG = """
<View>
    <Image name="image" value="$image_url"/>
    <Choices name="label" toName="image">
        <Choice value="cat"/>
        <Choice value="dog"/>
        <Choice value="other"/>
    </Choices>
</View>
"""

NER_CONFIG = """
<View>
    <Text name="text" value="$text"/>
    <Labels name="label" toName="text">
        <Label value="Person"/>
        <Label value="Organization"/>
        <Label value="Location"/>
    </Labels>
</View>
"""
