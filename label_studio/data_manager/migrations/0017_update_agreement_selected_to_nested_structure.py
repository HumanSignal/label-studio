from django.db import migrations
from copy import deepcopy
from django.apps import apps as django_apps
from django.conf import settings
from core.models import AsyncMigrationStatus
from core.redis import start_job_async_or_sync
from core.utils.iterators import iterate_queryset
import logging

migration_name = '0017_update_agreement_selected_to_nested_structure'

logger = logging.getLogger(__name__)


def forward_migration(db_alias):
    """
    Migrates views that have agreement_selected populated to the new structure

    Old structure:
        'agreement_selected': {
            'annotators': List[int]
            'models': List[str]
            'ground_truth': bool
        }

    New structure:
        'agreement_selected': {
            'annotators': {
                'all': bool
                'ids': List[int]
            },
            'models': {
                'all': bool
                'ids': List[str]
            },
            'ground_truth': bool
        }
    """
    migration, created = AsyncMigrationStatus.objects.using(db_alias).get_or_create(
        name=migration_name,
        defaults={'status': AsyncMigrationStatus.STATUS_STARTED}
    )
    if not created:
        return  # already in progress or done

    # Look up models at runtime inside the worker process
    View = django_apps.get_model('data_manager', 'View')

    # Iterate using values() to avoid loading full model instances
    # Fetch only the fields we need, filtering to views that have 'agreement_selected' in data
    qs = (
        View.objects.using(db_alias)
        .filter(data__has_key='agreement_selected')
        .filter(data__agreement_selected__isnull=False)
        .values('id', 'data')
    )

    updated = 0
    for row in qs:
        view_id = row['id']
        data = row.get('data') or {}

        new_data = deepcopy(data)
        # Always use the new nested structure
        new_data['agreement_selected'] = {
            'annotators': {'all': True, 'ids': []},
            'models': {'all': True, 'ids': []},
            'ground_truth': False
        }

        # Update only the JSON field via update(); do not load model instance or call save()
        View.objects.using(db_alias).filter(id=view_id).update(data=new_data)
        logger.info(f'Updated View {view_id} agreement selected to default all annotators + all models')
        updated += 1

    if updated:
        logger.info(f'{migration_name} Updated {updated} View rows')
    
    migration.status = AsyncMigrationStatus.STATUS_FINISHED
    migration.save(update_fields=['status'], using=db_alias)

def forwards(apps, schema_editor):
    db_alias = schema_editor.connection.alias
    start_job_async_or_sync(forward_migration, db_alias=db_alias, queue_name=settings.SERVICE_QUEUE_NAME)


def backwards(apps, schema_editor):
    # Irreversible: we cannot reconstruct the previous annotator lists safely
    pass


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('data_manager', '0016_migrate_agreement_selected_annotators_to_unique')
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]


