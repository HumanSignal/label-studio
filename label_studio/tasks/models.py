"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging
import os
import datetime

from urllib.parse import urljoin

from django.conf import settings
from django.db import models, connection
from django.db.models import Q, F, When, Count, Case, Subquery, OuterRef, Value
from django.db.models.functions import Coalesce
from django.db.models.signals import post_delete, post_save, pre_delete
from django.db.utils import ProgrammingError, OperationalError
from django.utils.translation import gettext_lazy as _
from django.db.models import JSONField
from django.urls import reverse
from django.utils.timesince import timesince
from django.utils.timezone import now
from django.dispatch import receiver, Signal

from model_utils import FieldTracker

from core.utils.common import find_first_one_to_one_related_field_by_prefix
from core.utils.common import string_is_url
from core.utils.params import get_env
from data_manager.managers import PreparedTaskManager

logger = logging.getLogger(__name__)


class Task(models.Model):
    """ Business tasks from project
    """
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID', db_index=True)
    data = JSONField('data', null=False, help_text='User imported or uploaded data for a task. Data is formatted according to '
                                                   'the project label config. You can find examples of data for your project '
                                                   'on the Import page in the Label Studio Data Manager UI.')
    meta = JSONField('meta', null=True, default=dict,
                     help_text='Meta is user imported (uploaded) data and can be useful as input for an ML '
                               'Backend for embeddings, advanced vectors, and other info. It is passed to '
                               'ML during training/predicting steps.')
    project = models.ForeignKey('projects.Project', related_name='tasks', on_delete=models.CASCADE, null=True,
                                help_text='Project ID for this task')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Time a task was created')
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, help_text='Last time a task was updated')
    is_labeled = models.BooleanField(_('is_labeled'), default=False,
                                     help_text='True if the number of annotations for this task is greater than or equal '
                                               'to the number of maximum_completions for the project')
    overlap = models.IntegerField(_('overlap'), default=1, db_index=True,
                                  help_text='Number of distinct annotators that processed the current task')
    file_upload = models.ForeignKey(
        'data_import.FileUpload', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks',
        help_text='Uploaded file used as data source for this task'
    )
    updates = ['is_labeled']

    objects = models.Manager()  # task manager by default
    prepared = PreparedTaskManager()  # task manager with filters, ordering, etc for data_manager app

    @property
    def file_upload_name(self):
        return os.path.basename(self.file_upload.file.name)

    @classmethod
    def get_locked_by(cls, user, project):
        """Retrieve the task locked by specified user. Returns None if the specified user didn't lock anything."""
        lock = TaskLock.objects.filter(user=user, expire_at__gt=now(), task__project=project).first()
        if lock:
            return lock.task

    def has_lock(self):
        """Check whether current task has been locked by some user"""
        num_locks = self.num_locks
        num_annotations = self.annotations.filter(ground_truth=False).count()
        num = num_locks + num_annotations
        if num > self.overlap:
            logger.error(f"Num takes={num} > overlap={self.overlap} for task={self.id} - it's a bug")
        return num >= self.overlap

    @property
    def num_locks(self):
        return self.locks.filter(expire_at__gt=now()).count()

    def get_lock_ttl(self):
        if settings.TASK_LOCK_TTL is not None:
            return settings.TASK_LOCK_TTL
        avg_lead_time = self.project.annotations_lead_time()
        return 3 * int(avg_lead_time) if avg_lead_time is not None else settings.TASK_LOCK_DEFAULT_TTL

    def clear_expired_locks(self):
        self.locks.filter(expire_at__lt=now()).delete()

    def set_lock(self, user):
        """Lock current task by specified user. Lock lifetime is set by `expire_in_secs`"""
        num_locks = self.num_locks
        if num_locks < self.overlap:
            expire_at = now() + datetime.timedelta(seconds=self.get_lock_ttl())
            TaskLock.objects.create(task=self, user=user, expire_at=expire_at)
            logger.debug(f'User={user} acquires a lock for the task={self}')
        else:
            logger.error(
                f"Current number of locks for task {self.id} is {num_locks}, but overlap={self.overlap}: "
                f"that's a bug because this task should not be taken in a label stream (task should be locked)")
        self.clear_expired_locks()

    def release_lock(self, user=None):
        """Release lock for the task.
        If user specified, it checks whether lock is released by the user who previously has locked that task"""

        if user is not None:
            self.locks.filter(user=user).delete()
        else:
            self.locks.all().delete()
        self.clear_expired_locks()

    def get_storage_link(self):
        # TODO: how to get neatly any storage class here?
        return find_first_one_to_one_related_field_by_prefix(self, 'io_storages_')

    def resolve_uri(self, task_data, proxy=True):
        if proxy and self.project.task_data_login and self.project.task_data_password:
            protected_data = {}
            for key, value in task_data.items():
                if isinstance(value, str) and string_is_url(value):
                    path = reverse('projects-file-proxy', kwargs={'pk': self.project.pk}) + '?url=' + value
                    value = urljoin(settings.HOSTNAME, path)
                protected_data[key] = value
            return protected_data
        else:
            # Try resolve URLs via storage associated with that task
            storage = self._get_task_storage()
            if storage:
                return storage.resolve_task_data_uri(task_data)
            return task_data

    def _get_task_storage(self):
        # maybe task has storage link
        storage_link = self.get_storage_link()
        if storage_link:
            return storage_link.storage

        # or try global storage settings (only s3 for now)
        elif get_env('USE_DEFAULT_STORAGE', default=False, is_bool=True):
            # TODO: this is used to access global environment storage settings.
            # We may use more than one and non-default S3 storage (like GCS, Azure)
            from io_storages.s3.models import S3ImportStorage
            return S3ImportStorage()

    def update_is_labeled(self):
        """Set is_labeled field according to annotations*.count > overlap
        """
        n = self.annotations.filter(Q_finished_annotations & Q(ground_truth=False)).count()
        # self.is_labeled = n >= self.project.maximum_annotations
        self.is_labeled = n >= self.overlap

    def reset_updates(self):
        """ Reset updates to default from model for one task.
            We need it in duplicate project or total deletion of annotations
        """
        for field in Task._meta.fields:
            if field.name in Task.updates:
                setattr(self, field.name, field.default)

    @staticmethod
    def bulk_reset_updates(project):
        """ Bulk reset updates to default, it's a fast way to reset all tasks in project
        """
        for field in Task._meta.fields:
            if field.name in Task.updates:
                project.tasks.update(**{field.name: field.default})

    @staticmethod
    def bulk_update_is_labeled(project):
        """ Fast way to update only is_labeled.
            Prefer to use Django 2.2 bulk_update(), see bulk_update_field('is_labeled')

            get all project.tasks as subquery
            Subquery(
                w coalesce get the first non-null value (count(annotations), or 0)
                make condition
                add temp field pre_is_labeled as condtion values
            )
            update all tasks with Subquery
        """
        tasks = project.tasks.filter(pk=OuterRef('pk'))
        count = Coalesce(Count(
            'annotations', filter=Q(annotations__was_cancelled=False) & Q(annotations__ground_truth=False)), Value(0))
        condition = Case(
            When(overlap__lte=count, then=Value(True)),
            default=Value(False),
            output_field=models.BooleanField(null=False)
        )
        results = tasks.annotate(pre_is_labeled=condition).values('pre_is_labeled')
        project.tasks.update(is_labeled=Subquery(results))

    def delete_url(self):
        return reverse('tasks:task-delete', kwargs={'pk': self.pk})

    def completion_for_ground_truth(self):
        """ 1 Get ground_truth completion if task has it, else
            2 Get first completion created by owner of project,
            3 Or the first of somebody if no owner's items.
            It's used for ground_truth selection right on data manager page
        """
        if not self.annotations.exists():
            return None

        # ground_truth already exist
        ground_truth_annotations = self.annotations.filter(ground_truth=True)
        if ground_truth_annotations.exists():
            return ground_truth_annotations.first()

        # owner annotation
        owner_annotations = self.annotations.filter(completed_by=self.project.created_by)
        if owner_annotations.count() > 0:
            return owner_annotations.first()

        # annotator annotation
        return self.annotations.first()

    class Meta:
        db_table = 'task'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['project', 'is_labeled']),
            models.Index(fields=['id', 'overlap'])
        ]


