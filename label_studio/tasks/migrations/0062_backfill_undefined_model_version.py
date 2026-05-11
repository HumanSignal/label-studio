"""Backfill legacy `Prediction.model_version='undefined'` rows to NULL.

Older code paths (`data_import/api.py`, `tasks/serializers.py`) defaulted the
`model_version` field to the literal string `'undefined'` when an imported
prediction did not specify one. That created two distinct "no version"
representations (NULL and the string 'undefined') and caused the predictions
delete endpoint to fail. The application layer now uses NULL as the canonical
representation, and this migration normalizes existing rows.

Runs in batches of BATCH_SIZE rows so the UPDATE does not hold table-wide
locks for the entire duration on installations with a large Prediction table.
The reverse migration is intentionally a no-op: we cannot tell migrated rows
apart from genuinely-NULL rows after the fact.
"""

from django.db import migrations

BATCH_SIZE = 1000


def backfill_undefined_to_null(apps, schema_editor):
    Prediction = apps.get_model('tasks', 'Prediction')
    while True:
        ids = list(
            Prediction.objects.filter(model_version='undefined')
            .values_list('id', flat=True)[:BATCH_SIZE]
        )
        if not ids:
            return
        Prediction.objects.filter(id__in=ids).update(model_version=None)


class Migration(migrations.Migration):
    # Each batch commits independently so a single long transaction does not
    # block other writes for the duration of the migration.
    atomic = False

    dependencies = [
        ('tasks', '0061_task_project_file_upload_idx_async'),
    ]
    operations = [
        migrations.RunPython(
            backfill_undefined_to_null,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
