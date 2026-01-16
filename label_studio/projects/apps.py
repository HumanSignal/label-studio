"""Projects Django App Configuration"""

import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class ProjectsConfig(AppConfig):
    name = 'projects'

    def ready(self):
        """
        Projects app initialization.

        Note: FSM transitions are now registered centrally in fsm/apps.py.
        Do NOT import transitions here to avoid duplicate registration.
        """
        # Import signals to register signal handlers
        import projects.signals  # noqa: F401
        # Import rules to register permission predicates
        import projects.rules  # noqa: F401
