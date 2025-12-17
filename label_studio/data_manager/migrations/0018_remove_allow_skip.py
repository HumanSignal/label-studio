"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.

Async migration to hide the allow_skip column for all existing views.

The allow_skip column was added with visibility_defaults={'explore': False, 'labeling': False},
meaning it should be hidden by default. However, existing views don't have this column in their
hiddenColumns list, so it appears visible. This migration adds the column to hiddenColumns
for all existing views to match the expected default behavior.
"""
import logging

from django.conf import settings
from django.db import migrations

from core.redis import start_job_async_or_sync
from core.utils.iterators import iterate_queryset

logger = logging.getLogger(__name__)
migration_name = __name__


def forward_migration_job(*, migration_name: str) -> None:
    """Async job: Hide the allow_skip column for all existing views."""
    from core.models import AsyncMigrationStatus
    from data_manager.models import View

    migration, created = AsyncMigrationStatus.objects.get_or_create(
        name=migration_name,
        defaults={'status': AsyncMigrationStatus.STATUS_STARTED},
    )
    if not created and migration.status == AsyncMigrationStatus.STATUS_FINISHED:
        logger.info(f'Migration {migration_name} already executed with status FINISHED')
        return
    if migration.status == AsyncMigrationStatus.STATUS_SCHEDULED:
        migration.status = AsyncMigrationStatus.STATUS_STARTED
        migration.save()

    try:
        views = iterate_queryset(View.objects.all())
        updated_count = 0

        for view in views:
            if view.data and 'hiddenColumns' in view.data:
                modified = False
                if 'explore' in view.data['hiddenColumns']:
                    if 'tasks:allow_skip' not in view.data['hiddenColumns']['explore']:
                        view.data['hiddenColumns']['explore'].append('tasks:allow_skip')
                        modified = True
                if 'labeling' in view.data['hiddenColumns']:
                    if 'tasks:allow_skip' not in view.data['hiddenColumns']['labeling']:
                        view.data['hiddenColumns']['labeling'].append('tasks:allow_skip')
                        modified = True

                if modified:
                    view.save(update_fields=['data'])
                    updated_count += 1

        logger.info(f'Migration {migration_name} complete: updated {updated_count} views')
        migration.status = AsyncMigrationStatus.STATUS_FINISHED
        migration.meta = {'updated_views': updated_count}
        migration.save()
    except Exception as e:
        logger.exception(f'Migration {migration_name} failed: {e}')
        migration.status = AsyncMigrationStatus.STATUS_ERROR
        if not migration.meta:
            migration.meta = {}
        migration.meta['error'] = str(e)
        migration.save()
        raise


def reverse_migration_job(*, migration_name: str) -> None:
    """Async job: Show the allow_skip column by removing it from hiddenColumns."""
    from data_manager.models import View

    logger.info(f'Starting reverse migration {migration_name}')

    views = iterate_queryset(View.objects.all())
    updated_count = 0

    for view in views:
        if view.data and 'hiddenColumns' in view.data:
            modified = False
            if 'explore' in view.data['hiddenColumns'] and 'tasks:allow_skip' in view.data['hiddenColumns']['explore']:
                view.data['hiddenColumns']['explore'].remove('tasks:allow_skip')
                modified = True
            if 'labeling' in view.data['hiddenColumns'] and 'tasks:allow_skip' in view.data['hiddenColumns']['labeling']:
                view.data['hiddenColumns']['labeling'].remove('tasks:allow_skip')
                modified = True

            if modified:
                view.save(update_fields=['data'])
                updated_count += 1

    logger.info(f'Reverse migration {migration_name} complete: updated {updated_count} views')


def forwards(apps, schema_editor):
    """Queue the forward migration job."""
    start_job_async_or_sync(
        forward_migration_job,
        migration_name=migration_name,
        queue_name=settings.SERVICE_QUEUE_NAME,
    )


def backwards(apps, schema_editor):
    """Queue the reverse migration job."""
    start_job_async_or_sync(
        reverse_migration_job,
        migration_name=migration_name,
        queue_name=settings.SERVICE_QUEUE_NAME,
    )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('data_manager', '0017_update_agreement_selected_to_nested_structure'),
        ('tasks', '0060_add_allow_skip_to_task'),
        ('core', '0001_initial'),  # For AsyncMigrationStatus model
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
