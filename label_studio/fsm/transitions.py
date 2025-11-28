"""
Declarative Pydantic-based transition system for FSM engine.

This module provides a framework for defining state transitions as first-class
Pydantic models with built-in validation, context passing, and middleware-like
functionality for enhanced declarative state management.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Generic, Optional, TypeVar

from django.db.models import Model
from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from fsm.state_models import BaseState

    # Type variables for generic transition context
    EntityType = TypeVar('EntityType', bound=Model)
    StateModelType = TypeVar('StateModelType', bound=BaseState)
else:
    EntityType = TypeVar('EntityType')
    StateModelType = TypeVar('StateModelType')


class TransitionContext(BaseModel, Generic[EntityType, StateModelType]):
    """
    Context object passed to all transitions containing middleware-like information.

    This provides access to current state, entity, user, and other contextual
    information needed for transition validation and execution.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    # Core context information
    entity: Any = Field(..., description='The entity being transitioned')
    current_user: Optional[Any] = Field(None, description='User triggering the transition')
    current_state_object: Optional[Any] = Field(None, description='Full current state object')
    current_state: Optional[str] = Field(None, description='Current state as string')
    target_state: Optional[str] = Field(
        None, description='Target state for this transition (None for side-effect only transitions)'
    )

    # Timing and metadata
    timestamp: datetime = Field(default_factory=datetime.now, description='When transition was initiated')
    transition_name: Optional[str] = Field(None, description='Name of the transition method')

    # Additional context data
    request_data: Dict[str, Any] = Field(default_factory=dict, description='Additional request/context data')
    metadata: Dict[str, Any] = Field(default_factory=dict, description='Transition-specific metadata')

    # Organizational context
    organization_id: Optional[int] = Field(None, description='Organization context for the transition')

    # Validation context, for cases where we want to skip validation for the transition
    skip_validation: Optional[bool] = Field(default=False, description='Whether to skip validation for the transition')

    @property
    def has_current_state(self) -> bool:
        """Check if entity has a current state"""
        return self.current_state is not None

    @property
    def is_initial_transition(self) -> bool:
        """Check if this is the first state transition for the entity"""
        return not self.has_current_state


class TransitionValidationError(Exception):
    """Exception raised when transition validation fails"""

    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.context = context or {}


