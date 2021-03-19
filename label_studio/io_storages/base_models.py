"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import django_rq

from django.utils import timezone
from django.db import models, transaction
from django.utils.translation import gettext_lazy as _
from django_rq import job

from tasks.models import Task

from core.redis import redis_connected


logger = logging.getLogger(__name__)


class Storage(models.Model):
    title = models.CharField(
        _('title'), null=True, max_length=256,
        help_text='Cloud storage title')
    description = models.TextField(
        _('description'), null=True, blank=True,
        help_text='Cloud storage description')
    project = models.ForeignKey(
        'projects.Project', related_name='%(app_label)s_%(class)ss', on_delete=models.CASCADE)
    created_at = models.DateTimeField(
        _('created at'), auto_now_add=True,
        help_text='Creation time')
    last_sync = models.DateTimeField(
        _('last sync'), null=True, blank=True,
        help_text='Last sync finished time')
    last_sync_count = models.PositiveIntegerField(
        _('last sync count'), null=True, blank=True,
        help_text='Count of tasks synced last time')

    def validate_connection(self, client=None):
        pass

    class Meta:
        abstract = True


class ImportStorage(Storage):

    def iterkeys(self):
        return iter(())

    def get_data(self, key):
        raise NotImplementedError

    def resolve_uri(self, data):
        return

    def resolve_task_data_uri(self, task_data):
        out = {}
        for key, data in task_data.items():
            if not isinstance(data, str):
                out[key] = data
            resolved_uri = self.resolve_uri(data)
            if resolved_uri:
                out[key] = resolved_uri
            else:
                out[key] = data
        return out

    def _scan_and_create_links(self, link_class):
        tasks_created = 0
        for key in self.iterkeys():
            logger.debug(f'Scanning key {key}')
            if link_class.exists(key, self):
                logger.debug(f'{self.__class__.__name__} link {key} already exists')
                continue
            logger.debug(f'{self}: found new key {key}')
            data = self.get_data(key)
            with transaction.atomic():
                task = Task.objects.create(data=data, project=self.project)
                link_class.create(task, key, self)
                logger.debug(f'Create {self.__class__.__name__} link with key={key} for task={task}')
                tasks_created += 1

        self.last_sync = timezone.now()
        self.last_sync_count = tasks_created
        self.save()

    def scan_and_create_links(self):
        """This is proto method - you can override it, or just replace ImportStorageLink by your own model"""
        self._scan_and_create_links(ImportStorageLink)

    def sync(self):
        if redis_connected():
            queue = django_rq.get_queue('default')
            job = queue.enqueue(sync_background, self.__class__, self.id)
            # job_id = sync_background.delay()  # TODO: @niklub: check this fix
            logger.info(f'Storage sync background job {job.id} for storage {self} has been started')
        else:
            logger.info(f'Start syncing storage {self}')
            self.scan_and_create_links()

    class Meta:
        abstract = True


@job('default')
def sync_background(storage_class, storage_id):
    storage = storage_class.objects.get(id=storage_id)
    storage.scan_and_create_links()


class ExportStorage(Storage):

    def save_annotation(self, annotation):
        raise NotImplementedError

    class Meta:
        abstract = True


class ImportStorageLink(models.Model):

    task = models.OneToOneField('tasks.Task', on_delete=models.CASCADE, related_name='%(app_label)s_%(class)s')
    key = models.TextField(_('key'), null=False, help_text='External link key')
    object_exists = models.BooleanField(
        _('object exists'), help_text='Whether object under external link still exists', default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')

    @classmethod
    def exists(cls, key, storage):
        return cls.objects.filter(key=key, storage=storage.id).exists()

    @classmethod
    def create(cls, task, key, storage):
        link, created = cls.objects.get_or_create(task_id=task.id, key=key, storage=storage, object_exists=True)
        return link

    class Meta:
        abstract = True


class ExportStorageLink(models.Model):

    annotation = models.OneToOneField(
        'tasks.Annotation', on_delete=models.CASCADE, related_name='%(app_label)s_%(class)s')
    object_exists = models.BooleanField(
        _('object exists'), help_text='Whether object under external link still exists', default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')

    @property
    def key(self):
        return str(self.annotation.id)

    @classmethod
    def exists(cls, annotation, storage):
        return cls.objects.filter(annotation=annotation.id, storage=storage.id).exists()

    @classmethod
    def create(cls, annotation, storage):
        link, created = cls.objects.get_or_create(annotation=annotation, storage=storage, object_exists=True)
        return link

    class Meta:
        abstract = True
