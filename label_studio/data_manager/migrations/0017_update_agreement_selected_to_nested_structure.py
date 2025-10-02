from django.db import migrations
from copy import deepcopy
from django.apps import apps as django_apps
from core.models import AsyncMigrationStatus
from core.redis import start_job_async_or_sync
import logging

migration_name = '0017_update_agreement_selected_to_nested_structure'

logger = logging.getLogger(__name__)


def forward_migration():
    migration, created = AsyncMigrationStatus.objects.get_or_create(
        name=migration_name,
        defaults={'status': AsyncMigrationStatus.STATUS_STARTED}
    )
    if not created:
        return  # already in progress or done

    # Look up models at runtime inside the worker process
    View = django_apps.get_model('data_manager', 'View')
    Annotation = django_apps.get_model('tasks', 'Annotation')

    # Cache unique annotators per project_id to avoid repetitive queries
    project_to_unique_annotators = {}

    # Iterate using values() to avoid loading full model instances
    # Fetch only the fields we need
    qs = View.objects.all().values('id', 'project_id', 'data')

    updated = 0
    for row in qs:
        view_id = row['id']
        project_id = row['project_id']
        data = row.get('data') or {}

        agreement = data.get('agreement_selected')
        if not isinstance(agreement, dict):
            continue

        # Handle both old flat structure and new nested structure
        existing_annotators = agreement.get('annotators', None)
        if existing_annotators is None:
            continue
        
        # Check if using old flat structure (list) or new nested structure (dict)
        if isinstance(existing_annotators, dict):
            # New structure: annotators = { all: bool, ids: [] }
            existing_annotator_ids = existing_annotators.get('ids', [])
        else:
            # Old structure: annotators = []
            existing_annotator_ids = existing_annotators

        # Compute unique annotators for this project (once per project)
        if project_id not in project_to_unique_annotators:
            unique_ids = set(
                Annotation.objects
                .filter(project_id=project_id, completed_by_id__isnull=False)
                .values_list('completed_by_id', flat=True)
                .distinct()
            )
            # Normalize to unique ints
            project_to_unique_annotators[project_id] = unique_ids

        new_annotators = project_to_unique_annotators[project_id]

        # If no change, skip update
        old_set = {int(a) for a in (existing_annotator_ids or [])}
        if new_annotators == old_set:
            continue

        new_data = deepcopy(data)
        # Always use the new nested structure
        new_data['agreement_selected']['annotators'] = {
            'all': isinstance(existing_annotators, dict) and existing_annotators.get('all', False),
            'ids': list(new_annotators)
        }

        # Update only the JSON field via update(); do not load model instance or call save()
        View.objects.filter(id=view_id).update(data=new_data)
        logger.info(f'Updated View {view_id} agreement selected annotators to {list(new_annotators)}')
        logger.info(f'Old annotator length: {len(old_set)}, new annotator length: {len(new_annotators)}')
        updated += 1

    if updated:
        logger.info(f'{migration_name} Updated {updated} View rows')
    
    migration.status = AsyncMigrationStatus.STATUS_FINISHED
    migration.save(update_fields=['status'])

def forwards(apps, schema_editor):
    start_job_async_or_sync(forward_migration, queue_name='low')


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



