"""
Utility functions for working with the declarative transition system.

This module provides helper functions to make it easier to integrate
the new Pydantic-based transition system with existing Label Studio code.
"""

import logging
from typing import Any, Dict, List, Type

from django.db.models import Model
from fsm.registry import transition_registry
from fsm.state_manager import get_state_manager
from fsm.transitions import BaseTransition, TransitionValidationError

logger = logging.getLogger(__name__)

StateManager = get_state_manager()


def get_available_transitions(entity: Model, user=None, validate: bool = False) -> Dict[str, Type[BaseTransition]]:
    """
    Get available transitions for an entity.

    Args:
        entity: The entity to get transitions for
        user: User context for validation (only used when validate=True)
        validate: Whether to validate each transition against current state.
                 When False, returns all registered transitions for the entity type.
                 When True, filters to only transitions valid from current state (may be expensive).

    Returns:
        Dictionary mapping transition names to transition classes.
        When validate=False: All registered transitions for the entity type.
        When validate=True: Only transitions valid for the current state.
    """
    entity_name = entity._meta.model_name.lower()
    available = transition_registry.get_transitions_for_entity(entity_name)

    if not validate:
        return available

    valid_transitions = {}

    for name, transition_class in available.items():
        try:
            # Get current state information using potentially overridden StateManager
            current_state_object = StateManager.get_current_state_object(entity)
            current_state = current_state_object.state if current_state_object else None

            # Build minimal context for validation
            from .transitions import TransitionContext

            # Get target state from instance (may need entity context)
            # For validation purposes, we try to create with minimal/default data
            try:
                temp_instance = transition_class()
                # Create minimal context for dynamic target_state computation
                minimal_context = TransitionContext(
                    entity=entity,
                    current_user=user,
                    current_state_object=current_state_object,
                    current_state=current_state,
                    target_state=None,  # Will be computed
                    organization_id=getattr(entity, 'organization_id', None),
                )
                target_state = temp_instance.get_target_state(minimal_context)
            except (TypeError, ValueError):
                # Can't instantiate without required data - include in results
                # since we can't validate state transitions, we assume they're available
                valid_transitions[name] = transition_class
                continue

            context = TransitionContext(
                entity=entity,
                current_user=user,
                current_state_object=current_state_object,
                current_state=current_state,
                target_state=target_state,
                organization_id=getattr(entity, 'organization_id', None),
            )

            # Use class-level validation that doesn't require an instance
            if transition_class.can_transition_from_state(context):
                valid_transitions[name] = transition_class

        except TransitionValidationError:
            # Transition is not valid for current state/context - this is expected
            continue
        except Exception as e:
            # Unexpected error during validation - this should be investigated
            logger.warning(
                'Unexpected error validating transition',
                extra={
                    'event': 'fsm.transition_validation_error',
                    'transition_name': name,
                    'entity_type': entity._meta.model_name,
                    'error': str(e),
                },
                exc_info=True,
            )
            continue

    return valid_transitions


def create_transition_from_dict(transition_class: Type[BaseTransition], data: Dict[str, Any]) -> BaseTransition:
    """
    Create a transition instance from a dictionary of data.

    This handles Pydantic validation and provides clear error messages.

    Args:
        transition_class: The transition class to instantiate
        data: Dictionary of transition data

    Returns:
        Validated transition instance

    Raises:
        ValueError: If data validation fails
    """
    try:
        return transition_class(**data)
    except Exception as e:
        raise ValueError(f'Failed to create {transition_class.__name__}: {e}')


def get_transition_schema(transition_class: Type[BaseTransition]) -> Dict[str, Any]:
    """
    Get the JSON schema for a transition class.

    Useful for generating API documentation or frontend forms.

    Args:
        transition_class: The transition class

    Returns:
        JSON schema dictionary
    """
    return transition_class.model_json_schema()


def validate_transition_data(transition_class: Type[BaseTransition], data: Dict[str, Any]) -> Dict[str, List[str]]:
    """
    Validate transition data without creating an instance.

    Args:
        transition_class: The transition class
        data: Data to validate

    Returns:
        Dictionary of field names to error messages (empty if valid)
    """
    try:
        transition_class(**data)
        return {}
    except Exception as e:
        # Parse Pydantic validation errors
        errors = {}
        if hasattr(e, 'errors'):
            for error in e.errors():
                field = '.'.join(str(loc) for loc in error['loc'])
                if field not in errors:
                    errors[field] = []
                errors[field].append(error['msg'])
        else:
            errors['__root__'] = [str(e)]
        return errors


def get_entity_state_flow(entity: Model) -> List[Dict[str, Any]]:
    """
    Get a summary of the state flow for an entity type.

    This analyzes all registered transitions and builds a flow diagram.

    Args:
        entity: Example entity instance

    Returns:
        List of state flow information
    """
    entity_name = entity._meta.model_name.lower()
    transitions = transition_registry.get_transitions_for_entity(entity_name)

    # Build state flow information
    states = set()
    flows = []

    for transition_name, transition_class in transitions.items():
        # Create instance to get target state
        try:
            from .transitions import TransitionContext

            transition = transition_class()
            # Create minimal context for dynamic target_state computation
            minimal_context = (
                TransitionContext(
                    entity=entity,
                    current_user=None,
                    current_state_object=None,
                    current_state=None,
                    target_state=None,  # Will be computed
                    organization_id=getattr(entity, 'organization_id', None),
                )
                if hasattr(entity, 'pk')
                else None
            )
            target = transition.get_target_state(minimal_context)
            states.add(target)

            flows.append(
                {
                    'transition_name': transition_name,
                    'transition_class': transition_class.__name__,
                    'target_state': target,
                    'description': transition_class.__doc__ or '',
                    'fields': list(transition_class.model_fields.keys()),
                }
            )
        except Exception:
            continue

    return flows
