"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import base64
import datetime
import logging
import numbers
import os
import uuid
from typing import Any, Mapping, Optional, cast
from urllib.parse import urljoin

import ujson as json
from core.bulk_update_utils import bulk_update
from core.current_request import get_current_request
from core.feature_flags import flag_set
from core.label_config import SINGLE_VALUED_TAGS
from core.redis import start_job_async_or_sync
from core.utils.common import (
    find_first_one_to_one_related_field_by_prefix,
    load_func,
    string_is_url,
    temporary_disconnect_list_signal,
)
from core.utils.db import fast_first
from core.utils.params import get_env
from data_import.models import FileUpload
from data_manager.managers import PreparedTaskManager, TaskManager
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.core.files.storage import default_storage
from django.db import OperationalError, models, transaction
from django.db.models import JSONField, Q
from django.db.models.signals import post_delete, post_save, pre_delete, pre_save
from django.dispatch import Signal, receiver
from django.urls import reverse
from django.utils.timesince import timesince
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import ValidationError
from tasks.choices import ActionType

logger = logging.getLogger(__name__)

TaskMixin = load_func(settings.TASK_MIXIN)


class Task(TaskMixin, models.Model):
    """Business tasks from project"""

    id = models.AutoField(
        auto_created=True,
        primary_key=True,
        serialize=False,
        verbose_name='ID',
        db_index=True,
    )
    data = JSONField(
        'data',
        null=False,
        help_text='User imported or uploaded data for a task. Data is formatted according to '
        'the project label config. You can find examples of data for your project '
        'on the Import page in the Label Studio Data Manager UI.',
    )

    meta = JSONField(
        'meta',
        null=True,
        default=dict,
        help_text='Meta is user imported (uploaded) data and can be useful as input for an ML '
        'Backend for embeddings, advanced vectors, and other info. It is passed to '
        'ML during training/predicting steps.',
    )
    project = models.ForeignKey(
        'projects.Project',
        related_name='tasks',
        on_delete=models.CASCADE,
        null=True,
        help_text='Project ID for this task',
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Time a task was created')
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, help_text='Last time a task was updated')
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='updated_tasks',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('updated by'),
        help_text='Last annotator or reviewer who updated this task',
    )
    is_labeled = models.BooleanField(
        _('is_labeled'),
        default=False,
        help_text='True if the number of annotations for this task is greater than or equal '
        'to the number of maximum_completions for the project',
    )
    overlap = models.IntegerField(
        _('overlap'),
        default=1,
        db_index=True,
        help_text='Number of distinct annotators that processed the current task',
    )
    file_upload = models.ForeignKey(
        'data_import.FileUpload',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
        help_text='Uploaded file used as data source for this task',
    )
    inner_id = models.BigIntegerField(
        _('inner id'),
        default=0,
        null=True,
        help_text='Internal task ID in the project, starts with 1',
    )
    updates = ['is_labeled']
    total_annotations = models.IntegerField(
        _('total_annotations'),
        default=0,
        db_index=True,
        help_text='Number of total annotations for the current task except cancelled annotations',
    )
    cancelled_annotations = models.IntegerField(
        _('cancelled_annotations'),
        default=0,
        db_index=True,
        help_text='Number of total cancelled annotations for the current task',
    )
    total_predictions = models.IntegerField(
        _('total_predictions'),
        default=0,
        db_index=True,
        help_text='Number of total predictions for the current task',
    )

    comment_count = models.IntegerField(
        _('comment count'),
        default=0,
        db_index=True,
        help_text='Number of comments in the task including all annotations',
    )
    unresolved_comment_count = models.IntegerField(
        _('unresolved comment count'),
        default=0,
        db_index=True,
        help_text='Number of unresolved comments in the task including all annotations',
    )
    comment_authors = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        default=None,
        related_name='tasks_with_comments',
        help_text='Users who wrote comments',
    )
    last_comment_updated_at = models.DateTimeField(
        _('last comment updated at'),
        default=None,
        null=True,
        db_index=True,
        help_text='When the last comment was updated',
    )

    objects = TaskManager()  # task manager by default
    prepared = PreparedTaskManager()  # task manager with filters, ordering, etc for data_manager app

    class Meta:
        db_table = 'task'
        indexes = [
            models.Index(fields=['project', 'is_labeled']),
            models.Index(fields=['project', 'inner_id']),
            models.Index(fields=['id', 'project']),
            models.Index(fields=['id', 'overlap']),
            models.Index(fields=['overlap']),
            models.Index(fields=['project', 'id']),
        ]

    @property
    def file_upload_name(self):
        return os.path.basename(self.file_upload.file.name)

    @classmethod
    def get_locked_by(cls, user, project=None, tasks=None):
        """Retrieve the task locked by specified user. Returns None if the specified user didn't lock anything."""
        lock = None
        if project is not None:
            lock = fast_first(TaskLock.objects.filter(user=user, expire_at__gt=now(), task__project=project))
        elif tasks is not None:
            locked_task = fast_first(tasks.filter(locks__user=user, locks__expire_at__gt=now()))
            if locked_task:
                return locked_task
        else:
            raise Exception('Neither project or tasks passed to get_locked_by')

        if lock:
            return lock.task

    def has_lock(self, user=None):
        """
        Check whether current task has been locked by some user

        Also has workaround for fixing not consistent is_labeled flag state
        """
        from projects.functions.next_task import get_next_task_logging_level

        SkipQueue = self.project.SkipQueue

        if self.project.skip_queue == SkipQueue.REQUEUE_FOR_ME:
            # REQUEUE_FOR_ME means: only my skipped tasks go back to me,
            # alien's skipped annotations are counted as regular annotations
            q = Q(was_cancelled=True) & Q(completed_by=user)
        elif self.project.skip_queue == SkipQueue.REQUEUE_FOR_OTHERS:
            # REQUEUE_FOR_OTHERS: my skipped tasks go to others
            # alien's skipped annotations are not counted at all
            q = Q(was_cancelled=True) & ~Q(completed_by=user)
        else:  # SkipQueue.IGNORE_SKIPPED
            # IGNORE_SKIPPED: my skipped tasks don't go anywhere
            # alien's and my skipped annotations are counted as regular annotations
            q = Q()

        num_locks = self.num_locks_user(user=user)
        num_annotations = self.annotations.exclude(q | Q(ground_truth=True)).count()
        num = num_locks + num_annotations

        if num > self.overlap_with_agreement_threshold(num, num_locks):
            logger.error(
                f'Num takes={num} > overlap={self.overlap} for task={self.id}, '
                f"skipped mode {self.project.skip_queue} - it's a bug",
                extra=dict(
                    lock_ttl=self.locks.values_list('user', 'expire_at'),
                    num_locks=num_locks,
                    num_annotations=num_annotations,
                ),
            )
            # TODO: remove this workaround after fixing the bug with inconsistent is_labeled flag
            if self.is_labeled is False:
                self.update_is_labeled()
                if self.is_labeled is True:
                    self.save(update_fields=['is_labeled'])

        result = bool(num >= self.overlap_with_agreement_threshold(num, num_locks))
        logger.log(
            get_next_task_logging_level(user),
            f'Task {self} locked: {result}; num_locks: {num_locks} num_annotations: {num_annotations} '
            f'skipped mode: {self.project.skip_queue}',
        )
        return result

    @property
    def num_locks(self):
        return self.locks.filter(expire_at__gt=now()).count()

    def overlap_with_agreement_threshold(self, num, num_locks):
        # Limit to one extra annotator at a time when the task is under the threshold and meets the overlap criteria,
        # regardless of the max_additional_annotators_assignable setting. This ensures recalculating agreement after
        # each annotation and prevents concurrent annotations from dropping the agreement below the threshold.
        if (
            hasattr(self.project, 'lse_project')
            and self.project.lse_project
            and self.project.lse_project.agreement_threshold is not None
        ):
            try:
                from stats.models import get_task_agreement
            except (ModuleNotFoundError, ImportError):
                return

            agreement = get_task_agreement(self)
            if agreement is not None and agreement < self.project.lse_project.agreement_threshold:
                return (
                    min(self.overlap + self.project.lse_project.max_additional_annotators_assignable, num + 1)
                    if num_locks == 0
                    else num
                )
        return self.overlap

    def num_locks_user(self, user):
        return self.locks.filter(expire_at__gt=now()).exclude(user=user).count()

    def get_storage_filename(self):
        for link_name in settings.IO_STORAGES_IMPORT_LINK_NAMES:
            if hasattr(self, link_name):
                return getattr(self, link_name).key

    def has_permission(self, user: 'User') -> bool:  # noqa: F821
        mixin_has_permission = cast(bool, super().has_permission(user))

        user.project = self.project  # link for activity log
        return mixin_has_permission and self.project.has_permission(user)

    def clear_expired_locks(self):
        self.locks.filter(expire_at__lt=now()).delete()

    def set_lock(self, user):
        """Lock current task by specified user. Lock lifetime is set by `expire_in_secs`"""
        from projects.functions.next_task import get_next_task_logging_level

        num_locks = self.num_locks
        if num_locks < self.overlap:
            lock_ttl = settings.TASK_LOCK_TTL
            expire_at = now() + datetime.timedelta(seconds=lock_ttl)
            try:
                task_lock = TaskLock.objects.get(task=self, user=user)
            except TaskLock.DoesNotExist:
                TaskLock.objects.create(task=self, user=user, expire_at=expire_at)
            else:
                task_lock.expire_at = expire_at
                task_lock.save()
            logger.log(
                get_next_task_logging_level(user),
                f'User={user} acquires a lock for the task={self} ttl: {lock_ttl}',
            )
        else:
            logger.error(
                f'Current number of locks for task {self.id} is {num_locks}, but overlap={self.overlap}: '
                f"that's a bug because this task should not be taken in a label stream (task should be locked)"
            )
        self.clear_expired_locks()

    def release_lock(self, user=None):
        """Release lock for the task.
        If user specified, it checks whether lock is released by the user who previously has locked that task
        """

        if user is not None:
            self.locks.filter(user=user).delete()
        else:
            self.locks.all().delete()
        self.clear_expired_locks()

    def get_storage_link(self):
        # TODO: how to get neatly any storage class here?
        return find_first_one_to_one_related_field_by_prefix(self, '.*io_storages_')

    @staticmethod
    def is_upload_file(filename):
        if not isinstance(filename, str):
            return False
        return filename.startswith(settings.UPLOAD_DIR + '/')

    @staticmethod
    def prepare_filename(filename):
        if isinstance(filename, str):
            return filename.replace(settings.MEDIA_URL, '')
        return filename

    def resolve_storage_uri(self, url) -> Optional[Mapping[str, Any]]:
        from io_storages.functions import get_storage_by_url

        storage = self.storage
        project = self.project

        if not storage:
            storage_objects = project.get_all_storage_objects(type_='import')
            storage = get_storage_by_url(url, storage_objects)

        if storage:
            return {
                'url': storage.generate_http_url(url),
                'presign_ttl': storage.presign_ttl,
            }

    def resolve_uri(self, task_data, project):
        from io_storages.functions import get_storage_by_url

        if project.task_data_login and project.task_data_password:
            protected_data = {}
            for key, value in task_data.items():
                if isinstance(value, str) and string_is_url(value):
                    path = (
                        reverse('projects-file-proxy', kwargs={'pk': project.pk})
                        + '?url='
                        + base64.urlsafe_b64encode(value.encode()).decode()
                    )
                    value = urljoin(settings.HOSTNAME, path)
                protected_data[key] = value
            return protected_data
        else:
            storage_objects = project.get_all_storage_objects(type_='import')

            # try resolve URLs via storage associated with that task
            for field in task_data:
                # file saved in django file storage
                prepared_filename = self.prepare_filename(task_data[field])
                if settings.CLOUD_FILE_STORAGE_ENABLED and self.is_upload_file(prepared_filename):
                    # permission check: resolve uploaded files to the project only
                    file_upload = fast_first(FileUpload.objects.filter(project=project, file=prepared_filename))
                    if file_upload is not None:
                        if flag_set(
                            'ff_back_dev_2915_storage_nginx_proxy_26092022_short',
                            self.project.organization.created_by,
                        ):
                            task_data[field] = file_upload.url
                        else:
                            task_data[field] = default_storage.url(name=prepared_filename)
                    # it's very rare case, e.g. user tried to reimport exported file from another project
                    # or user wrote his django storage path manually
                    else:
                        task_data[field] = task_data[field] + '?not_uploaded_project_file'
                    continue

                # project storage
                # TODO: to resolve nested lists and dicts we should improve get_storage_by_url(),
                # TODO: problem with current approach: it can be used only the first storage that get_storage_by_url
                # TODO: returns. However, maybe the second storage will resolve uris properly.
                # TODO: resolve_uri() already supports them
                storage = self.storage or get_storage_by_url(task_data[field], storage_objects)
                if storage:
                    try:
                        proxy_task = None
                        if flag_set(
                            'fflag_fix_all_lsdv_4711_cors_errors_accessing_task_data_short',
                            user='auto',
                        ):
                            proxy_task = self

                        resolved_uri = storage.resolve_uri(task_data[field], proxy_task)
                    except Exception as exc:
                        logger.debug(exc, exc_info=True)
                        resolved_uri = None
                    if resolved_uri:
                        task_data[field] = resolved_uri
            return task_data

    @property
    def storage(self):
        # maybe task has storage link
        storage_link = self.get_storage_link()
        if storage_link:
            return storage_link.storage

        # or try global storage settings (only s3 for now)
        elif get_env('USE_DEFAULT_S3_STORAGE', default=False, is_bool=True):
            # TODO: this is used to access global environment storage settings.
            # We may use more than one and non-default S3 storage (like GCS, Azure)
            from io_storages.s3.models import S3ImportStorage

            return S3ImportStorage()

    @property
    def completed_annotations(self):
        """Annotations that we take into account when set completed status to the task"""
        if self.project.skip_queue == self.project.SkipQueue.IGNORE_SKIPPED:
            return self.annotations
        else:
            return self.annotations.filter(Q_finished_annotations)

    def increase_project_summary_counters(self):
        if hasattr(self.project, 'summary'):
            summary = self.project.summary
            summary.update_data_columns([self])

    def decrease_project_summary_counters(self):
        if hasattr(self.project, 'summary'):
            summary = self.project.summary
            summary.remove_data_columns([self])

    def ensure_unique_groundtruth(self, annotation_id):
        self.annotations.exclude(id=annotation_id).update(ground_truth=False)

    def save(self, *args, **kwargs):
        if flag_set('ff_back_2070_inner_id_12052022_short', AnonymousUser):
            if self.inner_id == 0:
                task = Task.objects.filter(project=self.project).order_by('-inner_id').first()
                max_inner_id = 1
                if task:
                    max_inner_id = task.inner_id

                # max_inner_id might be None in the old projects
                self.inner_id = None if max_inner_id is None else (max_inner_id + 1)
        super().save(*args, **kwargs)

    @staticmethod
    def delete_tasks_without_signals(queryset):
        """
        Delete Tasks queryset with switched off signals
        :param queryset: Tasks queryset
        """
        signals = [
            (post_delete, update_all_task_states_after_deleting_task, Task),
            (pre_delete, remove_data_columns, Task),
        ]
        with temporary_disconnect_list_signal(signals):
            queryset.delete()

    @staticmethod
    def delete_tasks_without_signals_from_task_ids(task_ids):
        queryset = Task.objects.filter(id__in=task_ids)
        Task.delete_tasks_without_signals(queryset)

    def delete(self, *args, **kwargs):
        self.before_delete_actions()
        result = super().delete(*args, **kwargs)
        # set updated_at field of task to now()
        return result


