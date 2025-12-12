import logging
from typing import Optional

from core.utils.common import load_func
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_inference_map_lso():
    return {}


def get_inference_map():
    return load_func(settings.FSM_INFERENCE_MAP)()


def get_or_infer_state(entity) -> Optional[str]:
    """
    Infer the FSM state for an entity from its fields and relationships.

    This function is called ONLY when StateManager has already checked cache and DB
    and found no state. It purely does inference based on entity fields.

    NOTE: This function does NOT query the database - StateManager already did that.
    It only looks at entity fields and relationships to infer the current state.

    Args:
        entity: The entity instance (Task, Annotation, etc.)

    Returns:
        Inferred state string, or None if inference failed
    """
    try:
        # Infer state from entity fields (no DB queries)

        # Infer based on entity type
        entity_type = entity._meta.model_name

        logger.info(
            f'Inferring state for {entity_type} {entity.id} from entity fields',
            extra={
                'event': 'fsm.state_inference',
                'entity_type': entity_type,
                'entity_id': entity.id,
            },
        )

        inference_func = get_inference_map().get(entity_type.lower())
        if not inference_func:
            logger.warning(f'No inference function for entity type: {entity_type}')
            return None

        inferred_state = inference_func(entity)

        logger.info(
            f'Inferred state for {entity_type} {entity.id}: {inferred_state}',
            extra={
                'event': 'fsm.state_inferred',
                'entity_type': entity_type,
                'entity_id': entity.id,
                'inferred_state': inferred_state,
            },
        )

        return inferred_state

    except Exception as e:
        logger.error(
            f'Failed to get or infer state for {entity_type}: {e}',
            exc_info=True,
            extra={
                'event': 'fsm.state_inference_failed',
                'entity_type': entity_type,
                'entity_id': getattr(entity, 'id', None),
            },
        )
        # Return None - caller should handle this gracefully
        return None


def backfill_state_for_entity(entity) -> Optional[str]:
    """
    Backfill FSM state for an entity that doesn't have one.

    This is used during migration or manual backfill operations to create
    state records for existing entities.

    Args:
        entity: The entity instance

    Returns:
        The inferred/created state, or None if failed
    """
    try:
        inferred_state = get_or_infer_state(entity)

        if not inferred_state:
            return None

        from core.current_request import CurrentContext
        from fsm.state_manager import get_state_manager

        # Skip if FSM is disabled (e.g., during cleanup or bulk operations)
        if CurrentContext.is_fsm_disabled():
            return inferred_state

        StateManager = get_state_manager()

        # Try to get user from entity
        user = None
        if hasattr(entity, 'user'):
            user = entity.user
        elif hasattr(entity, 'created_by'):
            user = entity.created_by
        elif hasattr(entity, 'completed_by'):
            user = entity.completed_by

        # Get organization from context or entity
        org_id = CurrentContext.get_organization_id()
        if not org_id and hasattr(entity, 'project'):
            org_id = entity.project.organization_id

        # Create initial state record
        # Note: This uses a special backfill transition that doesn't require validation
        StateManager.transition_state(
            entity=entity,
            new_state=inferred_state,
            transition_name='backfill_state',
            context={
                'inferred': True,
            },
            reason='State backfilled from existing data',
            user=user,
            organization_id=org_id,
        )

        entity_type = entity._meta.model_name
        logger.info(
            f'Backfilled state for {entity_type} {entity.id}: {inferred_state}',
            extra={
                'event': 'fsm.state_backfilled',
                'entity_type': entity_type,
                'entity_id': entity.id,
                'state': inferred_state,
            },
        )

        return inferred_state

    except Exception as e:
        logger.error(
            f'Failed to backfill state for {entity_type}: {e}',
            exc_info=True,
            extra={
                'event': 'fsm.state_backfill_failed',
                'entity_type': entity_type,
                'entity_id': getattr(entity, 'id', None),
            },
        )
        return None