class BaseTransition(BaseModel, ABC, Generic[EntityType, StateModelType]):
    """
    Abstract base class for all declarative state transitions.

    This provides the framework for implementing transitions as first-class Pydantic
    models with built-in validation, context handling, and execution logic.

    Example usage:
        class StartTaskTransition(BaseTransition[Task, TaskState]):
            assigned_user_id: int = Field(..., description="User assigned to start the task")
            estimated_duration: Optional[int] = Field(None, description="Estimated completion time in hours")

            def get_target_state(self, context: Optional[TransitionContext[Task, TaskState]]) -> str:
                return TaskStateChoices.IN_PROGRESS

            def validate_transition(self, context: TransitionContext[Task, TaskState]) -> bool:
                if context.current_state == TaskStateChoices.COMPLETED:
                    raise TransitionValidationError("Cannot start an already completed task")
                return True

            def transition(self, context: TransitionContext[Task, TaskState]) -> Dict[str, Any]:
                return {
                    "assigned_user_id": self.assigned_user_id,
                    "estimated_duration": self.estimated_duration,
                    "started_at": context.timestamp.isoformat()
                }
    """

    model_config = ConfigDict(arbitrary_types_allowed=True, validate_assignment=True, use_enum_values=True)

    def __init__(self, **data):
        super().__init__(**data)
        self.__context: Optional[TransitionContext[EntityType, StateModelType]] = None

    @property
    def context(self) -> Optional[TransitionContext[EntityType, StateModelType]]:
        """Access the current transition context"""
        return getattr(self, '_BaseTransition__context', None)

    @context.setter
    def context(self, value: TransitionContext[EntityType, StateModelType]):
        """Set the transition context"""
        self.__context = value

    @abstractmethod
    def get_target_state(
        self, context: Optional[TransitionContext[EntityType, StateModelType]] = None
    ) -> Optional[str]:
        """
        Get the target state this transition leads to.

        Can optionally use context to compute target_state dynamically.
        If context is None, should return a static target_state or None.

        Args:
            context: Optional transition context (may be minimal with just entity)

        Returns:
            String representation of the target state, or None for side-effect only transitions
            that don't create state records (e.g., audit-only or notification-only transitions)
        """
        pass

    @property
    def transition_name(self) -> str:
        """
        Name of this transition for audit purposes.

        Returns the registered transition name from the decorator, or falls back
        to the class name in snake_case.
        """
        # Use the registered name if available (set by @register_state_transition decorator)
        if hasattr(self.__class__, '_transition_name'):
            return self.__class__._transition_name

        # Fallback to class name in snake_case for backward compatibility
        class_name = self.__class__.__name__
        result = ''
        for i, char in enumerate(class_name):
            if char.isupper() and i > 0:
                result += '_'
            result += char.lower()
        return result

    @classmethod
    def can_transition_from_state(cls, context: TransitionContext[EntityType, StateModelType]) -> bool:
        """
        Class-level validation for whether this transition type is allowed from the current state.

        This method checks if the transition is structurally valid (e.g., allowed state transitions)
        without needing the actual transition data. Override this to implement state-based rules.

        Args:
            context: The transition context containing entity, user, and state information

        Returns:
            True if transition type is allowed from current state, False otherwise
        """
        return True

    def validate_transition(self, context: TransitionContext[EntityType, StateModelType]) -> bool:
        """
        Validate whether this specific transition instance can be performed.

        This method validates both the transition type (via can_transition_from_state)
        and the specific transition data. Override to add data-specific validation.

        Args:
            context: The transition context containing entity, user, and state information

        Returns:
            True if transition is valid, False otherwise

        Raises:
            TransitionValidationError: If transition validation fails with specific reason
        """
        # First check if this transition type is allowed
        if not self.can_transition_from_state(context):
            return False

        # Then perform instance-specific validation
        return True

    def pre_transition_hook(self, context: TransitionContext[EntityType, StateModelType]) -> None:
        """
        Hook called before the transition is executed.

        Use this for any setup or preparation needed before state change.
        Override in subclasses as needed.

        Args:
            context: The transition context
        """
        pass

    @abstractmethod
    def transition(self, context: TransitionContext[EntityType, StateModelType]) -> Dict[str, Any]:
        """
        Execute the transition and return context data for the state record.

        This is the core method that implements the transition logic.
        Must be implemented by all concrete transition classes.

        Args:
            context: The transition context containing all necessary information

        Returns:
            Dictionary of context data to be stored with the state record

        Raises:
            TransitionValidationError: If transition cannot be completed
        """
        pass

    def post_transition_hook(
        self, context: TransitionContext[EntityType, StateModelType], state_record: StateModelType
    ) -> None:
        """
        Hook called after the transition has been successfully executed.

        Use this for any cleanup, notifications, or side effects after state change.
        Override in subclasses as needed.

        Args:
            context: The transition context
            state_record: The newly created state record
        """
        pass

    def get_reason(self, context: TransitionContext[EntityType, StateModelType]) -> str:
        """
        Get a human-readable reason for this transition.

        Override in subclasses to provide more specific reasons.

        Args:
            context: The transition context

        Returns:
            Human-readable reason string
        """
        user_info = f'by {context.current_user}' if context.current_user else 'automatically'
        return f'{self.__class__.__name__} executed {user_info}'

    def prepare_and_validate(self, context: TransitionContext[EntityType, StateModelType]) -> Dict[str, Any]:
        """
        Prepare and validate the transition, returning the transition data.

        This method handles the preparation phase of the transition:
        1. Set context on the transition instance
        2. Validate the transition if not skipped
        3. Execute pre-transition hooks
        4. Perform the actual transition logic

        Args:
            context: The transition context

        Returns:
            Dictionary of transition data to be stored with the state record

        Raises:
            TransitionValidationError: If validation fails
        """
        # Set context for access during transition
        self.context = context

        # Update context with transition name
        context.transition_name = self.transition_name

        try:
            # Validate transition
            if not context.skip_validation and not self.validate_transition(context):
                raise TransitionValidationError(
                    f'Transition validation failed for {self.transition_name}',
                    {'current_state': context.current_state, 'target_state': context.target_state},
                )

            # Pre-transition hook
            self.pre_transition_hook(context)

            # Execute the transition logic
            transition_data = self.transition(context)

            return transition_data

        except Exception:
            # Clear context on error
            self.context = None
            raise

    def finalize(self, context: TransitionContext[EntityType, StateModelType], state_record: StateModelType) -> None:
        """
        Finalize the transition after the state record has been created.

        This method handles post-transition activities:
        1. Execute post-transition hooks
        2. Clear the context

        Args:
            context: The transition context
            state_record: The newly created state record
        """
        try:
            # Post-transition hook
            self.post_transition_hook(context, state_record)
        finally:
            # Always clear context when done
            self.context = None