pre_bulk_create = Signal(providing_args=['objs', 'batch_size'])
post_bulk_create = Signal(providing_args=['objs', 'batch_size'])


class AnnotationManager(models.Manager):
    def for_user(self, user):
        return self.filter(project__organization=user.active_organization)

    def bulk_create(self, objs, batch_size=None):
        pre_bulk_create.send(sender=self.model, objs=objs, batch_size=batch_size)
        res = super(AnnotationManager, self).bulk_create(objs, batch_size)
        post_bulk_create.send(sender=self.model, objs=objs, batch_size=batch_size)
        return res


GET_UNIQUE_IDS = """
with tt as (
    select jsonb_array_elements(tch.result) as item from task_completion_history tch
    where task=%(t_id)s and task_annotation=%(tc_id)s
) select count( distinct tt.item -> 'id') from tt"""

AnnotationMixin = load_func(settings.ANNOTATION_MIXIN)


class Annotation(AnnotationMixin, models.Model):
    """Annotations & Labeling results"""

    objects = AnnotationManager()

    result = JSONField(
        'result',
        null=True,
        default=None,
        help_text='The main value of annotator work - ' 'labeling result in JSON format',
    )

    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='annotations',
        null=True,
        help_text='Corresponding task for this annotation',
    )
    # duplicate relation to project for performance reasons
    project = models.ForeignKey(
        'projects.Project',
        related_name='annotations',
        on_delete=models.CASCADE,
        null=True,
        help_text='Project ID for this annotation',
    )
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='annotations',
        on_delete=models.SET_NULL,
        null=True,
        help_text='User ID of the person who created this annotation',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='updated_annotations',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('updated by'),
        help_text='Last user who updated this annotation',
    )
    was_cancelled = models.BooleanField(_('was cancelled'), default=False, help_text='User skipped the task')
    ground_truth = models.BooleanField(
        _('ground_truth'),
        default=False,
        help_text='This annotation is a Ground Truth (ground_truth)',
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, help_text='Last updated time')
    draft_created_at = models.DateTimeField(
        _('draft created at'), null=True, default=None, help_text='Draft creation time'
    )
    lead_time = models.FloatField(
        _('lead time'),
        null=True,
        default=None,
        help_text='How much time it took to annotate the task',
    )
    prediction = JSONField(
        _('prediction'),
        null=True,
        default=dict,
        help_text='Prediction viewed at the time of annotation',
    )
    result_count = models.IntegerField(_('result count'), default=0, help_text='Results inside of annotation counter')

    parent_prediction = models.ForeignKey(
        'tasks.Prediction',
        on_delete=models.SET_NULL,
        related_name='child_annotations',
        null=True,
        help_text='Points to the prediction from which this annotation was created',
    )
    parent_annotation = models.ForeignKey(
        'tasks.Annotation',
        on_delete=models.SET_NULL,
        related_name='child_annotations',
        null=True,
        help_text='Points to the parent annotation from which this annotation was created',
    )
    unique_id = models.UUIDField(default=uuid.uuid4, null=True, blank=True, unique=True, editable=False)
    import_id = models.BigIntegerField(
        default=None,
        null=True,
        blank=True,
        db_index=True,
        help_text="Original annotation ID that was at the import step or NULL if this annotation wasn't imported",
    )
    last_action = models.CharField(
        _('last action'),
        max_length=128,
        choices=ActionType.choices,
        help_text='Action which was performed in the last annotation history item',
        default=None,
        null=True,
    )
    last_created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        verbose_name=_('last created by'),
        help_text='User who created the last annotation history item',
        default=None,
        null=True,
    )

    class Meta:
        db_table = 'task_completion'
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['ground_truth']),
            models.Index(fields=['id', 'task']),
            models.Index(fields=['last_action']),
            models.Index(fields=['project', 'ground_truth']),
            models.Index(fields=['project', 'id']),
            models.Index(fields=['project', 'was_cancelled']),
            models.Index(fields=['task', 'completed_by']),
            models.Index(fields=['task', 'ground_truth']),
            models.Index(fields=['task', 'was_cancelled']),
            models.Index(fields=['was_cancelled']),
        ]

    def created_ago(self):
        """Humanize date"""
        return timesince(self.created_at)

    def entities_num(self):
        res = self.result
        if isinstance(res, str):
            res = json.loads(res)
        if res is None:
            res = []

        return len(res)

    def has_permission(self, user: 'User') -> bool:  # noqa: F821
        mixin_has_permission = cast(bool, super().has_permission(user))

        user.project = self.project  # link for activity log
        return mixin_has_permission and self.project.has_permission(user)

    def increase_project_summary_counters(self):
        if hasattr(self.project, 'summary'):
            logger.debug(f'Increase project.summary counters from {self}')
            summary = self.project.summary
            summary.update_created_annotations_and_labels([self])

    def decrease_project_summary_counters(self):
        if hasattr(self.project, 'summary'):
            logger.debug(f'Decrease project.summary counters from {self}')
            summary = self.project.summary
            summary.remove_created_annotations_and_labels([self])

    def update_task(self):
        update_fields = ['updated_at']

        # updated_by
        request = get_current_request()
        if request:
            self.task.updated_by = request.user
            update_fields.append('updated_by')

        self.task.save(update_fields=update_fields)

    def save(self, *args, **kwargs):
        request = get_current_request()
        if request:
            self.updated_by = request.user
        result = super().save(*args, **kwargs)
        self.update_task()
        return result

    def delete(self, *args, **kwargs):
        result = super().delete(*args, **kwargs)
        self.update_task()
        self.on_delete_update_counters()
        return result

    def on_delete_update_counters(self):
        task = self.task
        logger.debug(f'Start updating counters for task {task.id}.')
        if self.was_cancelled:
            cancelled = task.annotations.all().filter(was_cancelled=True).count()
            Task.objects.filter(id=task.id).update(cancelled_annotations=cancelled)
            logger.debug(f'On delete updated cancelled_annotations for task {task.id}')
        else:
            total = task.annotations.all().filter(was_cancelled=False).count()
            Task.objects.filter(id=task.id).update(total_annotations=total)
            logger.debug(f'On delete updated total_annotations for task {task.id}')

        logger.debug(f'Update task stats for task={task}')
        task.update_is_labeled()
        Task.objects.filter(id=task.id).update(is_labeled=task.is_labeled)

        # remove annotation counters in project summary followed by deleting an annotation
        logger.debug('Remove annotation counters in project summary followed by deleting an annotation')
        self.decrease_project_summary_counters()


