"""
LSO FSM Workflow Tests

Tests FSM state tracking through realistic user workflows using the SDK/API.
Validates that FSM correctly tracks state changes during actual user journeys.

This test file focuses on LSO-specific functionality:
- Project lifecycle: CREATED -> IN_PROGRESS -> COMPLETED
- Task lifecycle: CREATED -> COMPLETED -> IN_PROGRESS -> COMPLETED
- Annotation lifecycle: CREATED (on create), CREATED (on update)

LSE-specific transitions (reviews, project settings, annotation drafts) are tested in LSE.
"""

import pytest
from fsm.state_choices import AnnotationStateChoices, ProjectStateChoices, TaskStateChoices
from fsm.state_manager import StateManager
from label_studio_sdk.client import LabelStudio
from projects.models import Project
from tasks.models import Annotation, Task

pytestmark = pytest.mark.django_db


# Helper functions


def assert_project_state(project_id, expected_state):
    """Assert project has expected FSM state"""
    project = Project.objects.get(pk=project_id)
    actual = StateManager.get_current_state_value(project)
    assert actual == expected_state, f'Expected project state {expected_state}, got {actual}'


def assert_task_state(task_id, expected_state):
    """Assert task has expected FSM state"""
    task = Task.objects.get(pk=task_id)
    actual = StateManager.get_current_state_value(task)
    assert actual == expected_state, f'Expected task state {expected_state}, got {actual}'


def assert_annotation_state(annotation_id, expected_state):
    """Assert annotation has expected FSM state"""
    annotation = Annotation.objects.get(pk=annotation_id)
    actual = StateManager.get_current_state_value(annotation)
    assert actual == expected_state, f'Expected annotation state {expected_state}, got {actual}'


