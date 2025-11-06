"""
FSM Base Model for Label Studio.

This module contains only FsmHistoryStateModel - the base class that models
inherit from to get FSM integration. State model definitions are in state_models.py
to avoid registration issues in LSE.
"""

import logging
from typing import Any, Dict

from django.db import models

logger = logging.getLogger(__name__)


# =============================================================================
# FsmHistoryStateModel - Base Model for FSM Integration
# =============================================================================


class FsmHistoryStateModel(models.Model):
    """
    FSM History State Model - Base class for models that participate in FSM state tracking.

    This class provides explicit FSM integration through model lifecycle hooks,
    replacing the implicit signal-based approach with predictable, testable behavior.

    Key features:
    - Intercepts save operations to trigger FSM transitions
    - Tracks field changes for transition logic
    - Maintains CurrentContext for user/org tracking
    - Provides explicit transition determination
    - Fails gracefully - FSM errors don't break saves

    Usage:
        class Task(FsmHistoryStateModel):
            # ... model fields ...

            def _determine_fsm_transition(self) -> Optional[str]:
                if self._state.adding:  # Creating new instance
                    return 'task_created'

                changed = self._get_changed_fields()
                if 'is_labeled' in changed and changed['is_labeled'][1]:
                    return 'task_labeled'

                return None

            def _get_fsm_transition_data(self) -> Dict[str, Any]:
                return {
                    'project_id': self.project_id,
                    'overlap': self.overlap
                }
    """

    class Meta:
        abstract = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Track original field values for change detection
        # Initialize as empty dict for safe access
        self._original_values = {}

    @classmethod
    def from_db(cls, db, field_names, values):
        """
        Override from_db to capture original values when loading from database.

        Django calls this method instead of __init__ when loading models from the database.
        We need to capture the original field values here for change detection.
        """
        instance = super().from_db(db, field_names, values)
        # Initialize as empty dict for safe access
        instance._original_values = {}
        # Capture original values immediately after loading from DB
        # This ensures we have the baseline for change detection on the first save
        instance._capture_original_values()
        return instance

    def _capture_original_values(self):
        """
        Capture current field values for change detection.

        This allows us to detect which fields changed during save operations,
        which is crucial for determining appropriate FSM transitions.

        For ForeignKey fields, we store the PK instead of the object to avoid
        circular references and recursion issues.

        Deferred fields (not yet loaded from DB) are skipped to prevent infinite
        recursion when accessing them would trigger refresh_from_db().

        This is called after each save to refresh the baseline for the next save.
        """
        self._original_values = {}

        # Get deferred fields to avoid triggering recursive database loads
        # Deferred fields haven't been loaded yet, so they can't have changed
        deferred_fields = self.get_deferred_fields()

        for field in self._meta.fields:
            # Skip deferred fields to prevent recursion via refresh_from_db()
            if field.attname in deferred_fields:
                continue

            value = getattr(self, field.name, None)
            # For ForeignKey fields, store PK to avoid circular references
            if field.is_relation and field.many_to_one and value is not None:
                self._original_values[field.name] = value.pk if hasattr(value, 'pk') else value
            else:
                self._original_values[field.name] = value

    def __reduce_ex__(self, protocol):
        """
        Override serialization to exclude internal FSM tracking fields.

        Django's serialization uses pickle which calls __reduce_ex__.
        We exclude _original_values since it's only needed for runtime
        change detection, not for serialization/restoration.
        """
        # Get the default reduction
        reduction = super().__reduce_ex__(protocol)

        # reduction is a tuple: (callable, args, state, ...)
        # state is the instance __dict__
        if len(reduction) >= 3 and isinstance(reduction[2], dict):
            state = reduction[2].copy()
            # Remove internal FSM fields from serialization
            state.pop('_original_values', None)
            # Return new reduction with cleaned state
            return (reduction[0], reduction[1], state) + reduction[3:]

        return reduction

    def _get_changed_fields(self) -> Dict[str, tuple]:
        """
        Get fields that changed since the last load/save.

        Returns:
            Dict mapping field names to (old_value, new_value) tuples
            Note: For ForeignKey fields, old_value will be the PK, new_value will be the object

        Example:
            changed = self._get_changed_fields()
            if 'is_labeled' in changed:
                old_val, new_val = changed['is_labeled']
                if not old_val and new_val:
                    # Task became labeled
                    pass
        """
        # If no original values captured yet, nothing has changed
        # Use hasattr check to handle cases where _original_values doesn't exist
        if not hasattr(self, '_original_values') or not self._original_values:
            return {}

        changed = {}
        for field in self._meta.fields:
            # Only check fields that were captured in _original_values
            # Fields that were deferred during capture won't be in _original_values
            # and should be considered unchanged
            if field.name not in self._original_values:
                continue

            old_value = self._original_values[field.name]
            new_value = getattr(self, field.name, None)

            # For ForeignKey fields, old_value is stored as PK, so compare PK to PK
            if field.is_relation and field.many_to_one:
                new_pk = new_value.pk if new_value and hasattr(new_value, 'pk') else new_value
                if old_value != new_pk:
                    changed[field.name] = (old_value, new_value)
            elif old_value != new_value:
                changed[field.name] = (old_value, new_value)
        return changed

    def _determine_fsm_transitions(self, is_creating: bool = None, changed_fields: dict = None) -> list:
        """
        Determine which FSM transitions should be triggered based on model state.

        This method automatically discovers registered transitions for this entity
        and checks which ones should execute based on their trigger metadata.

        Args:
            is_creating: Whether this is a creation. If None, checks self._state.adding
            changed_fields: Dict of changed fields. If None, computes them.

        Override this method ONLY if you need custom transition logic beyond
        what the declarative triggers provide.

        Returns:
            List of transition names to execute (in order)

        Note:
            In most cases, you don't need to override this. Just register transitions
            with appropriate trigger metadata using @register_state_transition decorator.

        Example of custom override (if needed):
            def _determine_fsm_transitions(self, is_creating=None, changed_fields=None) -> list:
                # Get default transitions
                transitions = super()._determine_fsm_transitions(is_creating, changed_fields)

                # Add custom logic
                if self.some_complex_condition():
                    transitions.append('custom_transition')

                return transitions
        """
        from fsm.registry import transition_registry

        entity_name = self._meta.model_name

        # Use provided is_creating, or fall back to checking _state.adding
        if is_creating is None:
            is_creating = self._state.adding

        # Use provided changed_fields, or compute them
        if changed_fields is None:
            changed_fields = {} if is_creating else self._get_changed_fields()

        # Debug logging for transition determination
        if entity_name == 'project' and not is_creating:
            logger.debug(
                f'FSM: Determining transitions for {entity_name}',
                extra={
                    'entity_id': self.pk,
                    'is_creating': is_creating,
                    'changed_fields': list(changed_fields.keys()),
                    'changed_fields_detail': changed_fields,
                },
            )

        # Get all registered transitions for this entity
        registered_transitions = transition_registry.get_transitions_for_entity(entity_name)
        if not registered_transitions:
            return []

        transitions_to_execute = []

        for transition_name, transition_class in registered_transitions.items():
            # Check if this transition should execute based on trigger metadata
            should_execute = False

            # Check creation trigger
            if is_creating and getattr(transition_class, '_triggers_on_create', False):
                should_execute = True

            # Check update triggers
            elif not is_creating and getattr(transition_class, '_triggers_on_update', True):
                trigger_fields = getattr(transition_class, '_trigger_fields', [])

                # If no specific fields, check if transition has custom logic
                if not trigger_fields:
                    # Let the transition's should_execute method decide
                    # We'll add it and let it validate later
                    should_execute = True
                else:
                    # Check if any trigger fields changed
                    for field in trigger_fields:
                        if field in changed_fields:
                            should_execute = True
                            break

            # If trigger metadata says we should execute, also check the transition's should_execute() method
            if should_execute:
                try:
                    # Instantiate the transition to check should_execute() if it exists
                    # We need a minimal context to check should_execute
                    from fsm.transitions import TransitionContext

                    # Create a temporary transition instance with full context
                    # Convert changed_fields to the format expected by ModelChangeTransition
                    formatted_changed_fields = {k: {'old': v[0], 'new': v[1]} for k, v in changed_fields.items()}

                    # Create transition with all relevant data for should_execute() check
                    temp_transition = transition_class(
                        is_creating=is_creating, changed_fields=formatted_changed_fields
                    )

                    # Check if should_execute is overridden (not using the base implementation)
                    # The base implementation always returns True, so we only check if it's been customized
                    from fsm.transitions import BaseTransition

                    should_execute_method = getattr(type(temp_transition), 'should_execute', None)
                    base_should_execute = getattr(BaseTransition, 'should_execute', None)

                    # Only call should_execute if it's been overridden in the subclass
                    if should_execute_method and should_execute_method != base_should_execute:
                        # Build a minimal context for should_execute check
                        # NOTE: We skip getting current state here to avoid recursion issues
                        # The actual state will be retrieved during transition execution
                        context = TransitionContext(
                            entity=self,
                            current_user=None,  # Will be set properly during execution
                            current_state_object=None,  # Skip to avoid recursion
                            current_state=None,  # Skip to avoid recursion
                            target_state=temp_transition.target_state,
                            organization_id=getattr(self, 'organization_id', None),
                        )

                        # Call should_execute to do final filtering
                        if not temp_transition.should_execute(context):
                            should_execute = False
                            logger.debug(
                                f'FSM: Transition {transition_name} filtered out by should_execute()',
                                extra={
                                    'entity_type': entity_name,
                                    'entity_id': self.pk,
                                    'transition_name': transition_name,
                                },
                            )
                except Exception as e:
                    # If should_execute check fails, log but still add the transition
                    # Let it fail during actual execution with proper error handling
                    logger.debug(
                        f'FSM: Error checking should_execute for {transition_name}: {e}',
                        extra={
                            'entity_type': entity_name,
                            'entity_id': self.pk,
                            'transition_name': transition_name,
                            'error': str(e),
                        },
                    )

            if should_execute:
                transitions_to_execute.append(transition_name)

        return transitions_to_execute

    def _get_fsm_transition_data(self) -> Dict[str, Any]:
        """
        Get data to pass to the FSM transition.

        Override in subclasses to provide transition-specific data that should
        be stored in the state record's context_data field.

        Returns:
            Dictionary of data to pass to transition

        Example:
            def _get_fsm_transition_data(self) -> Dict[str, Any]:
                return {
                    'project_id': self.project_id,
                    'completed_by_id': self.completed_by_id,
                    'annotation_count': self.annotations.count()
                }
        """
        return {}

    def _should_execute_fsm(self) -> bool:
        """
        Check if FSM processing should be executed.

        Returns False if:
        - Feature flag is disabled
        - User context is unavailable (tests must set CurrentContext explicitly)
        - Explicitly skipped via instance attribute

        Returns:
            True if FSM should execute, False otherwise

        Note:
            CurrentContext is available in web requests and background jobs.
            In tests, it must be set explicitly for the user/organization.
        """
        # Check for instance-level skip flag
        if getattr(self, '_skip_fsm', False):
            return False

        # Use the centralized FSM enabled check from utils
        # This handles feature flag and thread-local overrides
        try:
            from core.current_request import CurrentContext
            from fsm.utils import is_fsm_enabled

            # Get user from CurrentContext - don't fall back to AnonymousUser
            # If no user in context (e.g., tests without explicit setup), return False
            try:
                user = CurrentContext.get_user()
                user_type = type(user).__name__ if user else None
                user_authenticated = getattr(user, 'is_authenticated', None) if user else None
                logger.info(
                    f'FSM check for {self.__class__.__name__}(id={getattr(self, "pk", None)}): '
                    f'user_type={user_type}, authenticated={user_authenticated}'
                )
                if user is None:
                    logger.info(f'FSM check: User is None, skipping FSM for {self.__class__.__name__}')
                    return False
                # Check if user is authenticated (not AnonymousUser)
                if not user.is_authenticated:
                    logger.info(
                        f'FSM check: User {user_type} not authenticated, skipping FSM for {self.__class__.__name__}'
                    )
                    return False
            except Exception:
                # CurrentContext not available or no user set
                # This is expected in tests that don't set up context
                logger.info(f'FSM check: Exception getting user, skipping FSM for {self.__class__.__name__}')
                return False

            return is_fsm_enabled(user=user)
        except Exception as e:
            logger.debug(f'FSM check failed: {e}')
            return False

    def save(self, *args, **kwargs):
        """
        Override save to trigger FSM transitions based on model changes.

        This method:
        1. Captures the current state (creating vs updating)
        2. Performs the actual database save
        3. Determines if an FSM transition is needed
        4. Executes the transition if needed
        5. Gracefully handles FSM errors without breaking the save

        Args:
            *args: Positional arguments passed to super().save()
            **kwargs: Keyword arguments passed to super().save()
                     Special kwarg: skip_fsm=True to bypass FSM processing

        Returns:
            Whatever super().save() returns
        """
        # Check for explicit FSM skip flag
        skip_fsm = kwargs.pop('skip_fsm', False)

        # Also check CurrentContext for skip_fsm flag (for context manager usage)
        if not skip_fsm:
            from core.current_request import CurrentContext

            skip_fsm = CurrentContext.get('skip_fsm', False)

        # Check if this is a creation vs update
        is_creating = self._state.adding

        # Capture changed fields before save (only for updates)
        # Note: _original_values should already be populated by from_db() or previous save()
        changed_fields = {} if is_creating else self._get_changed_fields()

        # Perform the actual save
        result = super().save(*args, **kwargs)

        # After successful save, trigger FSM transitions if enabled and not skipped
        should_execute = not skip_fsm and self._should_execute_fsm()

        logger.debug(
            f'FSM check for {self.__class__.__name__} {self.pk}: skip_fsm={skip_fsm}, should_execute={should_execute}',
            extra={
                'entity_type': self.__class__.__name__,
                'entity_id': self.pk,
                'skip_fsm': skip_fsm,
                'should_execute': should_execute,
            },
        )
        if not skip_fsm and should_execute:
            try:
                # Pass is_creating and changed_fields that were captured before save()
                transitions = self._determine_fsm_transitions(is_creating=is_creating, changed_fields=changed_fields)
                logger.debug(
                    f'FSM transitions determined for {self.__class__.__name__} {self.pk}: {transitions}',
                    extra={
                        'entity_type': self.__class__.__name__,
                        'entity_id': self.pk,
                        'transitions': transitions,
                        'is_creating': is_creating,
                    },
                )
                for transition_name in transitions:
                    try:
                        self._execute_fsm_transition(
                            transition_name=transition_name, is_creating=is_creating, changed_fields=changed_fields
                        )
                    except Exception as e:
                        # Log error for this specific transition but continue with others
                        logger.error(
                            f'FSM transition {transition_name} failed for {self.__class__.__name__} {self.pk}',
                            extra={
                                'event': 'fsm.transition_failed_on_save',
                                'entity_type': self.__class__.__name__,
                                'entity_id': self.pk,
                                'transition_name': transition_name,
                                'error': str(e),
                                'is_creating': is_creating,
                            },
                            exc_info=True,
                        )
            except Exception as e:
                # Log error in determining transitions
                logger.error(
                    f'FSM transition discovery failed for {self.__class__.__name__} {self.pk}',
                    extra={
                        'event': 'fsm.transition_discovery_failed',
                        'entity_type': self.__class__.__name__,
                        'entity_id': self.pk,
                        'error': str(e),
                        'is_creating': is_creating,
                    },
                    exc_info=True,
                )

        # Update original values after save for next time
        self._capture_original_values()

        return result

    def _execute_fsm_transition(self, transition_name: str, is_creating: bool, changed_fields: Dict[str, tuple]):
        """
        Execute an FSM transition.

        This method handles the actual transition execution, including:
        - Getting current context (user, org_id)
        - Preparing transition data
        - Calling the state manager

        Args:
            transition_name: Name of the registered transition to execute
            is_creating: Whether this is a new model creation
            changed_fields: Dict of changed fields (field_name -> (old, new))

        Note:
            This is only called after _should_execute_fsm() returns True,
            so CurrentContext should be available with a valid user.
        """
        from core.current_request import CurrentContext
        from fsm.state_manager import get_state_manager

        StateManager = get_state_manager()

        # Get context - should be available since _should_execute_fsm passed
        user = CurrentContext.get_user()
        org_id = CurrentContext.get_organization_id()

        # Get transition-specific data from the model
        transition_data = self._get_fsm_transition_data()

        # Add metadata about the change
        transition_data.update(
            {
                'is_creating': is_creating,
                'changed_fields': {k: {'old': v[0], 'new': v[1]} for k, v in changed_fields.items()},
            }
        )

        logger.info(
            f'Executing FSM transition for {self.__class__.__name__}',
            extra={
                'event': 'fsm.transition_executing',
                'entity_type': self.__class__.__name__,
                'entity_id': self.pk,
                'transition_name': transition_name,
                'is_creating': is_creating,
                'user_id': user.id if user else None,
                'organization_id': org_id,
            },
        )

        # Execute the registered transition
        try:
            StateManager.execute_transition(
                entity=self,
                transition_name=transition_name,
                transition_data=transition_data,
                user=user,
                organization_id=org_id,
            )

            logger.info(
                f'FSM transition executed successfully for {self.__class__.__name__}',
                extra={
                    'event': 'fsm.transition_success',
                    'entity_type': self.__class__.__name__,
                    'entity_id': self.pk,
                    'transition_name': transition_name,
                    'user_id': user.id if user else None,
                    'organization_id': org_id,
                },
            )
        except Exception:
            # Re-raise to be caught by save() method
            raise
