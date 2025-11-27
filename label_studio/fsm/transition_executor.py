"""
Transition execution orchestrator for the FSM engine.

This module handles the execution of state transitions, coordinating between
the registry and transitions without importing StateManager to avoid circular dependencies.
StateManager imports from this module and provides its methods as parameters.
"""

import logging
from typing import Any, Dict, Type

from django.db.models import Model
from fsm.registry import get_state_model_for_entity, transition_registry
from fsm.state_models import BaseState
from fsm.transitions import TransitionContext

logger = logging.getLogger(__name__)


def execute_transition_with_state_manager(
    entity: Model,
    transition_name: str,
    transition_data: Dict[str, Any],
    user,
    state_manager_class: Type,
    **context_kwargs,
) -> BaseState:
    """
    Execute a registered transition using StateManager methods passed as parameters.

    This function is called by StateManager.execute_transition() to avoid circular imports.
    StateManager imports this module and passes itself as a parameter.

    Args:
        entity: The entity to transition
        transition_name: Name of the registered transition
        transition_data: Data for the transition (validated by Pydantic)
        user: User executing the transition
        state_manager_class: The StateManager class to use for state operations
        **context_kwargs: Additional context data

    Returns:
        The newly created state record

    Raises:
        ValueError: If transition is not found or state model is not registered
        TransitionValidationError: If transition validation fails
    """
    entity_name = entity._meta.model_name.lower()
    transition_data = transition_data or {}

    # Get the transition class from registry
    transition_class = transition_registry.get_transition(entity_name, transition_name)
    if not transition_class:
        raise ValueError(f"Transition '{transition_name}' not found for entity '{entity_name}'")

    # Create transition instance
    transition = transition_class(**transition_data)

    # Extract organization_id from context_kwargs if provided, otherwise use entity's org_id
    organization_id = context_kwargs.pop('organization_id', getattr(entity, 'organization_id', None))

    # Create minimal context with just entity for target_state computation
    minimal_context = TransitionContext(
        entity=entity,
        current_user=user,
        current_state_object=None,
        current_state=None,
        target_state=None,  # Will be computed
        organization_id=organization_id,
    )

    # Get target_state (can now use entity from context)
    target_state = transition.get_target_state(minimal_context)
    is_side_effect_only = target_state is None

    if is_side_effect_only:
        # No state model needed for side-effect only transitions
        state_model = None
        current_state_object = None
        current_state = None
    else:
        # Get the state model for the entity
        state_model = get_state_model_for_entity(entity)
        if not state_model:
            raise ValueError(f"No state model registered for entity '{entity_name}'")

        # Get current state information directly from state model
        current_state_object = state_model.get_current_state(entity)
        current_state = current_state_object.state if current_state_object else None

    # Build full transition context
    context = TransitionContext(
        entity=entity,
        current_user=user,
        current_state_object=current_state_object,
        current_state=current_state,
        target_state=target_state,
        organization_id=organization_id,
        **context_kwargs,
    )

    logger.info(
        'Executing transition',
        extra={
            'event': 'fsm.transition_execute',
            'entity_type': entity_name,
            'entity_id': entity.pk,
            'transition_name': transition_name,
            'from_state': current_state,
            'to_state': target_state,
            'user_id': user.id if user else None,
        },
    )

    # Execute the transition in phases
    # Phase 1: Prepare and validate the transition
    transition_context_data = transition.prepare_and_validate(context)

    # Phase 2: Create the state record via StateManager methods (skip for side-effect only transitions)
    if is_side_effect_only:
        # For side-effect only transitions, execute hooks without creating state records
        logger.info(
            'Executing side-effect only transition',
            extra={
                'event': 'fsm.side_effect_transition',
                'entity_type': entity_name,
                'entity_id': entity.pk,
                'transition_name': transition_name,
            },
        )
        transition.post_transition_hook(context, None)
        return None

    # Check if this transition forces state record creation (for audit trails)
    force_state_record = getattr(transition, '_force_state_record', False)

    success = state_manager_class.transition_state(
        entity=entity,
        new_state=target_state,
        transition_name=transition.transition_name,
        user=user,
        context=transition_context_data,
        reason=transition.get_reason(context),
        force_state_record=force_state_record,
    )

    if not success:
        raise ValueError(f'Failed to create state record for {transition_name}')

    # Get the newly created state record via StateManager
    state_record = state_manager_class.get_current_state_object(entity)

    # Phase 3: Finalize the transition
    transition.finalize(context, state_record)

    return state_record
