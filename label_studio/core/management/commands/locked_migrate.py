import logging
import time

from django.conf import settings
from django.core.management.commands.migrate import Command as MigrateCommand
from django.db import connections, transaction

logger = logging.getLogger(__name__)

DEFAULT_LOCK_ID = getattr(settings, 'MIGRATE_LOCK_ID', 1000)

LOCKED_MIGRATE_CMD_CONNECTION_ALIAS = 'locked_migrate_cmd_connection'
RETRY_INTERVAL = 5  # Time to wait between retries in seconds
MAX_WAIT_TIME = 300  # Maximum time to wait for the lock in seconds (5 minutes)


class Command(MigrateCommand):
    help = 'Run Django migrations safely, using a lock'

    def add_arguments(self, parser) -> None:
        MigrateCommand.add_arguments(self, parser)
        parser.add_argument(
            '--migrate-lock-id',
            default=DEFAULT_LOCK_ID,
            type=int,
            help='The id of the advisory lock to use',
        )

    def handle(self, *args, **options) -> None:
        lock_id = options.pop('migrate_lock_id')

        # Create a separate database connection to hold the lock
        separate_lock_connection = connections.create_connection('default')
        connections[LOCKED_MIGRATE_CMD_CONNECTION_ALIAS] = separate_lock_connection
        try:
            # Use a transaction to hold the lock for the duration of the migration
            with transaction.atomic(using=LOCKED_MIGRATE_CMD_CONNECTION_ALIAS):
                # Attempt to acquire the lock with retries
                self.acquire_lock_with_retry(separate_lock_connection, lock_id)
                # Run the standard Django migration once lock is acquired
                super().handle(*args, **options)
            logger.info('Migration complete, the migration lock has now been released.')
        finally:
            # Ensure the lock connection is closed to free resources
            separate_lock_connection.close()

    def acquire_lock_with_retry(self, lock_connection, lock_id) -> None:
        start_time = time.time()

        while True:
            with lock_connection.cursor() as cursor:
                logger.info(f'Attempting to acquire the postgres advisory transaction lock with id: {lock_id}.')

                # Attempt to acquire the transaction-level lock without blocking
                cursor.execute(f'SELECT pg_try_advisory_xact_lock({lock_id})')
                lock_acquired = cursor.fetchone()[0]

                if lock_acquired:
                    logger.info('Acquired the transaction lock, proceeding with migration.')
                    return  # Exit the function if the lock is acquired

                # Check if the maximum wait time has been reached
                elapsed_time = time.time() - start_time
                if elapsed_time >= MAX_WAIT_TIME:
                    logger.info('Could not acquire the transaction lock within the timeout period.')
                    raise TimeoutError('Failed to acquire PostgreSQL advisory transaction lock within 5 minutes.')

                # Wait before retrying
                logger.info(f'Lock not acquired. Retrying in {RETRY_INTERVAL} seconds...')
                time.sleep(RETRY_INTERVAL)