class TaskLock(models.Model):
    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='locks',
        help_text='Locked task',
    )
    expire_at = models.DateTimeField(_('expire_at'))
    unique_id = models.UUIDField(default=uuid.uuid4, null=True, blank=True, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='task_locks',
        on_delete=models.CASCADE,
        help_text='User who locked this task',
    )


class AnnotationDraft(models.Model):
    result = JSONField(_('result'), help_text='Draft result in JSON format')
    lead_time = models.FloatField(
        _('lead time'),
        blank=True,
        null=True,
        help_text='How much time it took to annotate the task',
    )
    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='drafts',
        blank=True,
        null=True,
        help_text='Corresponding task for this draft',
    )
    annotation = models.ForeignKey(
        'tasks.Annotation',
        on_delete=models.CASCADE,
        related_name='drafts',
        blank=True,
        null=True,
        help_text='Corresponding annotation for this draft',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='drafts',
        on_delete=models.CASCADE,
        help_text='User who created this draft',
    )
    was_postponed = models.BooleanField(
        _('was postponed'),
        default=False,
        help_text='User postponed this draft (clicked a forward button) in the label stream',
        db_index=True,
    )
    import_id = models.BigIntegerField(
        default=None,
        null=True,
        blank=True,
        db_index=True,
        help_text="Original draft ID that was at the import step or NULL if this draft wasn't imported",
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, help_text='Last update time')

    def created_ago(self):
        """Humanize date"""
        return timesince(self.created_at)

    def has_permission(self, user):
        user.project = self.task.project  # link for activity log
        return self.task.project.has_permission(user)

    def save(self, *args, **kwargs):
        with transaction.atomic():
            super().save(*args, **kwargs)
            project = self.task.project
            if hasattr(project, 'summary'):
                project.summary.update_created_labels_drafts([self])

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            project = self.task.project
            if hasattr(project, 'summary'):
                project.summary.remove_created_drafts_and_labels([self])
            super().delete(*args, **kwargs)


