"""Tasks Django App Configuration"""

import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class TasksConfig(AppConfig):
    name = 'tasks'

    def ready(self):
        """
        Tasks app initialization.

        Note: FSM transitions are now registered centrally in fsm/apps.py.
        Do NOT import transitions here to avoid duplicate registration.
        """
        pass
