import logging

from core.migration_helpers import start_migration_job
from django.conf import settings
from django.db import migrations

logger = logging.getLogger(__name__)

migration_name = __name__
BATCH_SIZE = 1000

# Digit-prefixed migration modules cannot be pickled as function refs for RQ.
forward_migration_path = f'{migration_name}.forward_migration'


def forward_migration(migration_name):
    """Null last_activity values that were the old create-time default, not real usage."""
    from datetime import timedelta

    from core.models import AsyncMigrationStatus
    from core.utils.iterators import iterate_queryset_in_keyset_batches
    from django.contrib.auth import get_user_model
    from django.db.models import F

    migration, created = AsyncMigrationStatus.objects.get_or_create(
        name=migration_name,
        defaults={'status': AsyncMigrationStatus.STATUS_STARTED, 'meta': {}},
    )
    if not created and migration.status == AsyncMigrationStatus.STATUS_FINISHED:
        logger.info('%s already finished', migration_name)
        return

    migration.status = AsyncMigrationStatus.STATUS_STARTED
    migration.save(update_fields=['status'])
    logger.info('Start async migration %s', migration_name)

    User = get_user_model()
    # Two separate timezone.now() defaults: prod never-login rows are ~tens of
    # microseconds apart (p99 < 1ms), nothing between 1s and 60s. Keep anything
    # later with no last_login (API-only usage).
    window = timedelta(seconds=1)
    try:
        qs = User.objects.filter(
            last_login__isnull=True,
            last_activity__isnull=False,
            last_activity__gte=F('date_joined') - window,
            last_activity__lte=F('date_joined') + window,
        ).only('id')
        updated = 0
        for batch in iterate_queryset_in_keyset_batches(qs, chunk_size=BATCH_SIZE):
            ids = [row.id for row in batch]
            if ids:
                updated += User.objects.filter(id__in=ids).update(last_activity=None)

        migration.meta = {**(migration.meta or {}), 'updated_count': updated}
        migration.status = AsyncMigrationStatus.STATUS_FINISHED
        migration.save(update_fields=['status', 'meta'])
        logger.info('%s complete. rows updated: %s', migration_name, updated)
    except Exception as exc:
        logger.exception('%s failed: %s', migration_name, exc)
        migration.meta = {**(migration.meta or {}), 'error': str(exc)}
        migration.status = AsyncMigrationStatus.STATUS_ERROR
        migration.save(update_fields=['status', 'meta'])
        raise


def forwards(apps, schema_editor):
    start_migration_job(
        forward_migration_path,
        migration_name=migration_name,
        queue_name=settings.SERVICE_QUEUE_NAME,
    )


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('users', '0012_user_last_activity_nullable'),
        ('core', '0001_initial'),
    ]
    operations = [
        migrations.RunPython(forwards, backwards),
    ]
