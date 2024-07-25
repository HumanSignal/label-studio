"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import base64
import json
import logging
import traceback as tb
from datetime import datetime
from urllib.parse import urljoin

import django_rq
import rq
import rq.exceptions
from core.feature_flags import flag_set
from core.redis import is_job_in_queue, is_job_on_worker, redis_connected
from core.utils.common import load_func
from data_export.serializers import ExportDataSerializer
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.db import models, transaction
from django.db.models import JSONField
from django.shortcuts import reverse
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django_rq import job
from io_storages.utils import get_uri_via_regex
from rq.job import Job
from tasks.models import Annotation, Task
from tasks.serializers import AnnotationSerializer, PredictionSerializer
from webhooks.models import WebhookAction
from webhooks.utils import emit_webhooks_for_instance

logger = logging.getLogger(__name__)


class StorageInfo(models.Model):
    """
    StorageInfo helps to understand storage status and progress
    that happens in background jobs
    """

    class Status(models.TextChoices):
        INITIALIZED = 'initialized', _('Initialized')
        QUEUED = 'queued', _('Queued')
        IN_PROGRESS = 'in_progress', _('In progress')
        FAILED = 'failed', _('Failed')
        COMPLETED = 'completed', _('Completed')

    class Meta:
        abstract = True

    last_sync = models.DateTimeField(_('last sync'), null=True, blank=True, help_text='Last sync finished time')
    last_sync_count = models.PositiveIntegerField(
        _('last sync count'), null=True, blank=True, help_text='Count of tasks synced last time'
    )
    last_sync_job = models.CharField(
        _('last_sync_job'), null=True, blank=True, max_length=256, help_text='Last sync job ID'
    )

    status = models.CharField(
        max_length=64,
        choices=Status.choices,
        default=Status.INITIALIZED,
    )
    traceback = models.TextField(null=True, blank=True, help_text='Traceback report for the last failed sync')
    meta = JSONField('meta', null=True, default=dict, help_text='Meta and debug information about storage processes')

    def info_set_job(self, job_id):
        self.last_sync_job = job_id
        self.save(update_fields=['last_sync_job'])

    def info_set_queued(self):
        self.last_sync = None
        self.last_sync_count = None
        self.last_sync_job = None
        self.status = self.Status.QUEUED

        # reset and init meta
        self.meta = {'attempts': self.meta.get('attempts', 0) + 1, 'time_queued': str(timezone.now())}

        self.save(update_fields=['last_sync_job', 'last_sync', 'last_sync_count', 'status', 'meta'])

    def info_set_in_progress(self):
        # only QUEUED => IN_PROGRESS transition is possible, because in QUEUED we reset states
        if self.status != self.Status.QUEUED:
            raise ValueError(f'Storage status ({self.status}) must be QUEUED to move it IN_PROGRESS')
        self.status = self.Status.IN_PROGRESS

        dt = timezone.now()
        self.meta['time_in_progress'] = str(dt)
        # at the very beginning it's the same as in progress time
        self.meta['time_last_ping'] = str(dt)
        self.save(update_fields=['status', 'meta'])

    @property
    def time_in_progress(self):
        if 'time_failure' not in self.meta:
            return datetime.fromisoformat(self.meta['time_in_progress'])
        else:
            return datetime.fromisoformat(self.meta['time_failure'])

    def info_set_completed(self, last_sync_count, **kwargs):
        self.status = self.Status.COMPLETED
        self.last_sync = timezone.now()
        self.last_sync_count = last_sync_count

        time_completed = timezone.now()

        self.meta['time_completed'] = str(time_completed)
        self.meta['duration'] = (time_completed - self.time_in_progress).total_seconds()
        self.meta.update(kwargs)
        self.save(update_fields=['status', 'meta', 'last_sync', 'last_sync_count'])

    def info_set_failed(self):
        self.status = self.Status.FAILED
        self.traceback = str(tb.format_exc())

        time_failure = timezone.now()

        self.meta['time_failure'] = str(time_failure)
        self.meta['duration'] = (time_failure - self.time_in_progress).total_seconds()
        self.save(update_fields=['status', 'traceback', 'meta'])

    def info_update_progress(self, last_sync_count, **kwargs):
        # update db counter once per 5 seconds to avid db overloads
        now = timezone.now()
        last_ping = datetime.fromisoformat(self.meta['time_last_ping'])
        delta = (now - last_ping).total_seconds()

        if delta > settings.STORAGE_IN_PROGRESS_TIMER:
            self.last_sync_count = last_sync_count
            self.meta['time_last_ping'] = str(now)
            self.meta['duration'] = (now - self.time_in_progress).total_seconds()
            self.meta.update(kwargs)
            self.save(update_fields=['last_sync_count', 'meta'])

    @staticmethod
    def ensure_storage_statuses(storages):
        """Check failed jobs and set storage status as failed if job is failed

        :param storages: Import or Export storages
        """
        # iterate over all storages
        storages = storages.only('id', 'last_sync_job', 'status', 'meta')
        for storage in storages:
            storage.health_check()

    def health_check(self):
        # get duration between last ping time and now
        now = timezone.now()
        last_ping = datetime.fromisoformat(self.meta.get('time_last_ping', str(now)))
        delta = (now - last_ping).total_seconds()

        # check redis connection
        if redis_connected():
            self.job_health_check()

        # in progress last ping time, job is not needed here
        if self.status == self.Status.IN_PROGRESS and delta > settings.STORAGE_IN_PROGRESS_TIMER * 5:
            self.status = self.Status.FAILED
            self.traceback = (
                'It appears the job was failed because the last ping time is too old, '
                'and no traceback information is available.\n'
                'This typically occurs if job was manually removed '
                'or workers reloaded unexpectedly.'
            )
            self.save(update_fields=['status', 'traceback'])
            logger.info(
                f'Storage {self} status moved to `failed` '
                f'because the job {self.last_sync_job} has too old ping time'
            )

    def job_health_check(self):
        Status = self.Status
        if self.status not in [Status.IN_PROGRESS, Status.QUEUED]:
            return

        queue = django_rq.get_queue('low')
        try:
            sync_job = Job.fetch(self.last_sync_job, connection=queue.connection)
            job_status = sync_job.get_status()
        except rq.exceptions.NoSuchJobError:
            job_status = 'not found'

        # broken synchronization between storage and job
        # this might happen when job was stopped because of OOM and on_failure wasn't called
        if job_status == 'failed':
            self.status = Status.FAILED
            self.traceback = (
                'It appears the job was terminated unexpectedly, '
                'and no traceback information is available.\n'
                'This typically occurs due to an out-of-memory (OOM) error.'
            )
            self.save(update_fields=['status', 'traceback'])
            logger.info(f'Storage {self} status moved to `failed` ' f'because of the failed job {self.last_sync_job}')

        # job is not found in redis (maybe deleted while redeploy), storage status is still active
        elif job_status == 'not found':
            self.status = Status.FAILED
            self.traceback = (
                'It appears the job was not found in redis, '
                'and no traceback information is available.\n'
                'This typically occurs if job was manually removed '
                'or workers reloaded unexpectedly.'
            )
            self.save(update_fields=['status', 'traceback'])
            logger.info(
                f'Storage {self} status moved to `failed` ' f'because the job {self.last_sync_job} was not found'
            )


