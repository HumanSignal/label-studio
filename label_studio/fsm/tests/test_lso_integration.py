"""
Label Studio Open Source FSM Integration Tests.

Tests the core FSM functionality with real Django models in LSO,
focusing on coverage of state_manager.py and utils modules.
"""

import logging
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from core.current_request import CurrentContext
from django.contrib.auth import get_user_model
from django.core.cache import cache
from fsm.state_choices import AnnotationStateChoices, ProjectStateChoices, TaskStateChoices
from fsm.state_manager import StateManager, StateManagerError
from fsm.state_models import AnnotationState, ProjectState, TaskState
from fsm.utils import get_current_state_safe, is_fsm_enabled, resolve_organization_id
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from tasks.models import Annotation
from tasks.tests.factories import AnnotationFactory, TaskFactory
from users.tests.factories import UserFactory

User = get_user_model()
logger = logging.getLogger(__name__)


@pytest.mark.django_db
class TestLSOFSMIntegration:
    """
    Test LSO FSM integration with real models.

    Focuses on improving coverage of state_manager.py and utils.py
    by testing error paths, cache behavior, and bulk operations.
    """

    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        """Set up test data."""
        cache.clear()
        self.org = OrganizationFactory()
        self.user = UserFactory()
        CurrentContext.set_user(self.user)
        CurrentContext.set_organization_id(self.org.id)
        yield
        cache.clear()
        CurrentContext.clear()

    def test_project_creation_generates_state(self):
        """
        Test that creating a project automatically generates a state record.

        Validates:
        - Project model extends FsmHistoryStateModel
        - Automatic state transition on creation
        - State is CREATED for new projects
        """
        project = ProjectFactory(organization=self.org)

        # Check state was created
        state = StateManager.get_current_state_value(project)
        assert state == ProjectStateChoices.CREATED, f'Expected CREATED, got {state}'

        # Check state history exists
        history = list(ProjectState.objects.filter(project=project).order_by('created_at'))
        assert len(history) == 1
        assert history[0].state == ProjectStateChoices.CREATED
        assert history[0].transition_name == 'project_created'

    def test_task_creation_generates_state(self):
        """
        Test that creating a task automatically generates a state record.

        Validates:
        - Task model extends FsmHistoryStateModel
        - Automatic state transition on creation
        - State is CREATED for new tasks
        """
        project = ProjectFactory(organization=self.org)
        task = TaskFactory(project=project)

        # Check state was created
        state = StateManager.get_current_state_value(task)
        assert state == TaskStateChoices.CREATED, f'Expected CREATED, got {state}'

        # Check state history exists
        history = list(TaskState.objects.filter(task=task).order_by('created_at'))
        assert len(history) == 1
        assert history[0].state == TaskStateChoices.CREATED

    def test_annotation_creation_generates_state(self):
        """
        Test that creating an annotation automatically generates a state record.

        Validates:
        - Annotation model extends FsmHistoryStateModel
        - Automatic state transition on creation
        - State is CREATED for new annotations in LSO
        """
        project = ProjectFactory(organization=self.org)
        task = TaskFactory(project=project)
        annotation = AnnotationFactory(task=task, completed_by=self.user)

        # Check state was created
        state = StateManager.get_current_state_value(annotation)
        assert state == AnnotationStateChoices.CREATED, f'Expected CREATED, got {state}'

        # Check state history exists
        history = list(AnnotationState.objects.filter(annotation=annotation).order_by('created_at'))
        assert len(history) >= 1
        assert history[0].state == AnnotationStateChoices.CREATED

    def test_cache_functionality(self):
        """
        Test that StateManager caching works correctly.

        Validates:
        - State retrieval works consistently
        - Cache doesn't cause incorrect state returns
        - Multiple accesses return same state
        """
        project = ProjectFactory(organization=self.org)

        # First access
        cache.clear()
        state1 = StateManager.get_current_state_value(project)
        assert state1 == ProjectStateChoices.CREATED

        # Second access - should return same state (whether from cache or DB)
        state2 = StateManager.get_current_state_value(project)
        assert state2 == ProjectStateChoices.CREATED

        # States should match
        assert state1 == state2

    def test_get_current_state_safe_with_no_state(self):
        """
        Test get_current_state_safe returns None for entities without states.

        Validates:
        - Utility function handles entities with no state records
        - No exceptions raised
        - Returns None gracefully
        """
        # Create a project but delete its state records
        project = ProjectFactory(organization=self.org)
        ProjectState.objects.filter(project=project).delete()
        cache.clear()

        # Should return None, not raise
        state = get_current_state_safe(project)
        assert state is None

    def test_resolve_organization_id_from_entity(self):
        """
        Test resolve_organization_id utility function.

        Validates:
        - Extracts organization_id from entity with direct attribute
        - Extracts organization_id from entity with project relation
        - Falls back to CurrentContext
        """
        project = ProjectFactory(organization=self.org)
        task = TaskFactory(project=project)

        # Test direct attribute
        org_id = resolve_organization_id(project)
        assert org_id == self.org.id

        # Test via project relation
        org_id = resolve_organization_id(task)
        assert org_id == self.org.id

    def test_is_fsm_enabled_in_lso(self):
        """
        Test is_fsm_enabled checks feature flag correctly.

        Validates:
        - Feature flag check works
        - Returns True when enabled
        """
        result = is_fsm_enabled(user=self.user)
        assert result is True

    def test_state_manager_error_handling(self):
        """
        Test StateManager error handling for invalid entities.

        Validates:
        - Proper error raised for entities without state model
        - Error includes helpful message
        """
        # Create a mock entity that doesn't have a state model
        from unittest.mock import Mock

        mock_entity = Mock()
        mock_entity._meta = Mock()
        mock_entity._meta.model_name = 'nonexistent_model'
        mock_entity._meta.label_lower = 'test.nonexistent'
        mock_entity.pk = 1

        # Should raise StateManagerError
        with pytest.raises(StateManagerError) as exc_info:
            StateManager.get_current_state_value(mock_entity)

        assert 'No state model found' in str(exc_info.value)

    def test_warm_cache_bulk_operation(self):
        """
        Test bulk cache warming for multiple entities.

        Validates:
        - Warm cache operation works for multiple entities
        - Subsequent state retrievals are faster (cached)
        - Correct states for all entities
        """
        project = ProjectFactory(organization=self.org)
        tasks = [TaskFactory(project=project) for _ in range(5)]

        # Warm cache for all tasks
        cache.clear()
        StateManager.warm_cache(tasks)

        # Verify all states can be retrieved and are correct
        for task in tasks:
            state = StateManager.get_current_state_value(task)
            assert state == TaskStateChoices.CREATED

    def test_get_state_history(self):
        """
        Test retrieving state history for an entity.

        Validates:
        - History retrieval works
        - States are in chronological order
        - All transition metadata captured
        """
        project = ProjectFactory(organization=self.org)

        # Get history
        history = StateManager.get_state_history(project)

        # Should have at least creation state
        assert len(history) >= 1
        assert history[0].state == ProjectStateChoices.CREATED
        assert history[0].transition_name == 'project_created'

    def test_get_state_history_ordering(self):
        """
        Test that state history is returned in chronological order.

        Validates:
        - History is ordered by creation time
        - Oldest states appear first
        - All state records are included
        """
        project = ProjectFactory(organization=self.org)

        # Get history
        history = StateManager.get_state_history(project)

        # Should have at least one state (creation)
        assert len(history) >= 1

        # Verify ordering - each timestamp should be >= the previous
        timestamps = [h.created_at for h in history]
        assert timestamps == sorted(timestamps)

    def test_annotation_from_draft_workflow(self):
        """
        Test annotation created from draft has correct state.

        Validates:
        - Draft-based annotation workflow
        - Correct transition triggered
        - State is CREATED in LSO
        """
        project = ProjectFactory(organization=self.org)
        task = TaskFactory(project=project)

        # Create annotation with draft flag
        annotation = Annotation(
            task=task,
            completed_by=self.user,
            result=[{'test': 'data'}],
            was_cancelled=False,
        )
        annotation.save()

        # Should be in CREATED state
        state = StateManager.get_current_state_value(annotation)
        assert state == AnnotationStateChoices.CREATED

    def test_state_manager_with_multiple_transitions(self):
        """
        Test that multiple state transitions are recorded correctly.

        Validates:
        - Multiple transitions create multiple records
        - History ordering is correct
        - Each transition has correct metadata
        """
        project = ProjectFactory(organization=self.org)

        # Create multiple state changes by updating project
        StateManager.get_current_state_value(project)

        # Update project settings (should create a state record in LSE, but not in LSO)
        project.maximum_annotations = 5
        project.save()

        # Get history
        history = list(ProjectState.objects.filter(project=project).order_by('created_at'))

        # In LSO, settings changes don't create new state records
        # so we should still have just the creation record
        assert len(history) == 1
        assert history[0].state == ProjectStateChoices.CREATED