pre_bulk_create = Signal(providing_args=["objs", "batch_size"])
post_bulk_create = Signal(providing_args=["objs", "batch_size"])


class AnnotationManager(models.Manager):

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


class Annotation(models.Model):
    """ Annotations & Labeling results
    """
    objects = AnnotationManager()
    tracker = FieldTracker(fields=['ground_truth', 'result'])

    state = JSONField('state', null=True, default=dict, help_text='Editor state (system data)')
    result = JSONField('result', null=True, default=None, help_text='The main value of annotator work - '
                                                                    'labeling result in JSON format')

    task = models.ForeignKey('tasks.Task', on_delete=models.CASCADE, related_name='annotations', null=True,
                             help_text='Corresponding task for this annotation')
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="annotations", on_delete=models.SET_NULL,
                                     null=True, help_text='User ID of the person who created this annotation')
    was_cancelled = models.BooleanField(_('was cancelled'), default=False, help_text='User skipped the task')
    ground_truth = models.BooleanField(_('ground_truth'), default=False, help_text='This annotation is a Ground Truth (ground_truth)')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, help_text='Last updated time')
    lead_time = models.FloatField(_('lead time'), null=True, default=None, help_text='How much time it took to annotate the task')
    prediction = JSONField(
        _('prediction'),
        null=True, default=dict, help_text='Prediction viewed at the time of annotation')
    result_count = models.IntegerField(_('result count'), default=0,
                                       help_text='Results inside of annotation counter')
    
    class Meta:
        db_table = 'task_completion'
        indexes = [
            models.Index(fields=['task', 'ground_truth'])
        ]

    def created_ago(self):
        """ Humanize date """
        return timesince(self.created_at)

    def entities_num(self):
        res = self.result
        if isinstance(res, str):
            res = json.loads(res)
        if res is None:
            res = []

        return len(res)


