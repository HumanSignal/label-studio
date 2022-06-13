import logging

from django.db.models import JSONField
from django.db import models

logger = logging.getLogger(__name__)


class AsyncMigrationStatus(models.Model):
    meta = JSONField('meta', null=True, default=dict,
                     help_text='Meta is for any params for migrations.'
                               'E.g. project, filter or error message.')
    project = models.ForeignKey(
        'projects.Project',
        related_name='asyncmigrationstatus',
        on_delete=models.CASCADE,
        null=True,
        help_text='Project ID for this migration')
    name = models.TextField(
        'migration_name', help_text='Migration name'
    )
    STATUS_CHOICES = (
        ("STARTED", 'Migration is started or queued.'),
        ("IN PROGRESS", 'Migration is in progress. Check meta for job_id or status.'),
        ("FINISHED", 'Migration completed successfully.'),
        ("ERROR", 'Migration completed with errors. Check meta for more info.'),
    )
    status = models.CharField(max_length=100, choices=STATUS_CHOICES, null=True, default=None)
