"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import django_rq
import json

from django.utils import timezone
from django.db import models, transaction
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django_rq import job

from core.feature_flags import flag_set
from tasks.models import Task, Annotation
from tasks.serializers import PredictionSerializer, AnnotationSerializer
from data_export.serializers import ExportDataSerializer

from core.redis import is_job_in_queue, redis_connected, is_job_on_worker
from core.utils.common import load_func
from core.utils.params import get_bool_env
from label_studio_tools.core.utils.params import get_bool_env

from io_storages.utils import get_uri_via_regex
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class Storage(models.Model):
    url_scheme = ''

    title = models.CharField(_('title'), null=True, blank=True, max_length=256, help_text='Cloud storage title')
    description = models.TextField(_('description'), null=True, blank=True, help_text='Cloud storage description')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')
    last_sync = models.DateTimeField(_('last sync'), null=True, blank=True, help_text='Last sync finished time')
    last_sync_count = models.PositiveIntegerField(
        _('last sync count'), null=True, blank=True, help_text='Count of tasks synced last time'
    )

    last_sync_job = models.CharField(_('last_sync_job'), null=True, blank=True, max_length=256, help_text='Last sync job ID')

    def validate_connection(self, client=None):
        pass

    def has_permission(self, user):
        user.project = self.project  # link for activity log
        if self.project.has_permission(user):
            return True
        return False

    class Meta:
        abstract = True


class ImportStorage(Storage):
    def iterkeys(self):
        return iter(())

    def get_data(self, key):
        raise NotImplementedError

    def generate_http_url(self, url):
        raise NotImplementedError

    def can_resolve_url(self, url):
        # TODO: later check to the full prefix like "url.startswith(self.path_full)"
        # Search of occurrences inside string, e.g. for cases like "gs://bucket/file.pdf" or "<embed src='gs://bucket/file.pdf'/>"  # noqa
        _, prefix = get_uri_via_regex(url, prefixes=(self.url_scheme,))
        if prefix == self.url_scheme:
            return True
        # if not found any occurrences - this Storage can't resolve url
        return False

    def resolve_uri(self, uri):
        #  list of objects
        if isinstance(uri, list):
            resolved = []
            for item in uri:
                result = self.resolve_uri(item)
                resolved.append(result if result else item)
            return resolved

        # dict of objects
        elif isinstance(uri, dict):
            resolved = {}
            for key in uri.keys():
                result = self.resolve_uri(uri[key])
                resolved[key] = result if result else uri[key]
            return resolved

        # string: process one url
        elif isinstance(uri, str):
            try:
                # extract uri first from task data
                extracted_uri, extracted_storage = get_uri_via_regex(uri, prefixes=(self.url_scheme,))
                if not extracted_storage:
                    logger.debug(f'No storage info found for URI={uri}')
                    return
                # resolve uri to url using storages
                http_url = self.generate_http_url(extracted_uri)
                return uri.replace(extracted_uri, http_url)
            except Exception as exc:
                logger.info(f'Can\'t resolve URI={uri}', exc_info=True)

    def _scan_and_create_links_v2(self):
        # Async job execution for batch of objects:
        # e.g. GCS example
        # | "GetKey" >>  --> read file content into label_studio_semantic_search.indexer.RawDataObject repr
        # | "AggregateBatch" >> beam.Combine      --> combine read objects into a batch
        # | "AddObjects" >> label_studio_semantic_search.indexer.add_objects_from_bucket --> add objects from batch to Vector DB
        # or for project task creation last step would be
        # | "AddObject" >> ImportStorage.add_task

        raise NotImplementedError

    @classmethod
    def add_task(cls, data, project, maximum_annotations, max_inner_id, storage, key, link_class):
        # predictions
        predictions = data.get('predictions', [])
        if predictions:
            if 'data' not in data:
                raise ValueError(
                    'If you use "predictions" field in the task, ' 'you must put "data" field in the task too'
                )

        # annotations
        annotations = data.get('annotations', [])
        cancelled_annotations = 0
        if annotations:
            if 'data' not in data:
                raise ValueError(
                    'If you use "annotations" field in the task, ' 'you must put "data" field in the task too'
                )
            cancelled_annotations = len([a for a in annotations if a.get('was_cancelled', False)])

        if 'data' in data and isinstance(data['data'], dict):
            data = data['data']

        with transaction.atomic():
            task = Task.objects.create(
                data=data, project=project, overlap=maximum_annotations,
                is_labeled=len(annotations) >= maximum_annotations, total_predictions=len(predictions),
                total_annotations=len(annotations) - cancelled_annotations,
                cancelled_annotations=cancelled_annotations, inner_id=max_inner_id
            )

            link_class.create(task, key, storage)
            logger.debug(f'Create {storage.__class__.__name__} link with key={key} for task={task}')

            raise_exception = not flag_set('ff_fix_back_dev_3342_storage_scan_with_invalid_annotations',
                                           user=AnonymousUser())

            # add predictions
            logger.debug(f'Create {len(predictions)} predictions for task={task}')
            for prediction in predictions:
                prediction['task'] = task.id
            prediction_ser = PredictionSerializer(data=predictions, many=True)
            if prediction_ser.is_valid(raise_exception=raise_exception):
                prediction_ser.save()

            # add annotations
            logger.debug(f'Create {len(annotations)} annotations for task={task}')
            for annotation in annotations:
                annotation['task'] = task.id
            annotation_ser = AnnotationSerializer(data=annotations, many=True)
            if annotation_ser.is_valid(raise_exception=raise_exception):
                annotation_ser.save()
            # FIXME: add_annotation_history / post_process_annotations should be here

    def _scan_and_create_links(self, link_class):
        """
        TODO: deprecate this function and transform it to "pipeline" version  _scan_and_create_links_v2
        """
        tasks_created = 0
        maximum_annotations = self.project.maximum_annotations
        task = self.project.tasks.order_by('-inner_id').first()
        max_inner_id = (task.inner_id + 1) if task else 1

        for key in self.iterkeys():
            # w/o Dataflow
            # pubsub.push(topic, key)
            # -> GF.pull(topic, key) + env -> add_task()

            logger.debug(f'Scanning key {key}')

            # skip if task already exists
            if link_class.exists(key, self):
                logger.debug(f'{self.__class__.__name__} link {key} already exists')
                continue

            logger.debug(f'{self}: found new key {key}')
            try:
                data = self.get_data(key)
            except (UnicodeDecodeError, json.decoder.JSONDecodeError) as exc:
                logger.debug(exc, exc_info=True)
                raise ValueError(
                    f'Error loading JSON from file "{key}".\nIf you\'re trying to import non-JSON data '
                    f'(images, audio, text, etc.), edit storage settings and enable '
                    f'"Treat every bucket object as a source file"'
                )

            self.add_task(data, self.project, maximum_annotations, max_inner_id, self, key, link_class)
            max_inner_id += 1
            tasks_created += 1

        self.last_sync = timezone.now()
        self.last_sync_count = tasks_created
        self.save()

        self.project.update_tasks_states(
                maximum_annotations_changed=False,
                overlap_cohort_percentage_changed=False,
                tasks_number_changed=True
            )

    def scan_and_create_links(self):
        """This is proto method - you can override it, or just replace ImportStorageLink by your own model"""
        self._scan_and_create_links(ImportStorageLink)

    def sync(self):
        if redis_connected():
            queue = django_rq.get_queue('low')
            meta = {'project': self.project.id, 'storage': self.id}
            if not is_job_in_queue(queue, "sync_background", meta=meta) and \
                    not is_job_on_worker(job_id=self.last_sync_job, queue_name='default'):
                job = queue.enqueue(sync_background, self.__class__, self.id,
                                    meta=meta)
                self.last_sync_job = job.id
                self.save()
                # job_id = sync_background.delay()  # TODO: @niklub: check this fix
                logger.info(f'Storage sync background job {job.id} for storage {self} has been started')
        else:
            logger.info(f'Start syncing storage {self}')
            self.scan_and_create_links()

    class Meta:
        abstract = True


