import logging
import sys

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError

from core.redis import redis_connected

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Check rqworker connection issues'

    def handle(self, *args, **options):
        logger.debug(f"===> Start DB check.")
        db_status = self.db_check()
        logger.debug(f"===> DB check {'is successful' if db_status else 'has failed'}.")
        logger.debug(f"===> Start redis connection check.")
        redis_status = redis_connected()
        logger.debug(f"===> Redis check {'is successful' if redis_status else 'has failed'}.")
        sys.exit(0 if db_status & redis_status else 1)

    def db_check(self):
        db_conn = connections['default']
        try:
            c = db_conn.cursor()
        except OperationalError:
            return False
        else:
            return True
