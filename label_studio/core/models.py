import json
import logging

from django.core import serializers
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

    STATUS_SCHEDULED = 'SCHEDULED'
    STATUS_STARTED = 'STARTED'
    STATUS_IN_PROGRESS = 'IN PROGRESS'
    STATUS_FINISHED = 'FINISHED'
    STATUS_ERROR = 'ERROR'
    STATUS_CHOICES = (
        (STATUS_SCHEDULED, 'Migration is scheduled but not yet started.'),
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


class DeletedRow(models.Model):
    """
    Model to store deleted rows of other models.
    Useful for using as backup for deleted rows, in case we need to restore them.
    """

    model = models.CharField(max_length=1024)   # tasks.task, projects.project, etc.
    row_id = models.IntegerField(null=True)   # primary key of the deleted row. task.id, project.id, etc.
    data = JSONField(null=True, blank=True)   # serialized json of the deleted row.
    reason = models.TextField(null=True, blank=True)   # reason for deletion.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # optional fields for searching purposes
    organization_id = models.IntegerField(null=True, blank=True)
    project_id = models.IntegerField(null=True, blank=True)
    user_id = models.IntegerField(null=True, blank=True)

    @classmethod
    def serialize_and_create(cls, model, **kwargs) -> 'DeletedRow':
        data = json.loads(serializers.serialize('json', [model]))[0]
        model = data['model']
        row_id = int(data['pk'])
        return cls.objects.create(model=model, row_id=row_id, data=data, **kwargs)

    @classmethod
    def bulk_serialize_and_create(cls, queryset, **kwargs) -> list['DeletedRow']:
        serialized_data = json.loads(serializers.serialize('json', queryset))
        bulk_objects = []
        for data in serialized_data:
            model = data['model']
            row_id = int(data['pk'])
            bulk_objects.append(cls(model=model, row_id=row_id, data=data, **kwargs))
        return cls.objects.bulk_create(bulk_objects)