class ProjectStorageMixin(models.Model):
    project = models.ForeignKey(
        'projects.Project',
        related_name='%(app_label)s_%(class)ss',
        on_delete=models.CASCADE,
        help_text='A unique integer value identifying this project.'
    )

    def has_permission(self, user):
        user.project = self.project  # link for activity log
        if self.project.has_permission(user):
            return True
        return False

    class Meta:
        abstract = True


@job('low')
def sync_background(storage_class, storage_id, **kwargs):
    storage = storage_class.objects.get(id=storage_id)
    storage.scan_and_create_links()


class ExportStorage(Storage, ProjectStorageMixin):
    can_delete_objects = models.BooleanField(_('can_delete_objects'), null=True, blank=True, help_text='Deletion from storage enabled')

    def _get_serialized_data(self, annotation):
        if settings.FUTURE_SAVE_TASK_TO_STORAGE:
            # export task with annotations
            return ExportDataSerializer(annotation.task).data
        else:
            serializer_class = load_func(settings.STORAGE_ANNOTATION_SERIALIZER)
            # deprecated functionality - save only annotation
            return serializer_class(annotation).data

    def save_annotation(self, annotation):
        raise NotImplementedError

    def save_all_annotations(self):
        annotation_exported = 0
        for annotation in Annotation.objects.filter(project=self.project):
            self.save_annotation(annotation)
            annotation_exported += 1

        self.last_sync = timezone.now()
        self.last_sync_count = annotation_exported
        self.save()

    def sync(self):
        if redis_connected():
            queue = django_rq.get_queue('low')
            job = queue.enqueue(export_sync_background, self.__class__, self.id, job_timeout=settings.RQ_LONG_JOB_TIMEOUT)
            logger.info(f'Storage sync background job {job.id} for storage {self} has been started')
        else:
            logger.info(f'Start syncing storage {self}')
            self.save_all_annotations()

    class Meta:
        abstract = True


@job('low', timeout=settings.RQ_LONG_JOB_TIMEOUT)
def export_sync_background(storage_class, storage_id):
    storage = storage_class.objects.get(id=storage_id)
    storage.save_all_annotations()


class ImportStorageLink(models.Model):

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

    class Meta:
        abstract = True


class ExportStorageLink(models.Model):

    annotation = models.OneToOneField(
        'tasks.Annotation', on_delete=models.CASCADE, related_name='%(app_label)s_%(class)s'
    )
    object_exists = models.BooleanField(
        _('object exists'), help_text='Whether object under external link still exists', default=True
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, help_text='Update time')

    @staticmethod
    def get_key(annotation):
        if settings.FUTURE_SAVE_TASK_TO_STORAGE:
            return str(annotation.task.id) + '.json' if settings.FUTURE_SAVE_TASK_TO_STORAGE_JSON_EXT else ''
        return str(annotation.id)

    @property
    def key(self):
        return self.get_key(self.annotation)

    @classmethod
    def exists(cls, annotation, storage):
        return cls.objects.filter(annotation=annotation.id, storage=storage.id).exists()

    @classmethod
    def create(cls, annotation, storage):
        link, created = cls.objects.get_or_create(annotation=annotation, storage=storage, object_exists=True)
        if not created:
            # update updated_at field
            link.save()
        return link

    def has_permission(self, user):
        user.project = self.annotation.project  # link for activity log
        if self.annotation.has_permission(user):
            return True
        return False

    class Meta:
        abstract = True
