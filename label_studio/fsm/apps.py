"""FSM Django App Configuration"""

import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class FsmConfig(AppConfig):
    default_auto_field = 'django.db.models.UUIDField'
    name = 'fsm'
    verbose_name = 'Label Studio FSM'

    def ready(self):
        """
        Import models and state_choices to ensure registration happens on Django startup.

        The @register_state_model and @register_state_choices decorators run during
        module import, so we must import these modules to populate the registries.
        This ensures state models are available throughout the application lifecycle.

        CENTRALIZED TRANSITION REGISTRATION:
        This is the ONLY place in LSO where FSM transitions should be imported.
        When running LSE, transitions are skipped here and registered in lse_fsm/apps.py instead.
        """
        from core.utils.common import is_community

        # Always import base models and state_choices (needed for registry)
        from . import (
            models,  # noqa: F401  - FsmHistoryStateModel base class
            state_choices,  # noqa: F401  - State choice definitions
        )

        # Import state models only in community edition
        # LSE will register its own extended state models in lse_fsm/apps.py
        if is_community():
            from . import (
                state_models,  # noqa: F401  - OSS state models (TaskState, AnnotationState, etc.)
            )

            logger.debug('FSM: Registered OSS state models')

        logger.debug('FSM models and state choices registered')

        # Only import LSO transitions when running community edition
        # When running LSE, skip these entirely - LSE provides its own transitions
        if is_community():
            # Import all LSO transitions centrally from fsm/ - ONLY place to do this
            from . import (
                annotation_transitions,  # noqa: F401
                project_transitions,  # noqa: F401
                task_transitions,  # noqa: F401
            )

            logger.info('LSO FSM: Registered LSO transitions (community edition)')
        else:
            logger.info('LSO FSM: Skipping LSO transitions (running LSE)')
