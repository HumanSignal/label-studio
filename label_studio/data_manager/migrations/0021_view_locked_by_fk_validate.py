"""Validate data_manager_view.locked_by_id FK constraint."""

from django.db import migrations

LOCKED_BY_FK_CONSTRAINT = 'data_manager_view_locked_by_id_fk_htx_user'


def validate_locked_by_fk_constraint(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    schema_editor.execute(
        f"""
        ALTER TABLE data_manager_view
        VALIDATE CONSTRAINT {LOCKED_BY_FK_CONSTRAINT};
        """
    )


class Migration(migrations.Migration):
    dependencies = [
        ('data_manager', '0020_view_locked_by_fk_not_valid'),
    ]

    operations = [
        migrations.RunPython(validate_locked_by_fk_constraint, migrations.RunPython.noop),
    ]
