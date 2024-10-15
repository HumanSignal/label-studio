import logging

from django.conf import settings
from django.core.management.commands.migrate import Command as MigrateCommand
from django.db import connections

logger = logging.getLogger(__name__)

DEFAULT_LOCK_ID = getattr(settings, 'MIGRATE_LOCK_ID', 1000)


class Command(MigrateCommand):
    help = 'Run Django migrations safely, using a lock'

    def add_arguments(self, parser):
        MigrateCommand.add_arguments(self, parser)
        parser.add_argument(
            '--migrate-lock-id',
            default=DEFAULT_LOCK_ID,
            type=int,
            help='The id of the advisory lock to use',
        )

    def handle(self, *args, **options):
        database = options['database']
        if not options['skip_checks']:
            self.check(databases=[database])

        # Get the database we're operating from
        connection = connections[database]
        # Hook for backends needing any database preparation
        connection.prepare_database()

        lock_id = options['migrate_lock_id']
        with connection.cursor() as cursor:
            try:
                logger.info(f'Attempting to acquire a migration lock: {lock_id}')
                cursor.execute(f'SELECT pg_advisory_xact_lock({lock_id})')
                logger.info('Successfully acquired the lock. Starting migrations...')
                MigrateCommand.handle(self, *args, **options)
            finally:
                logger.info('Migration lock has been released.')
