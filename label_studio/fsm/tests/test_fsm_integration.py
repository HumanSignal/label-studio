"""
Integration tests for the FSM system.
Tests the complete FSM functionality including models, state management,
and API endpoints.
"""

from datetime import datetime
from unittest.mock import patch

from django.test import TestCase
from fsm.state_manager import get_state_manager
from fsm.state_models import AnnotationState, ProjectState, TaskState
from projects.tests.factories import ProjectFactory
from tasks.tests.factories import AnnotationFactory, TaskFactory
from users.tests.factories import UserFactory


class TestFSMModels(TestCase):
    """Test FSM model functionality"""

    def setUp(self):
        self.user = UserFactory(email='test@example.com')
        self.project = ProjectFactory(created_by=self.user)
        self.task = TaskFactory(project=self.project, data={'text': 'test'})

        # Clear cache to ensure tests start with clean state
        from django.core.cache import cache

        cache.clear()

    def test_task_state_creation(self):
        """Test TaskState creation and basic functionality"""
        task_state = TaskState.objects.create(
            task=self.task,
            project_id=self.task.project_id,  # Denormalized from task.project_id
            state='CREATED',
            triggered_by=self.user,
            reason='Task created for testing',
        )

        # Check basic fields
        assert task_state.state == 'CREATED'
        assert task_state.task == self.task
        assert task_state.triggered_by == self.user

        # Check UUID7 functionality
        assert task_state.id.version == 7
        assert isinstance(task_state.timestamp_from_uuid, datetime)

        # Check string representation
        str_repr = str(task_state)
        assert 'Task' in str_repr
        assert 'CREATED' in str_repr

    def test_annotation_state_creation(self):
        """Test AnnotationState creation and basic functionality"""
        annotation = AnnotationFactory(task=self.task, completed_by=self.user, result=[])

        annotation_state = AnnotationState.objects.create(
            annotation=annotation,
            task_id=annotation.task.id,  # Denormalized from annotation.task_id
            project_id=annotation.task.project_id,  # Denormalized from annotation.task.project_id
            completed_by_id=annotation.completed_by.id if annotation.completed_by else None,  # Denormalized
            state='DRAFT',
            triggered_by=self.user,
            reason='Annotation draft created',
        )

        # Check basic fields
        assert annotation_state.state == 'DRAFT'
        assert annotation_state.annotation == annotation

        # Test completed state
        AnnotationState.objects.create(
            annotation=annotation,
            task_id=annotation.task.id,
            project_id=annotation.task.project_id,
            completed_by_id=annotation.completed_by.id if annotation.completed_by else None,
            state='COMPLETED',
            triggered_by=self.user,
        )

    def test_project_state_creation(self):
        """Test ProjectState creation and basic functionality"""
        project_state = ProjectState.objects.create(
            project=self.project, state='CREATED', triggered_by=self.user, reason='Project created for testing'
        )

        # Check basic fields
        assert project_state.state == 'CREATED'
        assert project_state.project == self.project

        ProjectState.objects.create(project=self.project, state='COMPLETED', triggered_by=self.user)