class Prediction(models.Model):
    """ML backend predictions"""

    result = JSONField('result', null=True, default=dict, help_text='Prediction result')
    score = models.FloatField(_('score'), default=None, help_text='Prediction score', null=True)
    model_version = models.TextField(_('model version'), default='', blank=True, null=True)
    model_run = models.ForeignKey(
        'ml_models.ModelRun',
        on_delete=models.CASCADE,
        related_name='predictions',
        null=True,
        help_text='A run of a ModelVersion that created the prediction.',
    )
    cluster = models.IntegerField(
        _('cluster'),
        default=None,
        help_text='Cluster for the current prediction',
        null=True,
    )
    neighbors = JSONField(
        'neighbors',
        null=True,
        blank=True,
        help_text='Array of task IDs of the closest neighbors',
    )
    mislabeling = models.FloatField(_('mislabeling'), default=0.0, help_text='Related task mislabeling score')

    task = models.ForeignKey('tasks.Task', on_delete=models.CASCADE, related_name='predictions')
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='predictions', null=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def created_ago(self):
        """Humanize date"""
        return timesince(self.created_at)

    def has_permission(self, user):
        if flag_set(
            'fflag_perf_back_lsdv_4695_update_prediction_query_to_use_direct_project_relation',
            user='auto',
        ):
            user.project = self.project  # link for activity log
            return self.project.has_permission(user)
        else:
            user.project = self.task.project  # link for activity log
            return self.task.project.has_permission(user)

    @classmethod
    def prepare_prediction_result(cls, result, project):
        """
        This function does the following logic of transforming "result" object:
        result is list -> use raw result as is
        result is dict -> put result under single "value" section
        result is string -> find first occurrence of single-valued tag (Choices, TextArea, etc.) and put string under corresponding single field (e.g. "choices": ["my_label"])  # noqa
        """
        if isinstance(result, list):
            # full representation of result
            for item in result:
                if not isinstance(item, dict):
                    raise ValidationError('Each item in prediction result should be dict')
            # TODO: check consistency with project.label_config
            return result

        elif isinstance(result, dict):
            # "value" from result
            # TODO: validate value fields according to project.label_config
            for tag, tag_info in project.get_parsed_config().items():
                tag_type = tag_info['type'].lower()
                if tag_type in result:
                    return [
                        {
                            'from_name': tag,
                            'to_name': ','.join(tag_info['to_name']),
                            'type': tag_type,
                            'value': result,
                        }
                    ]

        elif isinstance(result, (str, numbers.Integral)):
            # If result is of integral type, it could be a representation of data from single-valued control tags (e.g. Choices, Rating, etc.)
            for tag, tag_info in project.get_parsed_config().items():
                tag_type = tag_info['type'].lower()
                if tag_type in SINGLE_VALUED_TAGS and isinstance(result, SINGLE_VALUED_TAGS[tag_type]):
                    return [
                        {
                            'from_name': tag,
                            'to_name': ','.join(tag_info['to_name']),
                            'type': tag_type,
                            'value': {tag_type: [result]},
                        }
                    ]
        else:
            raise ValidationError(f'Incorrect format {type(result)} for prediction result {result}')

    def update_task(self):
        update_fields = ['updated_at']

        # updated_by
        request = get_current_request()
        if request:
            self.task.updated_by = request.user
            update_fields.append('updated_by')

        self.task.save(update_fields=update_fields)

    def save(self, *args, **kwargs):
        if self.project_id is None and self.task_id:
            logger.warning('project_id is not set for prediction, project_id being set in save method')
            self.project_id = Task.objects.only('project_id').get(pk=self.task_id).project_id

        # "result" data can come in different forms - normalize them to JSON
        if flag_set(
            'fflag_perf_back_lsdv_4695_update_prediction_query_to_use_direct_project_relation',
            user='auto',
        ):
            self.result = self.prepare_prediction_result(self.result, self.project)
        else:
            self.result = self.prepare_prediction_result(self.result, self.task.project)
        # set updated_at field of task to now()
        self.update_task()
        return super(Prediction, self).save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        result = super().delete(*args, **kwargs)
        # set updated_at field of task to now()
        self.update_task()
        return result

    class Meta:
        db_table = 'prediction'