class TaskLock(models.Model):
    task = models.ForeignKey(
        'tasks.Task', on_delete=models.CASCADE, related_name='locks', help_text='Locked task')
    expire_at = models.DateTimeField(_('expire_at'))
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name='task_locks', on_delete=models.CASCADE,
        help_text='User who locked this task')


class AnnotationDraft(models.Model):
    result = JSONField(
        _('result'),
        help_text='Draft result in JSON format')
    lead_time = models.FloatField(
        _('lead time'),
        help_text='How much time it took to annotate the task')
    task = models.ForeignKey(
        'tasks.Task', on_delete=models.CASCADE, related_name='drafts', blank=True, null=True,
        help_text='Corresponding task for this draft')
    annotation = models.ForeignKey(
        'tasks.Annotation', on_delete=models.CASCADE, related_name='drafts', blank=True, null=True,
        help_text='Corresponding annotation for this draft')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name='drafts', on_delete=models.CASCADE,
        help_text='User who created this draft')

    created_at = models.DateTimeField(_('created at'), auto_now_add=True, help_text='Creation time')
    updated_at = models.DateTimeField(_('updated at'), auto_now=True, help_text='Last update time')

    def created_ago(self):
        """ Humanize date """
        return timesince(self.created_at)


class Prediction(models.Model):
    """ ML backend predictions
    """
    result = JSONField('result', null=True, default=dict, help_text='Prediction result')
    score = models.FloatField(_('score'), default=None, help_text='Prediction score', null=True)
    model_version = models.TextField(_('model version'), default='', blank=True, null=True)
    cluster = models.IntegerField(_('cluster'), default=None, help_text='Cluster for the current prediction', null=True)
    neighbors = JSONField('neighbors', null=True, blank=True, help_text='Array of task IDs of the closest neighbors')
    mislabeling = models.FloatField(_('mislabeling'), default=0.0, help_text='Related task mislabeling score')

    task = models.ForeignKey('tasks.Task', on_delete=models.CASCADE, related_name='predictions')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def created_ago(self):
        """ Humanize date """
        return timesince(self.created_at)

    class Meta:
        db_table = 'prediction'


