"""Backfill legacy `Prediction.model_version='undefined'` rows to NULL.

Older code paths (`data_import/api.py`, `tasks/serializers.py`) defaulted the
`model_version` field to the literal string `'undefined'` when an imported
prediction did not specify one. That created two distinct "no version"
representations (NULL and the string 'undefined') and caused the predictions
delete endpoint to fail. The application layer now uses NULL as the canonical
representation, and this migration normalizes existing rows.

The reverse migration is intentionally a no-op: we cannot tell migrated rows
apart from genuinely-NULL rows after the fact.
"""

from django.db import migrations


def backfill_undefined_to_null(apps, schema_editor):
    Prediction = apps.get_model('tasks', 'Prediction')
    Prediction.objects.filter(model_version='undefined').update(model_version=None)


class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0061_task_project_file_upload_idx_async'),
    ]
    operations = [
        migrations.RunPython(
            backfill_undefined_to_null,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