class ModelChangeTransition(BaseTransition, Generic[EntityType, StateModelType]):
    """
    Specialized transition class for model-triggered state changes.

    This class extends BaseTransition with additional context about model changes,
    making it ideal for transitions triggered by FsmHistoryStateModel.save() operations.

    Features:
    - Access to changed fields (old vs new values)
    - Knowledge of whether entity is being created or updated
    - Automatic integration with FsmHistoryStateModel lifecycle
    - Declarative trigger field specification

    Example usage:
        @register_state_transition('task', 'task_created', triggers_on_create=True)
        class TaskCreatedTransition(ModelChangeTransition[Task, TaskState]):
            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'CREATED'

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'reason': 'Task created'}

        @register_state_transition('task', 'task_labeled', triggers_on=['is_labeled'])
        class TaskLabeledTransition(ModelChangeTransition[Task, TaskState]):
            def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
                return 'ANNOTATION_COMPLETE'

            def transition(self, context: TransitionContext) -> Dict[str, Any]:
                return {'reason': 'Task became labeled'}
    """

    # Additional fields specific to model changes
    changed_fields: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict, description="Fields that changed: {field_name: {'old': value, 'new': value}}"
    )
    is_creating: bool = Field(default=False, description='Whether this is a new entity creation')

    # Class-level metadata for trigger configuration (set by decorator)
    _triggers_on_create: bool = False
    _triggers_on_update: bool = True
    _trigger_fields: list = []  # Fields that trigger this transition

    def should_execute(self, context: TransitionContext[EntityType, StateModelType]) -> bool:
        """
        Determine if this transition should execute based on model changes.

        Override in subclasses to provide specific logic based on:
        - Whether entity is being created (is_creating)
        - Which fields changed (changed_fields)
        - Current and target states

        Default implementation always returns True.

        Args:
            context: The transition context with entity and state information

        Returns:
            True if transition should execute, False to skip

        Example:
            def should_execute(self, context: TransitionContext) -> bool:
                # Only execute if is_labeled changed to True
                if 'is_labeled' in self.changed_fields:
                    old_val = self.changed_fields['is_labeled']['old']
                    new_val = self.changed_fields['is_labeled']['new']
                    return not old_val and new_val
                return False
        """
        return True

    def validate_transition(self, context: TransitionContext[EntityType, StateModelType]) -> bool:
        """
        Validate whether this transition should execute.

        Extends parent validation with should_execute() check.

        Args:
            context: The transition context

        Returns:
            True if transition is valid and should execute

        Raises:
            TransitionValidationError: If validation fails
        """
        # First check parent validation
        if not super().validate_transition(context):
            return False

        # Then check if we should execute based on model changes
        if not self.should_execute(context):
            return False

        return True

    @classmethod
    def from_model_change(
        cls, is_creating: bool, changed_fields: Dict[str, tuple], **extra_data
    ) -> 'ModelChangeTransition':
        """
        Factory method to create a transition from model change data.

        This is called by FsmHistoryStateModel when a transition needs to be executed.

        Args:
            is_creating: Whether the model is being created
            changed_fields: Dict of changed fields (field_name -> (old, new))
            **extra_data: Additional data to pass to the transition

        Returns:
            Configured transition instance
        """
        # Convert changed_fields from tuple format to dict format
        converted_fields = {
            field_name: {'old': old_val, 'new': new_val} for field_name, (old_val, new_val) in changed_fields.items()
        }

        return cls(is_creating=is_creating, changed_fields=converted_fields, **extra_data)

    def get_reason(self, context: TransitionContext[EntityType, StateModelType]) -> str:
        """
        Get a human-readable reason for this model change transition.

        Override to provide more specific reasons based on model changes.

        Args:
            context: The transition context

        Returns:
            Human-readable reason string
        """
        if self.is_creating:
            return f'{context.entity.__class__.__name__} created'

        if self.changed_fields:
            fields = ', '.join(self.changed_fields.keys())
            return f'{context.entity.__class__.__name__} updated ({fields} changed)'

        return f'{context.entity.__class__.__name__} modified'