@receiver(post_delete, sender=Task)
def update_all_task_states_after_deleting_task(sender, instance, **kwargs):
    """ after deleting_task
        use update_tasks_states for all project
        but call only tasks_number_changed section
    """
    try:
        instance.project.update_tasks_states(
            maximum_annotations_changed=False,
            overlap_cohort_percentage_changed=False,
            tasks_number_changed=True
        )
    except Exception as exc:
        logger.error('Error in update_all_task_states_after_deleting_task: ' + str(exc))


@receiver(pre_delete, sender=Task)
def release_task_lock_before_delete(sender, instance, **kwargs):
    if instance is not None:
        instance.release_lock()


@receiver(pre_delete, sender=Task)
def remove_data_columns(sender, instance, **kwargs):
    """Reduce data column counters afer removing task"""
    task = instance
    if hasattr(task.project, 'summary'):
        summary = task.project.summary
        summary.remove_data_columns([task])


@receiver(post_save, sender=Task)
def update_project_summary_data_columns(sender, instance, created, update_fields, **kwargs):
    """Update task counters in project summary"""
    if hasattr(instance.project, 'summary') and (created or (update_fields and 'data' in update_fields)):
        summary = instance.project.summary
        summary.update_data_columns([instance])


@receiver(post_save, sender=Annotation)
def update_project_summary_annotations_and_is_labeled(sender, instance, created, **kwargs):
    """Update annotation counters in project summary"""
    if hasattr(instance.task.project, 'summary'):
        summary = instance.task.project.summary
        summary.update_created_annotations_and_labels([instance])

    # If new annotation created, update task.is_labeled state
    if created:
        logger.debug(f'Update task stats for task={instance.task}')
        instance.task.update_is_labeled()
        instance.task.save(update_fields=['is_labeled'])


@receiver(pre_delete, sender=Annotation)
def remove_project_summary_annotations_and_is_labeled(sender, instance, **kwargs):
    """Remove annotation counters in project summary followed by deleting an annotation"""
    if hasattr(instance.task.project, 'summary'):
        logger.debug(f'Remove created annotations and labels for {instance.task}')
        summary = instance.task.project.summary
        summary.remove_created_annotations_and_labels([instance])


@receiver(post_delete, sender=Annotation)
def update_is_labeled_after_removing_annotation(sender, instance, **kwargs):
    # Update task.is_labeled state
    logger.debug(f'Update task stats for task={instance.task}')
    instance.task.update_is_labeled()
    instance.task.save()


@receiver(post_save, sender=Annotation)
def delete_draft(sender, instance, **kwargs):
    task = instance.task
    query_args = {'task': instance.task, 'annotation': instance}
    if instance.completed_by is not None:
        query_args['user'] = instance.completed_by
    drafts = AnnotationDraft.objects.filter(**query_args)
    num_drafts = drafts.count()
    drafts.delete()
    logger.debug(f'{num_drafts} drafts removed from task {task} after saving annotation {instance}')


Q_finished_annotations = Q(was_cancelled=False) & Q(result__isnull=False)
Q_task_finished_annotations = Q(annotations__was_cancelled=False) & \
                              Q(annotations__result__isnull=False)