@receiver(post_delete, sender=Task)
def update_all_task_states_after_deleting_task(sender, instance, **kwargs):
    """after deleting_task
    use update_tasks_states for all project
    but call only tasks_number_changed section
    """
    try:
        instance.project.update_tasks_states(
            maximum_annotations_changed=False,
            overlap_cohort_percentage_changed=False,
            tasks_number_changed=True,
        )
    except Exception as exc:
        logger.error('Error in update_all_task_states_after_deleting_task: ' + str(exc))


# =========== PROJECT SUMMARY UPDATES ===========


@receiver(pre_delete, sender=Task)
def remove_data_columns(sender, instance, **kwargs):
    """Reduce data column counters after removing task"""
    instance.decrease_project_summary_counters()


def _task_data_is_not_updated(update_fields):
    if update_fields and list(update_fields) == ['is_labeled']:
        return True


@receiver(pre_save, sender=Task)
def delete_project_summary_data_columns_before_updating_task(sender, instance, update_fields, **kwargs):
    """Before updating task fields - ensure previous info removed from project.summary"""
    if _task_data_is_not_updated(update_fields):
        # we don't need to update counters when other than task.data fields are updated
        return
    try:
        old_task = sender.objects.get(id=instance.id)
    except Task.DoesNotExist:
        # task just created - do nothing
        return
    old_task.decrease_project_summary_counters()


