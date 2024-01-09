import logging

from django.db import models
from django.db.models import JSONField
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


class AsyncMigrationStatus(models.Model):
    meta = JSONField(
        'meta',
        null=True,
        default=dict,
        help_text='Meta is for any params for migrations, e.g.: project, filter or error message.',
    )

    project = models.ForeignKey(
        'projects.Project',
        related_name='asyncmigrationstatus',
        on_delete=models.CASCADE,
        null=True,
        help_text='Project ID for this migration',
    )

    name = models.TextField('migration_name', help_text='Migration name')

    STATUS_STARTED = 'STARTED'
    STATUS_IN_PROGRESS = 'IN PROGRESS'
    STATUS_FINISHED = 'FINISHED'
    STATUS_ERROR = 'ERROR'
    STATUS_CHOICES = (
        (STATUS_STARTED, 'Migration is started or queued.'),
        (STATUS_IN_PROGRESS, 'Migration is in progress. Check meta for job_id or status.'),
        (STATUS_FINISHED, 'Migration completed successfully.'),
        (STATUS_ERROR, 'Migration completed with errors. Check meta for more info.'),
    )
    status = models.CharField(max_length=100, choices=STATUS_CHOICES, null=True, default=None)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, help_text='Last updated time')

    def __str__(self):
        return f'(id={self.id}) ' + self.name + (' at project ' + str(self.project) if self.project else '')
