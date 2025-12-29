"""
Task + annotation SDK workflow FSM tests (LSO base).
"""

import json

import pytest
from fsm.state_choices import AnnotationStateChoices, TaskStateChoices
from fsm.tests.helpers import (
    SIMPLE_TEXT_CLASSIFICATION_CONFIG,
    assert_annotation_state,
    assert_state_exists,
    assert_task_state,
    create_sdk_client,
    setup_fsm_context,
)
from label_studio_sdk.label_interface.objects import TaskValue
from tasks.models import Annotation, Task

pytestmark = pytest.mark.django_db


class TestTaskCreationWorkflows:
    """Test FSM state management for task creation workflows.

    Note: This class is written to be inheritable by LSE. All state assertions
    are routed through overridable class attributes/methods so LSE can keep the
    setup identical while changing expected states.
    """

    @pytest.fixture
    def ls(self, django_live_url, business_client):
        return create_sdk_client(django_live_url, business_client)

    @pytest.fixture
    def project_id(self, ls, business_client):
        setup_fsm_context(business_client.user)
        project = ls.projects.create(
            title='FSM Task Creation Test',
            label_config=SIMPLE_TEXT_CLASSIFICATION_CONFIG,
        )
        return project.id

    # Overridable assertion helpers / state choices for LSE inheritance.
    TaskStateChoices = TaskStateChoices
    AnnotationStateChoices = AnnotationStateChoices

    def expected_task_state_after_creation(self) -> str:
        """Return the expected task FSM state after task creation."""

        return self.TaskStateChoices.CREATED

    def assert_created_task_state(self, task_id: int):
        """Assert FSM state exists and matches expectations for a newly created task."""

        task_obj = Task.objects.get(id=task_id)
        assert_state_exists(task_obj, 'task')
        assert_task_state(task_id, self.expected_task_state_after_creation())

    def test_task_creation_via_sdk(self, ls, project_id):
        """Test task creation via SDK creates FSM state.

        This test validates step by step:
        - Creating a project with labeling configuration
        - Creating a task via SDK
        - Verifying task has FSM state record
        - Verifying task state is expected after creation

        Critical validation: Tasks created via SDK should immediately have FSM
        state records in the expected initial state.
        """

        # Create task via SDK
        task = ls.tasks.create(project=project_id, data={'text': 'Test task for FSM validation'})

        # Verify task has FSM state
        self.assert_created_task_state(task.id)

    def test_bulk_task_import_via_sdk(self, ls, project_id):
        """Test bulk task import creates FSM states for all tasks.

        This test validates step by step:
        - Creating a project
        - Importing multiple tasks via SDK import_tasks
        - Verifying each task has FSM state record
        - Verifying all tasks are in expected initial state

        Critical validation: Bulk imports should create FSM states for all
        imported tasks, not just individual creations.
        """

        # Prepare bulk task data
        tasks_to_import = [TaskValue(data={'text': f'Task {i}'}).model_dump() for i in range(5)]

        # Import tasks
        ls.projects.import_tasks(id=project_id, request=tasks_to_import)

        # Verify all tasks have FSM states
        tasks = Task.objects.filter(project_id=project_id)
        assert tasks.count() == 5

        for task in tasks:
            self.assert_created_task_state(task.id)

    def _setup_test_task_with_annotations_import(self, ls, project_id):

        task_with_annotation_json = """
        {
          "data": {"text": "Labeled task"},
          "annotations": [
            {
              "result": [
                {
                  "from_name": "sentiment",
                  "to_name": "text",
                  "type": "choices",
                  "value": {"choices": ["positive"]}
                }
              ],
              "ground_truth": true
            }
          ]
        }
        """.strip()
        task_with_annotation = json.loads(task_with_annotation_json)

        # Import task
        ls.projects.import_tasks(id=project_id, request=[task_with_annotation])

    def test_task_with_annotations_import(self, ls, project_id):
        """Test importing tasks with ground truth annotations.

        This test validates step by step:
        - Creating a project
        - Importing tasks with pre-existing annotations
        - Verifying task FSM state exists after import

        Critical validation: Tasks imported with annotations should still have
        task FSM state records created during import.
        """

        self._setup_test_task_with_annotations_import(ls, project_id)

        # Verify task FSM state exists
        task = Task.objects.get(project_id=project_id)
        assert_state_exists(task, 'task')
        assert_task_state(task.id, TaskStateChoices.COMPLETED)

        annotation = Annotation.objects.get(task_id=task.id)
        assert_state_exists(annotation, 'annotation')
        assert_annotation_state(annotation.id, AnnotationStateChoices.CREATED)
