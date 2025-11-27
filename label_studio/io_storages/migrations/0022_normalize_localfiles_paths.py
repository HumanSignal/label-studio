import os

from django.db import migrations


def _normalize_storage_path(raw_path):
    """Normalize storage path to canonical form (duplicated from models to avoid import)."""
    if raw_path is None:
        return None
    trimmed = raw_path.strip()
    if trimmed == '':
        return ''
    collapsed = trimmed.replace('\\', os.sep)
    return os.path.normpath(collapsed)


def normalize_paths(apps, schema_editor):
    for model_name in ('LocalFilesImportStorage', 'LocalFilesExportStorage'):
        storage_model = apps.get_model('io_storages', model_name)
        total = storage_model.objects.count()
        updated = 0

        for storage in storage_model.objects.all().iterator():
            normalized = _normalize_storage_path(storage.path)
            if normalized != storage.path:
                storage_model.objects.filter(pk=storage.pk).update(path=normalized)
                updated += 1

        print(f'Normalized {updated}/{total} {model_name} paths')


class Migration(migrations.Migration):
    dependencies = [
        ('io_storages', '0021_azureblobimportstorage_recursive_scan_and_more'),
    ]

    operations = [
        migrations.RunPython(normalize_paths, migrations.RunPython.noop),
    ]