class Storage(StorageInfo):
    url_scheme = ''

    title = models.CharField(_('title'), null=True, blank=True, max_length=256, help_text='Cloud storage title')
    description = models.TextField(_('description'), null=True, blank=True, help_text='Cloud storage description')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')

    synchronizable = models.BooleanField(_('synchronizable'), default=True, help_text='If storage can be synced')

    def validate_connection(self, client=None):
        raise NotImplementedError('validate_connection is not implemented')

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
        # Search of occurrences inside string, e.g. for cases like "gs://bucket/file.pdf" or "<embed src='gs://bucket/file.pdf'/>"
        _, prefix = get_uri_via_regex(url, prefixes=(self.url_scheme,))
        if prefix == self.url_scheme:
            return True
        # if not found any occurrences - this Storage can't resolve url
        return False

    def resolve_uri(self, uri, task=None):
        #  list of objects
        if isinstance(uri, list):
            resolved = []
            for item in uri:
                result = self.resolve_uri(item, task)
                resolved.append(result if result else item)
            return resolved

        # dict of objects
        elif isinstance(uri, dict):
            resolved = {}
            for key in uri.keys():
                result = self.resolve_uri(uri[key], task)
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

                if self.presign and task is not None:
                    proxy_url = urljoin(
                        settings.HOSTNAME,
                        reverse('data_import:task-storage-data-presign', kwargs={'task_id': task.id})
                        + f'?fileuri={base64.urlsafe_b64encode(extracted_uri.encode()).decode()}',
                    )
                    return uri.replace(extracted_uri, proxy_url)
                else:
                    # resolve uri to url using storages
                    http_url = self.generate_http_url(extracted_uri)

                return uri.replace(extracted_uri, http_url)
            except Exception:
                logger.info(f"Can't resolve URI={uri}", exc_info=True)

    def _scan_and_create_links_v2(self):
        # Async job execution for batch of objects:
        # e.g. GCS example
        # | "GetKey" >>  --> read file content into label_studio_semantic_search.indexer.RawDataObject repr
        # | "AggregateBatch" >> beam.Combine      --> combine read objects into a batch
        # | "AddObjects" >> label_studio_semantic_search.indexer.add_objects_from_bucket
        # --> add objects from batch to Vector DB
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
                data=data,
                project=project,
                overlap=maximum_annotations,
                is_labeled=len(annotations) >= maximum_annotations,
                total_predictions=len(predictions),
                total_annotations=len(annotations) - cancelled_annotations,
                cancelled_annotations=cancelled_annotations,
                inner_id=max_inner_id,
            )

            link_class.create(task, key, storage)
            logger.debug(f'Create {storage.__class__.__name__} link with key={key} for task={task}')

            raise_exception = not flag_set(
                'ff_fix_back_dev_3342_storage_scan_with_invalid_annotations', user=AnonymousUser()
            )

            # add predictions
            logger.debug(f'Create {len(predictions)} predictions for task={task}')
            for prediction in predictions:
                prediction['task'] = task.id
                prediction['project'] = project.id
            prediction_ser = PredictionSerializer(data=predictions, many=True)
            if prediction_ser.is_valid(raise_exception=raise_exception):
                prediction_ser.save()

            # add annotations
            logger.debug(f'Create {len(annotations)} annotations for task={task}')
            for annotation in annotations:
                annotation['task'] = task.id
                annotation['project'] = project.id
            annotation_ser = AnnotationSerializer(data=annotations, many=True)
            if annotation_ser.is_valid(raise_exception=raise_exception):
                annotation_ser.save()
        return task
        # FIXME: add_annotation_history / post_process_annotations should be here

    def _scan_and_create_links(self, link_class):
        """
        TODO: deprecate this function and transform it to "pipeline" version  _scan_and_create_links_v2,
        TODO: it must be compatible with opensource, so old version is needed as well
        """
        # set in progress status for storage info
        self.info_set_in_progress()

        tasks_existed = tasks_created = 0
        maximum_annotations = self.project.maximum_annotations
        task = self.project.tasks.order_by('-inner_id').first()
        max_inner_id = (task.inner_id + 1) if task else 1

        tasks_for_webhook = []
        for key in self.iterkeys():
            # w/o Dataflow
            # pubsub.push(topic, key)
            # -> GF.pull(topic, key) + env -> add_task()
            logger.debug(f'Scanning key {key}')
            self.info_update_progress(last_sync_count=tasks_created, tasks_existed=tasks_existed)

            # skip if task already exists
            if link_class.exists(key, self):
                logger.debug(f'{self.__class__.__name__} link {key} already exists')
                tasks_existed += 1  # update progress counter
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

            task = self.add_task(data, self.project, maximum_annotations, max_inner_id, self, key, link_class)
            max_inner_id += 1

            # update progress counters for storage info
            tasks_created += 1

            # add task to webhook list
            tasks_for_webhook.append(task)

            # settings.WEBHOOK_BATCH_SIZE
            # `WEBHOOK_BATCH_SIZE` sets the maximum number of tasks sent in a single webhook call, ensuring manageable payload sizes.
            # When `tasks_for_webhook` accumulates tasks equal to/exceeding `WEBHOOK_BATCH_SIZE`, they're sent in a webhook via
            # `emit_webhooks_for_instance`, and `tasks_for_webhook` is cleared for new tasks.
            # If tasks remain in `tasks_for_webhook` at process end (less than `WEBHOOK_BATCH_SIZE`), they're sent in a final webhook
            # call to ensure all tasks are processed and no task is left unreported in the webhook.
            if len(tasks_for_webhook) >= settings.WEBHOOK_BATCH_SIZE:
                emit_webhooks_for_instance(
                    self.project.organization, self.project, WebhookAction.TASKS_CREATED, tasks_for_webhook
                )
                tasks_for_webhook = []
        if tasks_for_webhook:
            emit_webhooks_for_instance(
                self.project.organization, self.project, WebhookAction.TASKS_CREATED, tasks_for_webhook
            )

        self.project.update_tasks_states(
            maximum_annotations_changed=False, overlap_cohort_percentage_changed=False, tasks_number_changed=True
        )

        # sync is finished, set completed status for storage info
        self.info_set_completed(last_sync_count=tasks_created, tasks_existed=tasks_existed)

    def scan_and_create_links(self):
        """This is proto method - you can override it, or just replace ImportStorageLink by your own model"""
        self._scan_and_create_links(ImportStorageLink)

    def sync(self):
        if redis_connected():
            queue = django_rq.get_queue('low')
            meta = {'project': self.project.id, 'storage': self.id}
            if not is_job_in_queue(queue, 'import_sync_background', meta=meta) and not is_job_on_worker(
                job_id=self.last_sync_job, queue_name='low'
            ):
                self.info_set_queued()
                sync_job = queue.enqueue(
                    import_sync_background,
                    self.__class__,
                    self.id,
                    meta=meta,
                    project_id=self.project.id,
                    organization_id=self.project.organization.id,
                    on_failure=storage_background_failure,
                    job_timeout=settings.RQ_LONG_JOB_TIMEOUT,
                )
                self.info_set_job(sync_job.id)
                logger.info(f'Storage sync background job {sync_job.id} for storage {self} has been started')
        else:
            try:
                logger.info(f'Start syncing storage {self}')
                self.info_set_queued()
                import_sync_background(self.__class__, self.id)
            except Exception:
                storage_background_failure(self)

    class Meta:
        abstract = True


