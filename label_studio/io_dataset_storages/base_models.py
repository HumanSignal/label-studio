"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
from django.db import models
from django.utils.translation import gettext_lazy as _
from django_rq import job
from io_storages.base_models import ImportStorage

logger = logging.getLogger(__name__)


class DatasetStorage(ImportStorage):

    def _scan_and_create_links_v2(self):
        # Async job execution for batch of objects:
        # e.g. GCS example
        # | "ReadFile" >> beam.Map(GCS.read_file)
        # | "AddObject" >> label_studio_semantic_search.indexer.add_objects
        # or for task creation last step would be
        # | "AddObject" >> DatasetStorage.add_task
        raise NotImplementedError

    class Meta:
        abstract = True


@job('low')
def sync_background(storage_class, storage_id, **kwargs):
    storage = storage_class.objects.get(id=storage_id)
    storage.scan_and_create_links_v2()


class DatasetStorageLink(models.Model):

    task = models.OneToOneField('tasks.Task', on_delete=models.CASCADE, related_name='%(app_label)s_%(class)s')
    key = models.TextField(_('key'), null=False, help_text='External link key')
    object_exists = models.BooleanField(
        _('object exists'), help_text='Whether object under external link still exists', default=True
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')

    @classmethod
    def exists(cls, key, storage):
        return cls.objects.filter(key=key, storage=storage.id).exists()

    @classmethod
    def create(cls, task, key, storage):
        link, created = cls.objects.get_or_create(task_id=task.id, key=key, storage=storage, object_exists=True)
        return link

    def has_permission(self, user):
        user.project = self.task.project  # link for activity log
        if self.task.has_permission(user):
            return True
        return False

    class Meta:
        abstract = True
