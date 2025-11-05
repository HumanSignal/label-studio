"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
from django.db import migrations

logger = logging.getLogger(__name__)


def update_storage(storage, db_alias=None):
    logger.info(f'=> Migration for {storage._meta.label} statuses started')
    manager = storage.objects.using(db_alias) if db_alias else storage.objects
    manager.update(status='initialized')
    instances = list(manager.all().only('id', 'meta', 'status', 'last_sync_count', 'project_id'))

    for instance in instances:
        prefix = f'Project ID={instance.project_id} {instance}'

        # import source storages
        if 'import' in storage._meta.label_lower:
            links_manager = instance.links.using(db_alias) if db_alias else instance.links
            count = links_manager.count() - instance.last_sync_count if instance.last_sync_count else 0
            instance.meta['tasks_existed'] = count if count > 0 else 0
            if instance.meta['tasks_existed'] and instance.meta['tasks_existed'] > 0:
                instance.status = 'completed'
            logger.info(f'{prefix} tasks_existed = {instance.meta["tasks_existed"]}')

        # target export storages
        else:
            instance.meta['total_annotations'] = instance.last_sync_count
            if instance.last_sync_count and instance.last_sync_count > 0:
                instance.status = 'completed'
            logger.info(f'{prefix} total_annotations = {instance.last_sync_count}')

    manager.bulk_update(instances, fields=['meta', 'status'], batch_size=100)
    logger.info(f'=> Migration for {storage._meta.label} statuses finished')


def forwards(apps, schema_editor):
    db_alias = schema_editor.connection.alias
    storages = [
        apps.get_model('io_storages', 'AzureBlobImportStorage'),
        apps.get_model('io_storages', 'AzureBlobExportStorage'),
        apps.get_model('io_storages', 'GCSImportStorage'),
        apps.get_model('io_storages', 'GCSExportStorage'),
        apps.get_model('io_storages', 'LocalFilesImportStorage'),
        apps.get_model('io_storages', 'LocalFilesExportStorage'),
        apps.get_model('io_storages', 'RedisImportStorage'),
        apps.get_model('io_storages', 'RedisExportStorage'),
        apps.get_model('io_storages', 'S3ImportStorage'),
        apps.get_model('io_storages', 'S3ExportStorage'),
    ]

    for storage in storages:
        update_storage(storage, db_alias)


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('io_storages', '0013_auto_20230420_0259'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