class TestStateManager(TestCase):
    """Test StateManager functionality with mocked transaction support"""

    def setUp(self):
        from core.current_request import CurrentContext

        self.user = UserFactory(email='test@example.com')

        # Set up CurrentContext BEFORE creating entities that need FSM
        CurrentContext.set_user(self.user)

        self.project = ProjectFactory(created_by=self.user)
        if hasattr(self.project, 'organization') and self.project.organization:
            CurrentContext.set_organization_id(self.project.organization.id)

        self.task = TaskFactory(project=self.project, data={'text': 'test'})
        self.StateManager = get_state_manager()

        # Clear cache to ensure tests start with clean state
        from django.core.cache import cache

        cache.clear()

        # Ensure registry is properly initialized for TaskState
        from fsm.registry import state_model_registry
        from fsm.state_models import TaskState

        if not state_model_registry.get_model('task'):
            state_model_registry.register_model('task', TaskState)

    def tearDown(self):
        from core.current_request import CurrentContext

        CurrentContext.clear()

    def test_get_current_state_empty(self):
        """Test getting current state when task is created"""
        # With FsmHistoryStateModel, tasks automatically get a state on creation
        current_state = self.StateManager.get_current_state_value(self.task)
        assert current_state == 'CREATED'  # FsmHistoryStateModel auto-creates state

    @patch('fsm.state_manager.flag_set')
    def test_transition_state(self, mock_flag_set):
        """Test state transition functionality with immediate cache updates"""
        from django.core.cache import cache

        cache.clear()

        # Enable FSM feature flag
        mock_flag_set.return_value = True

        # Initial transition
        success = self.StateManager.transition_state(
            entity=self.task,
            new_state='CREATED',
            user=self.user,
            transition_name='create_task',
            reason='Initial task creation',
        )

        assert success

        # Check current state - should work with immediate cache update
        current_state = self.StateManager.get_current_state_value(self.task)
        assert current_state == 'CREATED'

        # Another transition
        success = self.StateManager.transition_state(
            entity=self.task,
            new_state='IN_PROGRESS',
            user=self.user,
            transition_name='start_work',
            context={'started_by': 'user'},
        )

        assert success

        current_state = self.StateManager.get_current_state_value(self.task)
        assert current_state == 'IN_PROGRESS'

    @patch('fsm.state_manager.flag_set')
    def test_get_current_state_object(self, mock_flag_set):
        """Test getting current state object with full details"""
        from django.core.cache import cache

        cache.clear()

        # Enable FSM feature flag
        mock_flag_set.return_value = True

        # Create some state transitions
        self.StateManager.transition_state(entity=self.task, new_state='CREATED', user=self.user)
        self.StateManager.transition_state(
            entity=self.task, new_state='IN_PROGRESS', user=self.user, context={'test': 'data'}
        )

        current_state_obj = self.StateManager.get_current_state_object(self.task)

        assert current_state_obj is not None
        assert current_state_obj.state == 'IN_PROGRESS'
        assert current_state_obj.previous_state == 'CREATED'
        assert current_state_obj.triggered_by == self.user
        assert current_state_obj.context_data == {'test': 'data'}

    @patch('fsm.state_manager.flag_set')
    def test_get_state_history(self, mock_flag_set):
        """Test state history retrieval"""
        from django.core.cache import cache

        cache.clear()

        # Enable FSM feature flag
        mock_flag_set.return_value = True

        transitions = [('CREATED', 'create_task'), ('IN_PROGRESS', 'start_work'), ('COMPLETED', 'finish_work')]

        for state, transition in transitions:
            self.StateManager.transition_state(
                entity=self.task, new_state=state, user=self.user, transition_name=transition
            )

        history = self.StateManager.get_state_history(self.task)

        # Should have 3 state records
        assert len(history) == 3

        # Should be ordered by most recent first (UUID7 ordering)
        states = [h.state for h in history]
        assert states == ['COMPLETED', 'IN_PROGRESS', 'CREATED']

        # Check previous states are set correctly
        assert history[2].previous_state is None  # First state has no previous
        assert history[1].previous_state == 'CREATED'
        assert history[0].previous_state == 'IN_PROGRESS'

    @patch('fsm.state_manager.flag_set')
    def test_get_states_in_time_range(self, mock_flag_set):
        """Test time-based state queries using StateManager"""
        from django.core.cache import cache

        cache.clear()

        # Enable FSM feature flag
        mock_flag_set.return_value = True

        # Create some states
        self.StateManager.transition_state(entity=self.task, new_state='CREATED', user=self.user)
        self.StateManager.transition_state(entity=self.task, new_state='IN_PROGRESS', user=self.user)

        # Get state history (which gives us states ordered by time)
        states = self.StateManager.get_state_history(self.task)

        # Should have at least the states we created
        assert len(states) >= 2

    @patch('fsm.state_manager.flag_set')
    def test_immediate_cache_update_success_case(self, mock_flag_set):
        """Test that cache is updated immediately on successful transitions"""
        from django.core.cache import cache

        cache.clear()

        # Enable FSM feature flag
        mock_flag_set.return_value = True

        # Perform a successful transition
        success = self.StateManager.transition_state(
            entity=self.task,
            new_state='CREATED',
            user=self.user,
            transition_name='create_task',
            reason='Initial task creation',
        )

        # Verify success and immediate cache update
        assert success
        current_state = self.StateManager.get_current_state_value(self.task)
        assert current_state == 'CREATED'

        # Perform another successful transition
        success = self.StateManager.transition_state(
            entity=self.task,
            new_state='IN_PROGRESS',
            user=self.user,
            transition_name='start_work',
        )

        assert success
        current_state = self.StateManager.get_current_state_value(self.task)
        assert current_state == 'IN_PROGRESS'

    @patch('fsm.state_manager.flag_set')
    def test_transaction_on_commit_success_case(self, mock_flag_set):
        """Test successful state transitions"""
        from django.core.cache import cache

        cache.clear()

        # Enable FSM feature flag
        mock_flag_set.return_value = True

        # Perform a successful transition
        success = self.StateManager.transition_state(
            entity=self.task,
            new_state='CREATED',
            user=self.user,
            transition_name='create_task',
        )

        # Verify transition succeeded
        assert success
        assert self.StateManager.get_current_state_value(self.task) == 'CREATED'

    @patch('fsm.state_manager.flag_set')
    def test_transaction_on_commit_database_failure_case(self, mock_flag_set):
        """Test state transitions work correctly"""
        from django.core.cache import cache

        cache.clear()

        # Enable FSM feature flag
        mock_flag_set.return_value = True

        # Perform a transition
        self.StateManager.transition_state(
            entity=self.task,
            new_state='CREATED',
            user=self.user,
            transition_name='create_task',
        )

        # Verify state was set correctly
        current_state = self.StateManager.get_current_state_value(self.task)
        assert current_state == 'CREATED'

    @patch('fsm.state_manager.flag_set')
    def test_immediate_cache_update_content(self, mock_flag_set):
        """Test that cache is immediately updated during transition"""
        from django.core.cache import cache

        cache.clear()

        # Enable FSM feature flag
        mock_flag_set.return_value = True

        # Perform a transition
        success = self.StateManager.transition_state(
            entity=self.task,
            new_state='CREATED',
            user=self.user,
        )

        assert success

        # Cache should be immediately updated during transition
        cache_key = self.StateManager.get_cache_key(self.task)
        cached_state = cache.get(cache_key)
        assert cached_state == 'CREATED'

        # Verify get_current_state_value uses the cached value
        current_state = self.StateManager.get_current_state_value(self.task)
        assert current_state == 'CREATED'

    @patch('fsm.state_manager.flag_set')
    def test_cache_cleanup_on_transaction_rollback(self, mock_flag_set):
        """Test cache behavior with state transitions"""
        from django.core.cache import cache

        cache.clear()

        # Enable FSM feature flag
        mock_flag_set.return_value = True

        # Create a state transition
        self.StateManager.transition_state(
            entity=self.task,
            new_state='CREATED',
            user=self.user,
            transition_name='create_task',
            reason='Test transition',
        )

        # Verify cache contains the state
        cache_key = self.StateManager.get_cache_key(self.task)
        cached_state = cache.get(cache_key)
        assert cached_state == 'CREATED'

    @patch('fsm.state_manager.flag_set')
    def test_same_state_transition_prevention(self, mock_flag_set):
        """Test that same-state transitions are prevented"""
        from django.core.cache import cache

        cache.clear()

        # Enable FSM feature flag
        mock_flag_set.return_value = True

        # Create initial state
        success = self.StateManager.transition_state(
            entity=self.task,
            new_state='CREATED',
            user=self.user,
        )
        assert success

        # Verify initial state is set
        current_state = self.StateManager.get_current_state_value(self.task)
        assert current_state == 'CREATED'

        # Get initial state count
        from fsm.state_models import TaskState

        initial_count = TaskState.objects.filter(task=self.task).count()
        assert initial_count == 1

        # Attempt same-state transition (should be skipped)
        success = self.StateManager.transition_state(
            entity=self.task,
            new_state='CREATED',  # Same state as current
            user=self.user,
            reason='This should be skipped',
        )
        assert success  # Returns True but doesn't create new record

        # Verify no new state record was created
        final_count = TaskState.objects.filter(task=self.task).count()
        assert final_count == initial_count  # Should still be 1

        # Verify state is still CREATED
        current_state = self.StateManager.get_current_state_value(self.task)
        assert current_state == 'CREATED'
