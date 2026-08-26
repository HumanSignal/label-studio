"""Add NOT VALID FK constraint for data_manager_view.locked_by_id."""

from django.db import migrations

LOCKED_BY_FK_CONSTRAINT = 'data_manager_view_locked_by_id_fk_htx_user'


def add_locked_by_fk_constraint(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    schema_editor.execute(
        f"""
        ALTER TABLE data_manager_view
        ADD CONSTRAINT {LOCKED_BY_FK_CONSTRAINT}
        FOREIGN KEY (locked_by_id) REFERENCES htx_user(id)
        NOT VALID;
        """
    )


def drop_locked_by_fk_constraint(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    schema_editor.execute(
        f"""
        ALTER TABLE data_manager_view
        DROP CONSTRAINT IF EXISTS {LOCKED_BY_FK_CONSTRAINT};
        """
    )


class Migration(migrations.Migration):
    dependencies = [
        ('data_manager', '0019_view_lock_fields'),
    ]

    operations = [
        migrations.RunPython(add_locked_by_fk_constraint, drop_locked_by_fk_constraint),
    ]
