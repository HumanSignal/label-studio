from django.db import migrations


def normalize_paths(apps, schema_editor):
    from io_storages.localfiles.models import normalize_storage_path

    storages = (
        ('LocalFilesImportStorage', 'import'),
        ('LocalFilesExportStorage', 'export'),
    )

    for model_name, label in storages:
        Model = apps.get_model('io_storages', model_name)
        total = Model.objects.count()
        updated = 0

        for storage in Model.objects.all().iterator():
            normalized = normalize_storage_path(storage.path)
            if normalized != storage.path:
                Model.objects.filter(pk=storage.pk).update(path=normalized)
                updated += 1

        print(f'Normalized {updated}/{total} {label} storage paths')


class Migration(migrations.Migration):
    dependencies = [
        ('io_storages', '0021_azureblobimportstorage_recursive_scan_and_more'),
    ]

    operations = [
        migrations.RunPython(normalize_paths, migrations.RunPython.noop),
    ]