@receiver(post_save, sender=Task)
def update_project_summary_data_columns(sender, instance, created, update_fields, **kwargs):
    """Update task counters in project summary in case when new task has been created"""
    if _task_data_is_not_updated(update_fields):
        # we don't need to update counters when other than task.data fields are updated
        return
    instance.increase_project_summary_counters()


@receiver(pre_save, sender=Annotation)
def delete_project_summary_annotations_before_updating_annotation(sender, instance, **kwargs):
    """Before updating annotation fields - ensure previous info removed from project.summary"""
    try:
        old_annotation = sender.objects.get(id=instance.id)
    except Annotation.DoesNotExist:
        # annotation just created - do nothing
        return
    old_annotation.decrease_project_summary_counters()

    # update task counters if annotation changes it's was_cancelled status
    task = instance.task
    if old_annotation.was_cancelled != instance.was_cancelled:
        if instance.was_cancelled:
            task.cancelled_annotations = task.cancelled_annotations + 1
            task.total_annotations = task.total_annotations - 1
        else:
            task.cancelled_annotations = task.cancelled_annotations - 1
            task.total_annotations = task.total_annotations + 1
        task.update_is_labeled()

        Task.objects.filter(id=instance.task.id).update(
            is_labeled=task.is_labeled,
            total_annotations=task.total_annotations,
            cancelled_annotations=task.cancelled_annotations,
        )