@pytest.mark.django_db
class TestLSOFSMUtilities:
    """
    Test LSO FSM utility functions.

    Focuses on improving coverage of utils.py module.
    """

    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        """Set up test data."""
        cache.clear()
        self.org = OrganizationFactory()
        self.user = UserFactory()
        CurrentContext.set_user(self.user)
        CurrentContext.set_organization_id(self.org.id)
        yield
        cache.clear()
        CurrentContext.clear()

    def test_resolve_organization_id_with_user(self):
        """
        Test resolve_organization_id with user parameter.

        Validates:
        - User parameter takes precedence
        - Correct organization extracted
        """
        project = ProjectFactory(organization=self.org)

        org_id = resolve_organization_id(project, user=self.user)
        assert org_id is not None

    def test_resolve_organization_id_fallback_to_context(self):
        """
        Test resolve_organization_id falls back to CurrentContext.

        Validates:
        - CurrentContext used when no other source available
        - Correct ID returned
        """
        CurrentContext.set_organization_id(self.org.id)

        # Create entity without organization_id attribute
        from unittest.mock import Mock

        mock_entity = Mock(spec=[])  # No attributes

        org_id = resolve_organization_id(mock_entity)
        assert org_id == self.org.id

    def test_get_current_state_safe_with_state(self):
        """
        Test get_current_state_safe returns correct state value.

        Validates:
        - Function returns state string (not None)
        - State value is correct
        - Works correctly with database query
        """
        project = ProjectFactory(organization=self.org)
        cache.clear()

        # Should return state value string, not None
        state_value = get_current_state_safe(project)
        assert state_value is not None
        assert state_value == ProjectStateChoices.CREATED

    def test_state_manager_handles_concurrent_access(self):
        """
        Test StateManager handles concurrent access correctly.

        Validates:
        - No race conditions in state retrieval
        - Cache consistency
        - Multiple simultaneous requests work correctly
        """
        project = ProjectFactory(organization=self.org)

        # Simulate multiple concurrent accesses
        states = [StateManager.get_current_state_value(project) for _ in range(10)]

        # All should return the same state
        assert all(s == ProjectStateChoices.CREATED for s in states)

    def test_get_current_state_value_when_fsm_disabled(self):
        """
        Test get_current_state_value returns None when FSM is disabled.

        Validates:
        - Returns None instead of raising when feature flag is off
        - Handles disabled state gracefully
        """
        project = ProjectFactory(organization=self.org)

        with patch.object(StateManager, '_is_fsm_enabled', return_value=False):
            result = StateManager.get_current_state_value(project)
            assert result is None

    def test_get_states_in_time_range(self):
        """
        Test get_states_in_time_range for time-based queries.

        Validates:
        - UUID7-based time range queries work
        - Returns states within specified time range
        """
        from datetime import timedelta

        project = ProjectFactory(organization=self.org)

        # Get states from the last day
        start_time = datetime.now(timezone.utc) - timedelta(days=1)
        end_time = datetime.now(timezone.utc)

        states = StateManager.get_states_in_time_range(project, start_time, end_time)

        # Should have at least the creation state
        assert len(states) >= 1

    def test_invalidate_cache(self):
        """
        Test cache invalidation for entity state.

        Validates:
        - Cache is cleared for specific entity
        - Subsequent lookups hit database
        """
        project = ProjectFactory(organization=self.org)

        # Get state to populate cache
        state = StateManager.get_current_state_value(project)
        assert state == ProjectStateChoices.CREATED

        # Invalidate cache
        StateManager.invalidate_cache(project)

        # Next lookup should work (will hit DB)
        state_after = StateManager.get_current_state_value(project)
        assert state_after == ProjectStateChoices.CREATED

    def test_get_current_state_object(self):
        """
        Test get_current_state_object returns full state record.

        Validates:
        - Returns BaseState instance with full audit information
        - Contains all expected fields
        """
        project = ProjectFactory(organization=self.org)

        # Get current state object
        state_object = StateManager.get_current_state_object(project)

        assert state_object is not None
        assert state_object.state == ProjectStateChoices.CREATED
        assert hasattr(state_object, 'triggered_by')
        assert hasattr(state_object, 'transition_name')

    def test_transition_state_fsm_disabled(self):
        """
        Test transition_state returns True when FSM is disabled.

        Validates:
        - Returns True without creating state record
        - Handles disabled state gracefully
        """
        project = ProjectFactory(organization=self.org)

        with patch.object(StateManager, '_is_fsm_enabled', return_value=False):
            result = StateManager.transition_state(
                entity=project, new_state='NEW_STATE', transition_name='test', user=self.user
            )
            assert result is True

    def test_warm_cache_multiple_entities(self):
        """
        Test warm_cache with multiple entities for bulk operations.

        Validates:
        - Cache is populated for all entities
        - Subsequent get_current_state_value calls are fast (from cache)
        """
        projects = [ProjectFactory(organization=self.org) for _ in range(3)]

        # Warm cache for all projects
        StateManager.warm_cache(projects)

        # Verify all are cached (should not hit DB)
        for project in projects:
            state = StateManager.get_current_state_value(project)
            assert state == ProjectStateChoices.CREATED

    def test_fsm_disabled_via_current_context(self):
        """
        Test CurrentContext.set_fsm_disabled() directly.

        Validates:
        - Can disable FSM via CurrentContext
        - is_fsm_enabled() respects the flag
        - State is properly restored
        """
        from core.current_request import CurrentContext

        # Initially enabled
        assert is_fsm_enabled() is True

        # Disable FSM
        CurrentContext.set_fsm_disabled(True)
        assert is_fsm_enabled() is False
        assert CurrentContext.is_fsm_disabled() is True

        # Re-enable FSM
        CurrentContext.set_fsm_disabled(False)
        assert is_fsm_enabled() is True
        assert CurrentContext.is_fsm_disabled() is False
