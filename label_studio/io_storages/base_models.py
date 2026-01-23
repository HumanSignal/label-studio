"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import base64
import concurrent.futures
import itertools
import json
import logging
import os
import sys
import traceback as tb
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
from datetime import datetime
from typing import Any, Iterator, Union
from urllib.parse import urljoin

import django_rq
import rq
import rq.exceptions
from core.feature_flags import flag_set
from core.redis import is_job_in_queue, is_job_on_worker, redis_connected, start_job_async_or_sync
from core.utils.common import load_func
from core.utils.iterators import iterate_queryset
from data_export.serializers import ExportDataSerializer
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.db import models, transaction
from django.db.models import JSONField
from django.shortcuts import reverse
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from fsm.functions import backfill_fsm_states_for_tasks
from io_storages.utils import StorageObject, get_uri_via_regex, parse_bucket_uri
from rest_framework.exceptions import ValidationError
from rq.job import Job
from tasks.models import Annotation, Task
from tasks.serializers import AnnotationSerializer, PredictionSerializer
from webhooks.models import WebhookAction
from webhooks.utils import emit_webhooks_for_instance

from .exceptions import UnsupportedFileFormatError

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
        COMPLETED_WITH_ERRORS = 'completed_with_errors', _('Completed with errors')

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

    def _update_queued_status(self):
        self.last_sync = None
        self.last_sync_count = None
        self.last_sync_job = None
        self.status = self.Status.QUEUED

        # reset and init meta
        self.meta = {'attempts': self.meta.get('attempts', 0) + 1, 'time_queued': str(timezone.now())}

        self.save(update_fields=['last_sync_job', 'last_sync', 'last_sync_count', 'status', 'meta'])

    def info_set_queued(self):
        if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
            self._update_queued_status()
            return True

        with transaction.atomic():
            try:
                locked_storage = self.__class__.objects.select_for_update().get(pk=self.pk)
            except self.__class__.DoesNotExist:
                logger.error(f'Storage {self.__class__.__name__} with pk={self.pk} does not exist')
                return False

            if locked_storage.status in [self.Status.QUEUED, self.Status.IN_PROGRESS]:
                logger.error(
                    f'Storage {locked_storage} (id={locked_storage.id}) is already in status '
                    f'"{locked_storage.status}". Cannot set to QUEUED. '
                    f'Last sync job: {locked_storage.last_sync_job}, '
                    f'Meta: {locked_storage.meta}'
                )
                return False

            locked_storage._update_queued_status()

            self.refresh_from_db()
            return True

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

    def info_set_completed_with_errors(self, last_sync_count, validation_errors, **kwargs):
        self.status = self.Status.COMPLETED_WITH_ERRORS
        self.last_sync = timezone.now()
        self.last_sync_count = last_sync_count
        self.traceback = '\n'.join(validation_errors)
        time_completed = timezone.now()
        self.meta['time_completed'] = str(time_completed)
        self.meta['duration'] = (time_completed - self.time_in_progress).total_seconds()
        self.meta['tasks_failed_validation'] = len(validation_errors)
        self.meta.update(kwargs)
        self.save(update_fields=['status', 'meta', 'last_sync', 'last_sync_count', 'traceback'])

    def info_set_failed(self):
        self.status = self.Status.FAILED

        # Get the current exception info
        exc_type, exc_value, exc_traceback = sys.exc_info()

        # Extract human-readable error messages from ValidationError
        if exc_type and issubclass(exc_type, ValidationError):
            error_messages = []
            if hasattr(exc_value, 'detail'):
                # Handle ValidationError.detail which can be a dict or list
                if isinstance(exc_value.detail, dict):
                    for field, errors in exc_value.detail.items():
                        if isinstance(errors, list):
                            for error in errors:
                                if hasattr(error, 'string'):
                                    error_messages.append(error.string)
                                else:
                                    error_messages.append(str(error))
                        else:
                            error_messages.append(str(errors))
                elif isinstance(exc_value.detail, list):
                    for error in exc_value.detail:
                        if hasattr(error, 'string'):
                            error_messages.append(error.string)
                        else:
                            error_messages.append(str(error))
                else:
                    error_messages.append(str(exc_value.detail))

            # Use human-readable messages if available, otherwise fall back to full traceback
            if error_messages:
                self.traceback = '\n'.join(error_messages)
            else:
                self.traceback = str(tb.format_exc())
        else:
            # For non-ValidationError exceptions, use the full traceback
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
                f'Storage {self} status moved to `failed` because the job {self.last_sync_job} has too old ping time'
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
            logger.info(f'Storage {self} status moved to `failed` because of the failed job {self.last_sync_job}')

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
            logger.info(f'Storage {self} status moved to `failed` because the job {self.last_sync_job} was not found')


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
    def iter_objects(self) -> Iterator[Any]:
        """
        Returns:
            Iterator[Any]: An iterator for objects in the storage.
        """
        raise NotImplementedError

    def iter_keys(self) -> Iterator[str]:
        """
        Returns:
            Iterator[str]: An iterator of keys for each object in the storage.
        """
        raise NotImplementedError

    def get_unified_metadata(self, obj: Any) -> dict:
        """
        Args:
            obj: The storage object to get metadata for
        Returns:
            dict: A dictionary of metadata for the object with keys:
            'key', 'last_modified', 'size'.
        """
        raise NotImplementedError

    def get_data(self, key) -> list[StorageObject]:
        raise NotImplementedError

    def generate_http_url(self, url):
        raise NotImplementedError

    def get_bytes_stream(self, uri):
        """Get file bytes from storage as a stream and content type.

        Args:
            uri: The URI of the file to retrieve

        Returns:
            Tuple of (BytesIO stream, content_type)
        """
        raise NotImplementedError

    def can_resolve_url(self, url: Union[str, None]) -> bool:
        return self.can_resolve_scheme(url)

    def can_resolve_scheme(self, url: Union[str, None]) -> bool:
        if not url:
            return False
        # TODO: Search for occurrences inside string, e.g. for cases like "gs://bucket/file.pdf" or "<embed src='gs://bucket/file.pdf'/>"
        _, prefix = get_uri_via_regex(url, prefixes=(self.url_scheme,))
        bucket_uri = parse_bucket_uri(url, self)

        # If there is a prefix and the bucket matches the storage's bucket/container/path
        if prefix == self.url_scheme and bucket_uri:
            # bucket is used for s3 and gcs
            if hasattr(self, 'bucket') and bucket_uri.bucket == self.bucket:
                return True
            # container is used for azure blob
            if hasattr(self, 'container') and bucket_uri.bucket == self.container:
                return True
            # path is used for redis
            if hasattr(self, 'path') and bucket_uri.bucket == self.path:
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
        elif isinstance(uri, str) and self.url_scheme in uri:
            try:
                # extract uri first from task data
                extracted_uri, _ = get_uri_via_regex(uri, prefixes=(self.url_scheme,))
                if not self.can_resolve_url(extracted_uri):
                    logger.debug(f'No storage info found for URI={uri}')
                    return

                if task is None:
                    logger.error(f'Task is required to resolve URI={uri}', exc_info=True)
                    raise ValueError(f'Task is required to resolve URI={uri}')

                proxy_url = urljoin(
                    settings.HOSTNAME,
                    reverse('storages:task-storage-data-resolve', kwargs={'task_id': task.id})
                    + f'?fileuri={base64.urlsafe_b64encode(extracted_uri.encode()).decode()}',
                )
                return uri.replace(extracted_uri, proxy_url)
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
    def add_task(cls, project, maximum_annotations, max_inner_id, storage, link_object: StorageObject, link_class):
        link_kwargs = asdict(link_object)
        data = link_kwargs.pop('task_data', None)

        allow_skip = data.get('allow_skip', True)

        # predictions
        predictions = data.get('predictions') or []
        if predictions:
            if 'data' not in data:
                raise ValueError(
                    'If you use "predictions" field in the task, you must put "data" field in the task too'
                )

        # annotations
        annotations = data.get('annotations') or []
        cancelled_annotations = 0
        if annotations:
            if 'data' not in data:
                raise ValueError(
                    'If you use "annotations" field in the task, you must put "data" field in the task too'
                )
            cancelled_annotations = len([a for a in annotations if a.get('was_cancelled', False)])

        if 'data' in data and isinstance(data['data'], dict):
            if data['data'] is not None:
                data = data['data']
            else:
                data.pop('data')

        with transaction.atomic():
            # Create task without skip_fsm (it's not a model field)
            task = Task(
                data=data,
                project=project,
                overlap=maximum_annotations,
                is_labeled=len(annotations) >= maximum_annotations,
                total_predictions=len(predictions),
                total_annotations=len(annotations) - cancelled_annotations,
                cancelled_annotations=cancelled_annotations,
                inner_id=max_inner_id,
                allow_skip=allow_skip,
            )
            # Save with skip_fsm flag to bypass FSM during bulk import
            task.save(skip_fsm=True)

            link_class.create(task, storage=storage, **link_kwargs)
            logger.debug(f'Create {storage.__class__.__name__} link with {link_kwargs} for {task=}')

            raise_exception = not flag_set(
                'ff_fix_back_dev_3342_storage_scan_with_invalid_annotations', user=AnonymousUser()
            )

            # add predictions
            logger.debug(f'Create {len(predictions)} predictions for task={task}')
            for prediction in predictions:
                prediction['task'] = task.id
                prediction['project'] = project.id
            prediction_ser = PredictionSerializer(data=predictions, many=True)

            # Always validate predictions and raise exception if invalid
            raise_prediction_exception = (
                flag_set('fflag_feat_utc_210_prediction_validation_15082025', user=project.organization.created_by)
                or raise_exception
            )
            if prediction_ser.is_valid(raise_exception=raise_prediction_exception):
                prediction_ser.save()

            # add annotations
            logger.debug(f'Create {len(annotations)} annotations for task={task}')
            for annotation in annotations:
                annotation['task'] = task.id
                annotation['project'] = project.id
            annotation_ser = AnnotationSerializer(data=annotations, many=True)

            # Always validate annotations, but control error handling based on FF
            if annotation_ser.is_valid():
                annotation_ser.save()
            else:
                # Log validation errors but don't save invalid annotations
                logger.error(f'Invalid annotations for task {task.id}: {annotation_ser.errors}')
                if raise_exception:
                    raise ValidationError(annotation_ser.errors)
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
        validation_errors = []

        # Check feature flags once for the entire sync process
        check_file_extension = flag_set(
            'fflag_fix_back_plt_804_check_file_extension_11072025_short', organization=self.project.organization
        )
        existed_count_flag_set = flag_set(
            'fflag_root_212_reduce_importstoragelink_counts', organization=self.project.organization
        )

        tasks_for_webhook = []
        for keys_batch in _batched(
            self.iter_keys(), settings.STORAGE_EXISTED_COUNT_BATCH_SIZE if existed_count_flag_set else 1
        ):
            deduplicated_keys = list(dict.fromkeys(keys_batch))  # preserve order
            for key in deduplicated_keys:
                logger.debug(f'Scanning key {key}')

            # w/o Dataflow
            # pubsub.push(topic, key)
            # -> GF.pull(topic, key) + env -> add_task()

            # skip if key has already been synced
            existing_keys = link_class.exists(deduplicated_keys, self)
            tasks_existed += link_class.objects.filter(key__in=existing_keys, storage=self.id).count()
            self.info_update_progress(last_sync_count=tasks_created, tasks_existed=tasks_existed)

            for key in deduplicated_keys:
                if key in existing_keys:
                    logger.debug(f'{self.__class__.__name__} already has tasks linked to {key=}')
                    continue

                logger.debug(f'{self}: found new key {key}')

                # Check if file should be processed as JSON based on extension
                # Skip non-JSON files if use_blob_urls is False
                if check_file_extension and not self.use_blob_urls:
                    _, ext = os.path.splitext(key.lower())
                    # Only process files with JSON/JSONL/PARQUET extensions
                    json_extensions = {'.json', '.jsonl', '.parquet'}

                    if ext and ext not in json_extensions:
                        raise UnsupportedFileFormatError(
                            f'File "{key}" is not a JSON/JSONL/Parquet file. Only .json, .jsonl, and .parquet files can be processed.\n'
                            f"If you're trying to import non-JSON data (images, audio, text, etc.), "
                            f'edit storage settings and enable "Tasks" import method'
                        )

                try:
                    link_objects = self.get_data(key)
                except (UnicodeDecodeError, json.decoder.JSONDecodeError) as exc:
                    logger.debug(exc, exc_info=True)
                    raise ValueError(
                        f'Error loading JSON from file "{key}".\nIf you\'re trying to import non-JSON data '
                        f'(images, audio, text, etc.), edit storage settings and enable '
                        f'"Tasks" import method'
                    )

                for link_object in link_objects:
                    # TODO: batch this loop body with add_task -> add_tasks in a single bulk write.
                    # See DIA-2062 for prerequisites
                    try:
                        task = self.add_task(
                            self.project,
                            maximum_annotations,
                            max_inner_id,
                            self,
                            link_object,
                            link_class=link_class,
                        )
                        max_inner_id += 1

                        # update progress counters for storage info
                        tasks_created += 1

                        # add task to webhook list
                        tasks_for_webhook.append(task.id)
                    except ValidationError as e:
                        # Log validation errors but continue processing other tasks
                        error_message = f'Validation error for task from {link_object.key}: {e}'
                        logger.error(error_message)
                        validation_errors.append(error_message)
                        continue

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

                self.info_update_progress(last_sync_count=tasks_created, tasks_existed=tasks_existed)

        if tasks_for_webhook:
            emit_webhooks_for_instance(
                self.project.organization, self.project, WebhookAction.TASKS_CREATED, tasks_for_webhook
            )

        # Create initial FSM states for all tasks created during storage sync
        backfill_fsm_states_for_tasks(self.id, tasks_created, link_class)

        self.project.update_tasks_states(
            maximum_annotations_changed=False, overlap_cohort_percentage_changed=False, tasks_number_changed=True
        )
        if validation_errors:
            # sync is finished, set completed with errors status for storage info
            self.info_set_completed_with_errors(
                last_sync_count=tasks_created, tasks_existed=tasks_existed, validation_errors=validation_errors
            )
        else:
            # sync is finished, set completed status for storage info
            self.info_set_completed(last_sync_count=tasks_created, tasks_existed=tasks_existed)

    def scan_and_create_links(self):
        """This is proto method - you can override it, or just replace ImportStorageLink by your own model"""
        self._scan_and_create_links(ImportStorageLink)

    def sync(self):
        if redis_connected():
            queue_name = 'low'
            queue = django_rq.get_queue(queue_name)
            meta = {'project': self.project.id, 'storage': self.id}
            if not is_job_in_queue(queue, 'import_sync_background', meta=meta) and not is_job_on_worker(
                job_id=self.last_sync_job, queue_name=queue_name
            ):
                if not self.info_set_queued():
                    return
                # Use start_job_async_or_sync to automatically capture and restore CurrentContext
                # This ensures user_id, organization_id, and request_id are available in the worker
                sync_job = start_job_async_or_sync(
                    import_sync_background,
                    self.__class__,
                    self.id,
                    queue_name=queue_name,
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
                if not self.info_set_queued():
                    return
                import_sync_background(self.__class__, self.id)
            except Exception:
                # needed to facilitate debugging storage-related testcases, since otherwise no exception is logged
                logger.debug(f'Storage {self} failed', exc_info=True)
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


def import_sync_background(storage_class, storage_id, timeout=settings.RQ_LONG_JOB_TIMEOUT, **kwargs):
    storage = storage_class.objects.get(id=storage_id)
    try:
        storage.scan_and_create_links()
    except UnsupportedFileFormatError:
        # This is an expected error when user tries to import non-JSON files without enabling blob URLs
        # We don't want to fail the job in this case, just mark the storage as failed with a clear message
        storage.info_set_failed()
        # Exit gracefully without raising exception to avoid job failure
        return


def export_sync_background(storage_class, storage_id, **kwargs):
    storage = storage_class.objects.get(id=storage_id)
    storage.save_all_annotations()


def export_sync_only_new_background(storage_class, storage_id, **kwargs):
    storage = storage_class.objects.get(id=storage_id)
    storage.save_only_new_annotations()


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


# note: this is available in python 3.12 , #TODO to switch to builtin function when we move to it.
def _batched(iterable, n):
    # batched('ABCDEFG', 3) --> ABC DEF G
    if n < 1:
        raise ValueError('n must be at least one')
    it = iter(iterable)
    while batch := tuple(itertools.islice(it, n)):
        yield batch


class ExportStorage(Storage, ProjectStorageMixin):
    can_delete_objects = models.BooleanField(
        _('can_delete_objects'), null=True, blank=True, help_text='Deletion from storage enabled'
    )
    # Use 8 threads, unless we know we only have a single core
    # TODO from testing, more than 8 seems to cause problems. revisit to add more parallelism.
    max_workers = min(8, (os.cpu_count() or 2) * 4)

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

    def save_annotations(self, annotations: models.QuerySet[Annotation]):
        annotation_exported = 0
        total_annotations = annotations.count()
        self.info_set_in_progress()
        self.cached_user = self.project.organization.created_by

        # Calculate optimal batch size based on project data and worker count
        project_batch_size = self.project.get_task_batch_size()
        chunk_size = max(1, project_batch_size // self.max_workers)
        logger.info(
            f'Export storage {self.id}: using chunk_size={chunk_size} '
            f'(project_batch_size={project_batch_size}, max_workers={self.max_workers})'
        )

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Batch annotations so that we update progress before having to submit every future.
            # Updating progress in thread requires coordinating on count and db writes, so just
            # batching to keep it simpler.
            for annotation_batch in _batched(
                iterate_queryset(Annotation.objects.filter(project=self.project), chunk_size=chunk_size),
                chunk_size,
            ):
                futures = []
                for annotation in annotation_batch:
                    annotation.cached_user = self.cached_user
                    futures.append(executor.submit(self.save_annotation, annotation))

                for future in concurrent.futures.as_completed(futures):
                    annotation_exported += 1
                    self.info_update_progress(last_sync_count=annotation_exported, total_annotations=total_annotations)

        self.info_set_completed(last_sync_count=annotation_exported, total_annotations=total_annotations)

    def save_all_annotations(self):
        self.save_annotations(Annotation.objects.filter(project=self.project))

    def save_only_new_annotations(self):
        """Do not update existing annotations, only ensure that all annotations have an ExportStorageLink"""
        # Get the storage-specific ExportStorageLink model
        storage_link_model = self.links.model
        new_annotations = Annotation.objects.filter(project=self.project).exclude(
            id__in=storage_link_model.objects.filter(storage=self, annotation__project=self.project).values(
                'annotation_id'
            )
        )
        self.save_annotations(new_annotations)

    def sync(self, save_only_new_annotations: bool = False):
        if save_only_new_annotations:
            export_sync_fn = export_sync_only_new_background
        else:
            export_sync_fn = export_sync_background

        if redis_connected():
            if not self.info_set_queued():
                return
            sync_job = start_job_async_or_sync(
                export_sync_fn,
                self.__class__,
                self.id,
                queue_name='low',
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
                if not self.info_set_queued():
                    return
                export_sync_fn(self.__class__, self.id)
            except Exception:
                storage_background_failure(self)

    class Meta:
        abstract = True


class ImportStorageLink(models.Model):
    task = models.OneToOneField('tasks.Task', on_delete=models.CASCADE, related_name='%(app_label)s_%(class)s')
    key = models.TextField(_('key'), null=False, help_text='External link key')

    # This field is set to True on creation and never updated; it should not be relied upon.
    object_exists = models.BooleanField(
        _('object exists'), help_text='Whether object under external link still exists', default=True
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')

    row_group = models.IntegerField(null=True, blank=True, help_text='Parquet row group')
    row_index = models.IntegerField(null=True, blank=True, help_text='Parquet row index, or JSON[L] object index')

    @classmethod
    def exists(cls, keys, storage) -> set[str]:
        return set(cls.objects.filter(key__in=keys, storage=storage.id).values_list('key', flat=True).distinct())

    @classmethod
    def create(cls, task, key, storage, row_index=None, row_group=None):
        link, created = cls.objects.get_or_create(
            task_id=task.id, key=key, row_index=row_index, row_group=row_group, storage=storage, object_exists=True
        )
        return link

    class Meta:
        abstract = True


class ExportStorageLink(models.Model):
    annotation = models.ForeignKey(
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