@receiver(post_save, sender=Annotation)
def update_project_summary_annotations_and_is_labeled(sender, instance, created, **kwargs):
    """Update annotation counters in project summary"""
    instance.increase_project_summary_counters()

    # If annotation is changed, update task.is_labeled state
    logger.debug(f'Update task stats for task={instance.task}')
    if instance.was_cancelled:
        instance.task.cancelled_annotations = instance.task.annotations.all().filter(was_cancelled=True).count()
    else:
        instance.task.total_annotations = instance.task.annotations.all().filter(was_cancelled=False).count()
    instance.task.update_is_labeled()
    instance.task.save(update_fields=['is_labeled', 'total_annotations', 'cancelled_annotations'])
    logger.debug(f'Updated total_annotations and cancelled_annotations for {instance.task.id}.')


@receiver(pre_delete, sender=Prediction)
def remove_predictions_from_project(sender, instance, **kwargs):
    """Remove predictions counters"""
    instance.task.total_predictions = instance.task.predictions.all().count() - 1
    instance.task.save(update_fields=['total_predictions'])
    logger.debug(f'Updated total_predictions for {instance.task.id}.')


@receiver(post_save, sender=Prediction)
def save_predictions_to_project(sender, instance, **kwargs):
    """Add predictions counters"""
    instance.task.total_predictions = instance.task.predictions.all().count()
    instance.task.save(update_fields=['total_predictions'])
    logger.debug(f'Updated total_predictions for {instance.task.id}.')