class ProjectStorageMixin(models.Model):
    project = models.ForeignKey(
        'projects.Project',
        related_name='%(app_label)s_%(class)ss',
        on_delete=models.CASCADE,
        help_text='A unique integer value identifying this project.',
    )

    def has_permission(self, user):
        user.project = self.project  # link for activity log
        if self.project.has_permission(user):
            return True
        return False

    class Meta:
        abstract = True


@job('low')
def import_sync_background(storage_class, storage_id, timeout=settings.RQ_LONG_JOB_TIMEOUT, **kwargs):
    storage = storage_class.objects.get(id=storage_id)
    storage.scan_and_create_links()


@job('low', timeout=settings.RQ_LONG_JOB_TIMEOUT)
def export_sync_background(storage_class, storage_id, **kwargs):
    storage = storage_class.objects.get(id=storage_id)
    storage.save_all_annotations()


def storage_background_failure(*args, **kwargs):
    # job is used in rqworker failure, extract storage id from job arguments
    if isinstance(args[0], rq.job.Job):
        sync_job = args[0]
        _class = sync_job.args[0]
        storage_id = sync_job.args[1]
        storage = _class.objects.filter(id=storage_id).first()
        if storage is None:
            logger.info(f'Storage {_class} {storage_id} not found at job {sync_job} failure')
            return

    # storage is used when redis and rqworkers are not available (e.g. in opensource)
    elif isinstance(args[0], Storage):
        # we have to load storage with the last states from DB
        # the current args[0] instance might be outdated
        storage_id = args[0].id
        storage = args[0].__class__.objects.filter(id=storage_id).first()
    else:
        raise ValueError(f'Unknown storage in {args}')

    # save info about failure for storage info
    storage.info_set_failed()


