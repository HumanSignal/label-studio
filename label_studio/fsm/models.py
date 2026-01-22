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
        Override from_db to store raw DB values for lazy capture.

        Django calls this method instead of __init__ when loading models from the database.

        PERFORMANCE: We store the raw field values here without processing them.
        This avoids accessing any ForeignKey fields (which would trigger queries).
        We only process these values into _original_values in save() when we actually
        need them for change detection.
        """
        instance = super().from_db(db, field_names, values)
        # Initialize as empty dict for safe access
        instance._original_values = dict(zip(field_names, values))

        return instance

    def __reduce_ex__(self, protocol):
        """
        Override serialization to exclude internal FSM tracking fields.

        Django's serialization uses pickle which calls __reduce_ex__.
        We exclude FSM tracking fields since they're only needed for runtime
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
            if field.attname not in self._original_values:
                continue
            if field.is_relation and field.many_to_many:
                continue

            old_value = self._original_values[field.attname]
            new_value = getattr(self, field.attname, None)

            if old_value != new_value:
                changed[field.attname] = (old_value, new_value)
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
                        minimal_context = TransitionContext(
                            entity=self,
                            current_user=None,  # Will be set properly during execution
                            current_state_object=None,  # Skip to avoid recursion
                            current_state=None,  # Skip to avoid recursion
                            target_state=None,  # Will be computed
                            organization_id=getattr(self, 'organization_id', None),
                        )

                        # Get target_state (can use entity from minimal_context)
                        target_state = temp_transition.get_target_state(minimal_context)

                        # Update context with computed target_state
                        context = TransitionContext(
                            entity=self,
                            current_user=None,
                            current_state_object=None,
                            current_state=None,
                            target_state=target_state,
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
        - Feature flag is disabled (cached at request level)
        - Manually disabled via set_fsm_disabled() (for tests/bulk operations)
        - Explicitly skipped via instance attribute

        Returns:
            True if FSM should execute, False otherwise

        PERFORMANCE: Uses cached FSM enabled state from CurrentContext that was set
        once per request when user was initialized. This is a simple boolean check
        instead of repeated feature flag lookups and user authentication checks.
        """
        # Check for instance-level skip flag
        if getattr(self, '_skip_fsm', False):
            return False

        # Fast path: Check cached FSM enabled state
        # This was set once per request in CurrentContext.set_user()
        from core.current_request import CurrentContext

        return CurrentContext.is_fsm_enabled()

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
        from core.current_request import CurrentContext

        # Check for explicit FSM skip flag
        skip_fsm = kwargs.pop('skip_fsm', CurrentContext.is_fsm_disabled())

        # Check if this is a creation vs update
        is_creating = self._state.adding

        # Capture changed fields before save (only for updates)
        changed_fields = {} if is_creating else self._get_changed_fields()

        # Perform the actual save
        result = super().save(*args, **kwargs)

        # After successful save, update _original_values to current values
        # This ensures subsequent saves can detect changes correctly
        # Store attname values (raw PK for ForeignKey fields) to match from_db() format
        self._original_values = {}
        for field in self._meta.fields:
            if field.is_relation and field.many_to_many:
                continue
            self._original_values[field.attname] = getattr(self, field.attname, None)

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