# =========== END OF PROJECT SUMMARY UPDATES ===========


@receiver(post_save, sender=Annotation)
def delete_draft(sender, instance, **kwargs):
    task = instance.task
    query_args = {'task': task, 'annotation': instance}
    drafts = AnnotationDraft.objects.filter(**query_args)
    num_drafts = 0
    for draft in drafts:
        # Delete each draft individually because deleting
        # the whole queryset won't update `created_labels_drafts`
        try:
            draft.delete()
            num_drafts += 1
        except AnnotationDraft.DoesNotExist:
            continue
    logger.debug(f'{num_drafts} drafts removed from task {task} after saving annotation {instance}')


@receiver(post_save, sender=Annotation)
def update_ml_backend(sender, instance, **kwargs):
    if instance.ground_truth:
        return

    project = instance.project

    if hasattr(project, 'ml_backends') and project.min_annotations_to_start_training:
        annotation_count = Annotation.objects.filter(project=project).count()

        # start training every N annotation
        if annotation_count % project.min_annotations_to_start_training == 0:
            for ml_backend in project.ml_backends.all():
                ml_backend.train()


def update_task_stats(task, stats=('is_labeled',), save=True):
    """Update single task statistics:
        accuracy
        is_labeled
    :param task: Task to update
    :param stats: to update separate stats
    :param save: to skip saving in some cases
    :return:
    """
    logger.debug(f'Update stats {stats} for task {task}')
    if 'is_labeled' in stats:
        task.update_is_labeled(save=save)
    if save:
        task.save()


def bulk_update_stats_project_tasks(tasks, project=None):
    """bulk Task update accuracy
       ex: after change settings
       apply several update queries size of batch
       on updated Task objects
       in single transaction as execute sql
    :param tasks:
    :return:
    """
    # recalc accuracy
    if not tasks:
        # break if tasks is empty
        return
    # get project if it's not in params
    if project is None:
        project = tasks[0].project

    with transaction.atomic():
        use_overlap = project._can_use_overlap()
        maximum_annotations = project.maximum_annotations
        # update filters if we can use overlap
        if use_overlap:
            # finished tasks
            finished_tasks = tasks.filter(
                Q(total_annotations__gte=maximum_annotations) | Q(total_annotations__gte=1, overlap=1)
            )
            finished_tasks_ids = finished_tasks.values_list('id', flat=True)
            tasks.update(is_labeled=Q(id__in=finished_tasks_ids))

        else:
            # update objects without saving if we can't use overlap
            for task in tasks:
                update_task_stats(task, save=False)
            try:
                # start update query batches
                bulk_update(tasks, update_fields=['is_labeled'], batch_size=settings.BATCH_SIZE)
            except OperationalError:
                logger.error('Operational error while updating tasks: {exc}', exc_info=True)
                # try to update query batches one more time
                start_job_async_or_sync(
                    bulk_update,
                    tasks,
                    in_seconds=settings.BATCH_JOB_RETRY_TIMEOUT,
                    update_fields=['is_labeled'],
                    batch_size=settings.BATCH_SIZE,
                )


Q_finished_annotations = Q(was_cancelled=False) & Q(result__isnull=False)
Q_task_finished_annotations = Q(annotations__was_cancelled=False) & Q(annotations__result__isnull=False)