class ExportStorage(Storage, ProjectStorageMixin):
    can_delete_objects = models.BooleanField(
        _('can_delete_objects'), null=True, blank=True, help_text='Deletion from storage enabled'
    )

    def _get_serialized_data(self, annotation):
        user = self.project.organization.created_by
        flag = flag_set(
            'fflag_feat_optic_650_target_storage_task_format_long', user=user, override_system_default=False
        )
        if settings.FUTURE_SAVE_TASK_TO_STORAGE or flag:
            # export task with annotations
            # TODO: we have to rewrite save_all_annotations, because this func will be called for each annotation
            # TODO: instead of each task, however, we have to call it only once per task
            expand = ['annotations.reviews', 'annotations.completed_by']
            context = {'project': self.project}
            return ExportDataSerializer(annotation.task, context=context, expand=expand).data
        else:
            serializer_class = load_func(settings.STORAGE_ANNOTATION_SERIALIZER)
            # deprecated functionality - save only annotation
            return serializer_class(annotation, context={'project': self.project}).data

    def save_annotation(self, annotation):
        raise NotImplementedError

    def save_all_annotations(self):
        annotation_exported = 0
        total_annotations = Annotation.objects.filter(project=self.project).count()
        self.info_set_in_progress()
        self.cached_user = self.project.organization.created_by

        for annotation in Annotation.objects.filter(project=self.project).iterator(
            chunk_size=settings.STORAGE_EXPORT_CHUNK_SIZE
        ):
            annotation.cached_user = self.cached_user
            self.save_annotation(annotation)

            # update progress counters
            annotation_exported += 1
            self.info_update_progress(last_sync_count=annotation_exported, total_annotations=total_annotations)

        self.info_set_completed(last_sync_count=annotation_exported, total_annotations=total_annotations)

    def sync(self):
        if redis_connected():
            queue = django_rq.get_queue('low')
            self.info_set_queued()
            sync_job = queue.enqueue(
                export_sync_background,
                self.__class__,
                self.id,
                job_timeout=settings.RQ_LONG_JOB_TIMEOUT,
                project_id=self.project.id,
                organization_id=self.project.organization.id,
                on_failure=storage_background_failure,
            )
            self.info_set_job(sync_job.id)
            logger.info(f'Storage sync background job {sync_job.id} for storage {self} has been queued')
        else:
            try:
                logger.info(f'Start syncing storage {self}')
                self.info_set_queued()
                export_sync_background(self.__class__, self.id)
            except Exception:
                storage_background_failure(self)

    class Meta:
        abstract = True


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
        # get user who created the organization explicitly using filter/values_list to avoid prefetching
        user = getattr(annotation, 'cached_user', None)
        # when signal for annotation save is called, user is not cached
        if user is None:
            user = annotation.project.organization.created_by
        flag = flag_set('fflag_feat_optic_650_target_storage_task_format_long', user=user)

        if settings.FUTURE_SAVE_TASK_TO_STORAGE or flag:
            ext = '.json' if settings.FUTURE_SAVE_TASK_TO_STORAGE_JSON_EXT or flag else ''
            return str(annotation.task.id) + ext
        else:
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