class TestProjectWorkflows:
    """Test project FSM state tracking through realistic workflows"""

    def test_project_creation_workflow(self, django_live_url, business_client):
        """
        User creates project -> Project state = CREATED

        Validates:
        - Project is created with CREATED state
        - FSM captures project creation
        """
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        # Create project via SDK
        project = ls.projects.create(
            title='Test Project - Creation Workflow',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
        )

        # Verify project state
        assert_project_state(project.id, ProjectStateChoices.CREATED)

    def test_project_in_progress_workflow(self, django_live_url, business_client):
        """
        First annotation on any task -> Project CREATED -> IN_PROGRESS

        Validates:
        - Project starts in CREATED state
        - First annotation submission triggers project IN_PROGRESS
        - Task transitions to COMPLETED
        """
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        # Create project and tasks
        project = ls.projects.create(
            title='Test Project - In Progress Workflow',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
        )
        ls.tasks.create(project=project.id, data={'text': 'Task 1'})
        ls.tasks.create(project=project.id, data={'text': 'Task 2'})

        # Verify initial states
        assert_project_state(project.id, ProjectStateChoices.CREATED)
        tasks = list(ls.tasks.list(project=project.id))
        assert len(tasks) == 2
        assert_task_state(tasks[0].id, TaskStateChoices.CREATED)

        # Submit annotation on first task
        ls.annotations.create(
            id=tasks[0].id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )

        # Verify task completed and project in progress
        assert_task_state(tasks[0].id, TaskStateChoices.COMPLETED)
        assert_project_state(project.id, ProjectStateChoices.IN_PROGRESS)

    def test_project_completion_workflow(self, django_live_url, business_client):
        """
        All tasks completed -> Project IN_PROGRESS -> COMPLETED

        Validates:
        - Project moves to COMPLETED when all tasks are completed
        """
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        # Create project and tasks
        project = ls.projects.create(
            title='Test Project - Completion Workflow',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
        )
        ls.tasks.create(project=project.id, data={'text': 'Task 1'})
        ls.tasks.create(project=project.id, data={'text': 'Task 2'})

        tasks = list(ls.tasks.list(project=project.id))

        # Submit annotation on first task -> project IN_PROGRESS
        ls.annotations.create(
            id=tasks[0].id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )
        assert_project_state(project.id, ProjectStateChoices.IN_PROGRESS)

        # Submit annotation on second task -> project COMPLETED
        ls.annotations.create(
            id=tasks[1].id,
            result=[{'value': {'choices': ['negative']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )

        # Verify all tasks completed and project completed
        assert_task_state(tasks[0].id, TaskStateChoices.COMPLETED)
        assert_task_state(tasks[1].id, TaskStateChoices.COMPLETED)
        assert_project_state(project.id, ProjectStateChoices.COMPLETED)

    def test_project_back_to_in_progress_workflow(self, django_live_url, business_client):
        """
        Task becomes incomplete -> Project COMPLETED -> IN_PROGRESS

        Validates:
        - Deleting annotations from a task moves task to IN_PROGRESS
        - Project transitions back to IN_PROGRESS when any task is incomplete
        """
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        # Create project and tasks
        project = ls.projects.create(
            title='Test Project - Back to In Progress',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
        )
        ls.tasks.create(project=project.id, data={'text': 'Task 1'})
        ls.tasks.create(project=project.id, data={'text': 'Task 2'})

        tasks = list(ls.tasks.list(project=project.id))

        # Complete both tasks
        annotation1 = ls.annotations.create(
            id=tasks[0].id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )
        ls.annotations.create(
            id=tasks[1].id,
            result=[{'value': {'choices': ['negative']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )
        assert_project_state(project.id, ProjectStateChoices.COMPLETED)

        # Delete annotation from first task
        ls.annotations.delete(id=annotation1.id)

        # Verify task moved to IN_PROGRESS and project back to IN_PROGRESS
        assert_task_state(tasks[0].id, TaskStateChoices.IN_PROGRESS)
        assert_project_state(project.id, ProjectStateChoices.IN_PROGRESS)


class TestTaskWorkflows:
    """Test task FSM state tracking through realistic workflows"""

    def test_task_import_workflow(self, django_live_url, business_client):
        """
        User imports tasks -> Each task state = CREATED

        Validates:
        - Tasks are created with CREATED state
        - FSM captures task creation
        """
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        project = ls.projects.create(
            title='Test Project - Task Import',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
        )

        # Create tasks via SDK
        ls.tasks.create(project=project.id, data={'text': 'Task 1'})
        ls.tasks.create(project=project.id, data={'text': 'Task 2'})
        ls.tasks.create(project=project.id, data={'text': 'Task 3'})

        # Verify all tasks are CREATED
        tasks = list(ls.tasks.list(project=project.id))
        assert len(tasks) == 3
        for task in tasks:
            assert_task_state(task.id, TaskStateChoices.CREATED)

    def test_task_completion_workflow(self, django_live_url, business_client):
        """
        First annotation submitted -> Task CREATED -> COMPLETED

        Validates:
        - Task transitions to COMPLETED when annotation is submitted
        - Annotation is in CREATED state
        """
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        project = ls.projects.create(
            title='Test Project - Task Completion',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
        )
        ls.tasks.create(project=project.id, data={'text': 'Task 1'})

        tasks = list(ls.tasks.list(project=project.id))
        task_id = tasks[0].id

        # Verify initial state
        assert_task_state(task_id, TaskStateChoices.CREATED)

        # Submit annotation
        annotation = ls.annotations.create(
            id=task_id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )

        # Verify task completed
        assert_task_state(task_id, TaskStateChoices.COMPLETED)
        assert_annotation_state(annotation.id, AnnotationStateChoices.CREATED)

    def test_task_in_progress_workflow(self, django_live_url, business_client):
        """
        All annotations deleted -> Task COMPLETED -> IN_PROGRESS

        Validates:
        - Task transitions to IN_PROGRESS when all annotations are deleted
        """
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        project = ls.projects.create(
            title='Test Project - Task In Progress',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
        )
        ls.tasks.create(project=project.id, data={'text': 'Task 1'})

        tasks = list(ls.tasks.list(project=project.id))
        task_id = tasks[0].id

        # Submit and verify completion
        annotation = ls.annotations.create(
            id=task_id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )
        assert_task_state(task_id, TaskStateChoices.COMPLETED)

        # Delete annotation
        ls.annotations.delete(id=annotation.id)

        # Verify task in progress
        assert_task_state(task_id, TaskStateChoices.IN_PROGRESS)

    def test_task_re_completion_workflow(self, django_live_url, business_client):
        """
        Annotation submitted on IN_PROGRESS task -> Task IN_PROGRESS -> COMPLETED

        Validates:
        - Task can transition back to COMPLETED after being IN_PROGRESS
        """
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        project = ls.projects.create(
            title='Test Project - Task Re-completion',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
        )
        ls.tasks.create(project=project.id, data={'text': 'Task 1'})

        tasks = list(ls.tasks.list(project=project.id))
        task_id = tasks[0].id

        # Submit, delete, verify IN_PROGRESS
        annotation1 = ls.annotations.create(
            id=task_id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )
        ls.annotations.delete(id=annotation1.id)
        assert_task_state(task_id, TaskStateChoices.IN_PROGRESS)

        # Re-submit annotation
        ls.annotations.create(
            id=task_id,
            result=[{'value': {'choices': ['negative']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )

        # Verify task completed again
        assert_task_state(task_id, TaskStateChoices.COMPLETED)


class TestAnnotationWorkflows:
    """Test annotation FSM state tracking through realistic workflows"""

    def test_annotation_submission_workflow(self, django_live_url, business_client):
        """
        User submits annotation -> Annotation state = CREATED

        Validates:
        - Annotation is created with CREATED state
        - FSM captures annotation creation
        """
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        project = ls.projects.create(
            title='Test Project - Annotation Submission',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
        )
        ls.tasks.create(project=project.id, data={'text': 'Task 1'})

        tasks = list(ls.tasks.list(project=project.id))

        # Submit annotation
        annotation = ls.annotations.create(
            id=tasks[0].id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )

        # Verify annotation state
        assert_annotation_state(annotation.id, AnnotationStateChoices.CREATED)

        # Verify FSM state record count
        annotation_obj = Annotation.objects.get(pk=annotation.id)
        state_count = StateManager.get_state_history(annotation_obj).count()
        assert state_count == 1, f'Expected 1 state record, got {state_count}'

    def test_annotation_update_workflow(self, django_live_url, business_client):
        """
        User updates annotation -> New state record (still CREATED)

        Validates:
        - Annotation update creates new FSM state record
        - State remains CREATED
        """
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        project = ls.projects.create(
            title='Test Project - Annotation Update',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
        )
        ls.tasks.create(project=project.id, data={'text': 'Task 1'})

        tasks = list(ls.tasks.list(project=project.id))

        # Submit annotation
        annotation = ls.annotations.create(
            id=tasks[0].id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )
        assert_annotation_state(annotation.id, AnnotationStateChoices.CREATED)

        # Update annotation
        ls.annotations.update(
            id=annotation.id,
            result=[{'value': {'choices': ['negative']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
        )

        # Verify state still CREATED but new state record created
        assert_annotation_state(annotation.id, AnnotationStateChoices.CREATED)
        annotation_obj = Annotation.objects.get(pk=annotation.id)
        state_count = StateManager.get_state_history(annotation_obj).count()
        assert state_count == 2, f'Expected 2 state records, got {state_count}'


class TestEndToEndWorkflows:
    """Test complete end-to-end workflows"""

    def test_complete_annotation_journey(self, django_live_url, business_client):
        """
        Complete workflow:
        1. Create project -> Project CREATED
        2. Import 2 tasks -> Tasks CREATED
        3. Submit annotation on task1 -> Task1 COMPLETED, Project IN_PROGRESS
        4. Submit annotation on task2 -> Task2 COMPLETED, Project COMPLETED
        5. Delete annotation from task1 -> Task1 IN_PROGRESS, Project IN_PROGRESS
        6. Re-submit annotation on task1 -> Task1 COMPLETED, Project COMPLETED

        Validates the complete FSM state flow for a typical annotation journey.
        """
        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        # Step 1: Create project
        project = ls.projects.create(
            title='Test Project - Complete Journey',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
        )
        assert_project_state(project.id, ProjectStateChoices.CREATED)

        # Step 2: Create 2 tasks
        ls.tasks.create(project=project.id, data={'text': 'Task 1'})
        ls.tasks.create(project=project.id, data={'text': 'Task 2'})
        tasks = list(ls.tasks.list(project=project.id))
        assert len(tasks) == 2
        task1_id = tasks[0].id
        task2_id = tasks[1].id
        assert_task_state(task1_id, TaskStateChoices.CREATED)
        assert_task_state(task2_id, TaskStateChoices.CREATED)

        # Step 3: Submit annotation on task1
        annotation1 = ls.annotations.create(
            id=task1_id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )
        assert_task_state(task1_id, TaskStateChoices.COMPLETED)
        assert_project_state(project.id, ProjectStateChoices.IN_PROGRESS)
        assert_annotation_state(annotation1.id, AnnotationStateChoices.CREATED)

        # Step 4: Submit annotation on task2
        annotation2 = ls.annotations.create(
            id=task2_id,
            result=[{'value': {'choices': ['negative']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )
        assert_task_state(task2_id, TaskStateChoices.COMPLETED)
        assert_project_state(project.id, ProjectStateChoices.COMPLETED)
        assert_annotation_state(annotation2.id, AnnotationStateChoices.CREATED)

        # Step 5: Delete annotation from task1
        ls.annotations.delete(id=annotation1.id)
        assert_task_state(task1_id, TaskStateChoices.IN_PROGRESS)
        assert_project_state(project.id, ProjectStateChoices.IN_PROGRESS)

        # Step 6: Re-submit annotation on task1
        annotation3 = ls.annotations.create(
            id=task1_id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=5.0,
        )
        assert_task_state(task1_id, TaskStateChoices.COMPLETED)
        assert_project_state(project.id, ProjectStateChoices.COMPLETED)
        assert_annotation_state(annotation3.id, AnnotationStateChoices.CREATED)


class TestColdStartScenarios:
    """
    Test FSM behavior when entities exist without state records.

    These tests simulate "cold start" scenarios that occur when:
    1. FSM is deployed to production with pre-existing data
    2. Entities exist in the database but have no FSM state records
    3. First FSM interaction must properly initialize states
    """

    @pytest.fixture(autouse=True)
    def setup_context(self, business_client):
        """Ensure CurrentContext has user set for FSM operations"""
        from core.current_request import CurrentContext

        # Set the user from business_client to CurrentContext
        user = business_client.user
        CurrentContext.set_user(user)
        if hasattr(user, 'active_organization') and user.active_organization:
            CurrentContext.set_organization_id(user.active_organization.id)

        yield

        # Cleanup
        CurrentContext.clear()

    def test_annotation_deletion_on_task_without_state(self, django_live_url, business_client, configured_project):
        """
        Test: Annotation deletion on task that has no FSM state record.

        Steps:
        1. Create task directly (bypassing FSM auto-transitions)
        2. Add annotation directly (bypassing FSM)
        3. Delete annotation via SDK
        4. Verify states are initialized and updated correctly
        """
        from fsm.state_choices import TaskStateChoices
        from fsm.state_models import TaskState
        from tasks.models import Annotation, Task

        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        # Step 1: Create task directly without FSM state
        task = Task(data={'text': 'Test cold start'}, project=configured_project)
        task.save(skip_fsm=True)

        # Verify no state exists
        assert TaskState.objects.filter(task=task).count() == 0

        # Step 2: Create annotation directly
        annotation = Annotation(
            task=task,
            project=configured_project,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
        )
        annotation.save(skip_fsm=True)
        task.is_labeled = True
        task.save(skip_fsm=True)

        # Step 3: Delete annotation via SDK (this triggers FSM logic)
        ls.annotations.delete(id=annotation.id)

        # Step 4: Verify task state was initialized and updated
        task.refresh_from_db()
        assert not task.is_labeled  # Annotation was deleted

        # Task state should now exist and be IN_PROGRESS
        task_states = TaskState.objects.filter(task=task).order_by('-id')
        assert task_states.count() >= 1  # At least one state record created
        latest_state = task_states.first()
        assert latest_state.state in [TaskStateChoices.IN_PROGRESS, TaskStateChoices.CREATED]

    def test_annotation_submission_on_task_without_state(self, django_live_url, business_client, configured_project):
        """
        Test: Annotation submission on task that has no FSM state record.

        Steps:
        1. Create task directly (bypassing FSM)
        2. Submit annotation via SDK
        3. Verify task and project states are initialized correctly
        """
        from fsm.state_choices import ProjectStateChoices, TaskStateChoices
        from fsm.state_models import ProjectState, TaskState
        from tasks.models import Task

        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

        # Step 1: Create task without FSM state
        task = Task(data={'text': 'Cold start annotation test'}, project=configured_project)
        task.save(skip_fsm=True)

        # Verify no states exist
        assert TaskState.objects.filter(task=task).count() == 0

        # Delete any project states that might exist
        ProjectState.objects.filter(project=configured_project).delete()

        # Step 2: Submit annotation via SDK
        ls.annotations.create(
            id=task.id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=1.0,
        )

        # Step 3: Verify states initialized
        task_states = TaskState.objects.filter(task=task).order_by('-id')
        assert task_states.count() >= 1
        latest_task_state = task_states.first()
        assert latest_task_state.state == TaskStateChoices.COMPLETED

        project_states = ProjectState.objects.filter(project=configured_project).order_by('-id')
        assert project_states.count() >= 1
        latest_project_state = project_states.first()
        assert latest_project_state.state in [ProjectStateChoices.IN_PROGRESS, ProjectStateChoices.COMPLETED]

    def test_project_state_update_with_mixed_task_states(self, django_live_url, business_client, configured_project):
        """
        Test: Project state update when some tasks have states and some don't.

        Steps:
        1. Create multiple tasks without FSM states
        2. Update project state via annotation submission
        3. Verify all task states are initialized
        4. Verify project state is correct
        """
        from fsm.state_choices import ProjectStateChoices, TaskStateChoices
        from fsm.state_manager import get_state_manager
        from fsm.state_models import TaskState
        from tasks.models import Task

        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
        StateManager = get_state_manager()

        # Step 1: Create two tasks without FSM states
        task1 = Task(data={'text': 'Task 1'}, project=configured_project)
        task1.save(skip_fsm=True)

        task2 = Task(data={'text': 'Task 2'}, project=configured_project)
        task2.save(skip_fsm=True)

        # Verify no tasks have states initially
        assert not TaskState.objects.filter(task=task1).exists()
        assert not TaskState.objects.filter(task=task2).exists()

        # Step 2: Submit annotation on first task only via SDK
        ls.annotations.create(
            id=task1.id,
            result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
            lead_time=1.0,
        )

        # Step 3: Verify both tasks now have states
        # task1 should have COMPLETED state (annotation submitted)
        task1_state = StateManager.get_current_state_value(task1)
        assert task1_state == TaskStateChoices.COMPLETED

        # task2 should also have been initialized during project state calculation
        task2_state = StateManager.get_current_state_value(task2)
        assert task2_state in [
            TaskStateChoices.CREATED,
            TaskStateChoices.IN_PROGRESS,
            None,
        ]  # May or may not be initialized yet

        # Step 4: Verify project state is correct (IN_PROGRESS - some tasks completed)
        project_state = StateManager.get_current_state_value(configured_project)
        assert project_state == ProjectStateChoices.IN_PROGRESS

    def test_bulk_task_processing_cold_start(self, django_live_url, business_client):
        """
        Test: Bulk processing of tasks when none have FSM states.

        Steps:
        1. Create a new project with multiple tasks without FSM states
        2. Submit annotations on all tasks via SDK
        3. Verify states are correctly initialized for all
        4. Verify project transitions correctly through states
        """
        from fsm.state_choices import ProjectStateChoices, TaskStateChoices
        from fsm.state_manager import get_state_manager
        from fsm.state_models import TaskState
        from projects.models import Project
        from tasks.models import Task

        ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
        StateManager = get_state_manager()

        # Create a new project with FSM
        project = Project(
            title='Bulk Cold Start Test',
            label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
            created_by=business_client.user,
        )
        project.save()

        # Step 1: Create 3 tasks without FSM states
        tasks = []
        for i in range(3):
            task = Task(data={'text': f'Bulk task {i}'}, project=project)
            task.save(skip_fsm=True)
            tasks.append(task)
            assert not TaskState.objects.filter(task=task).exists()

        # Step 2: Submit annotations on all tasks via SDK
        for task in tasks:
            ls.annotations.create(
                id=task.id,
                result=[
                    {'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}
                ],
                lead_time=1.0,
            )

        # Step 3: Verify all tasks have correct states
        for task in tasks:
            task_state = StateManager.get_current_state_value(task)
            assert task_state == TaskStateChoices.COMPLETED

        # Step 4: Verify project is COMPLETED (all tasks completed)
        project_state = StateManager.get_current_state_value(project)
        assert project_state == ProjectStateChoices.COMPLETED


def test_project_completes_after_deleting_unfinished_tasks(django_live_url, business_client):
    """
    Deleting all unfinished tasks should complete the project if the remaining task(s) are completed.
    Steps:
    - Create project with 4 tasks
    - Annotate 1 task (project -> IN_PROGRESS)
    - Delete the 3 unannotated tasks via Delete Tasks action
    - Expect project -> COMPLETED (only completed task remains)
    """
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

    project = ls.projects.create(
        title='Complete after deleting unfinished',
        label_config='<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="positive"/><Choice value="negative"/></Choices></View>',
    )
    # Create 4 tasks
    tasks = [ls.tasks.create(project=project.id, data={'text': f'Task {i}'}) for i in range(4)]
    assert len(list(ls.tasks.list(project=project.id))) == 4

    # Annotate the first task
    ls.annotations.create(
        id=tasks[0].id,
        result=[{'value': {'choices': ['positive']}, 'from_name': 'label', 'to_name': 'text', 'type': 'choices'}],
        lead_time=1.0,
    )
    # Project should be IN_PROGRESS with mixed completion
    assert_project_state(project.id, ProjectStateChoices.IN_PROGRESS)

    # Delete remaining 3 unannotated tasks using Data Manager action
    ids_to_delete = [t.id for t in tasks[1:]]
    ls.actions.create(project=project.id, id='delete_tasks', selected_items={'all': False, 'included': ids_to_delete})

    # Only one task should remain
    remaining = list(ls.tasks.list(project=project.id))
    assert len(remaining) == 1
    # Project should now be COMPLETED since all remaining tasks are completed
    assert_project_state(project.id, ProjectStateChoices.COMPLETED)
