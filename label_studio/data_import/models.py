"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import os
import uuid
from collections import Counter

import pandas as pd

try:
    import ujson as json
except:  # noqa: E722
    import json

from core.feature_flags import flag_set
from django.conf import settings
from django.db import models
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


def upload_name_generator(instance, filename):
    project = str(instance.project_id)
    project_dir = os.path.join(settings.MEDIA_ROOT, settings.UPLOAD_DIR, project)
    os.makedirs(project_dir, exist_ok=True)
    path = settings.UPLOAD_DIR + '/' + project + '/' + str(uuid.uuid4())[0:8] + '-' + filename
    return path


class FileUpload(models.Model):
    user = models.ForeignKey('users.User', related_name='file_uploads', on_delete=models.CASCADE)
    project = models.ForeignKey('projects.Project', related_name='file_uploads', on_delete=models.CASCADE)
    file = models.FileField(upload_to=upload_name_generator)

    def has_permission(self, user):
        user.project = self.project  # link for activity log
        return self.project.has_permission(user)

    @property
    def filepath(self):
        return self.file.name

    @property
    def url(self):
        if settings.HOSTNAME and settings.CLOUD_FILE_STORAGE_ENABLED:
            if flag_set('ff_back_dev_2915_storage_nginx_proxy_26092022_short', self.project.organization.created_by):
                return self.file.url
            else:
                return settings.HOSTNAME + self.file.url
        elif settings.FORCE_SCRIPT_NAME:
            return settings.FORCE_SCRIPT_NAME + '/' + self.file.url.lstrip('/')
        else:
            return self.file.url

    @property
    def format(self):
        filepath = self.file.name
        file_format = None
        try:
            file_format = os.path.splitext(filepath)[-1]
        except:  # noqa: E722
            pass
        finally:
            logger.debug('Get file format ' + str(file_format))
        return file_format

    @property
    def content(self):
        # cache file body
        if hasattr(self, '_file_body'):
            body = getattr(self, '_file_body')
        else:
            body = self.file.read().decode('utf-8')
            setattr(self, '_file_body', body)
        return body

    def read_tasks_list_from_csv(self, sep=','):
        logger.debug('Read tasks list from CSV file {}'.format(self.file.name))
        tasks = pd.read_csv(self.file.open(), sep=sep).fillna('').to_dict('records')
        tasks = [{'data': task} for task in tasks]
        return tasks

    def read_tasks_list_from_tsv(self):
        return self.read_tasks_list_from_csv('\t')

    def read_tasks_list_from_txt(self):
        logger.debug('Read tasks list from text file {}'.format(self.file.name))
        lines = self.content.splitlines()
        tasks = [{'data': {settings.DATA_UNDEFINED_NAME: line}} for line in lines]
        return tasks

    def read_tasks_list_from_json(self):
        logger.debug('Read tasks list from JSON file {}'.format(self.file.name))

        raw_data = self.content
        # Python 3.5 compatibility fix https://docs.python.org/3/whatsnew/3.6.html#json
        try:
            tasks = json.loads(raw_data)
        except TypeError:
            tasks = json.loads(raw_data.decode('utf8'))
        if isinstance(tasks, dict):
            tasks = [tasks]
        tasks_formatted = []
        for i, task in enumerate(tasks):
            if not task.get('data'):
                task = {'data': task}
            if not isinstance(task['data'], dict):
                raise ValidationError('Task item should be dict')
            tasks_formatted.append(task)
        return tasks_formatted

    def read_task_from_hypertext_body(self):
        logger.debug('Read 1 task from hypertext file {}'.format(self.file.name))
        body = self.content
        tasks = [{'data': {settings.DATA_UNDEFINED_NAME: body}}]
        return tasks

    def read_task_from_uploaded_file(self):
        logger.debug('Read 1 task from uploaded file {}'.format(self.file.name))
        if settings.CLOUD_FILE_STORAGE_ENABLED:
            tasks = [{'data': {settings.DATA_UNDEFINED_NAME: self.file.name}}]
        else:
            tasks = [{'data': {settings.DATA_UNDEFINED_NAME: self.url}}]
        return tasks

    @property
    def format_could_be_tasks_list(self):
        return self.format in ('.csv', '.tsv', '.txt')

    def read_tasks(self, file_as_tasks_list=True):
        file_format = self.format
        try:
            # file as tasks list
            if file_format == '.csv' and file_as_tasks_list:
                tasks = self.read_tasks_list_from_csv()
            elif file_format == '.tsv' and file_as_tasks_list:
                tasks = self.read_tasks_list_from_tsv()
            elif file_format == '.txt' and file_as_tasks_list:
                tasks = self.read_tasks_list_from_txt()
            elif file_format == '.json':
                tasks = self.read_tasks_list_from_json()

            # otherwise - only one object tag should be presented in label config
            elif not self.project.one_object_in_label_config:
                raise ValidationError(
                    'Your label config has more than one data key and direct file upload supports only '
                    'one data key. To import data with multiple data keys, use a JSON or CSV file.'
                )

            # file as a single asset
            elif file_format in ('.html', '.htm', '.xml'):
                tasks = self.read_task_from_hypertext_body()
            else:
                tasks = self.read_task_from_uploaded_file()

        except Exception as exc:
            raise ValidationError('Failed to parse input file ' + self.file.name + ': ' + str(exc))
        return tasks

    @classmethod
    def load_tasks_from_uploaded_files(
        cls, project, file_upload_ids=None, formats=None, files_as_tasks_list=True, trim_size=None
    ):
        tasks = []
        fileformats = []
        common_data_fields = set()

        # scan all files
        file_uploads = FileUpload.objects.filter(project=project)
        if file_upload_ids:
            file_uploads = file_uploads.filter(id__in=file_upload_ids)
        for file_upload in file_uploads:
            file_format = file_upload.format
            if formats and file_format not in formats:
                continue
            new_tasks = file_upload.read_tasks(files_as_tasks_list)
            for task in new_tasks:
                task['file_upload_id'] = file_upload.id

            new_data_fields = set(iter(new_tasks[0]['data'].keys())) if len(new_tasks) > 0 else set()
            if not common_data_fields:
                common_data_fields = new_data_fields
            elif not common_data_fields.intersection(new_data_fields):
                raise ValidationError(
                    _old_vs_new_data_keys_inconsistency_message(
                        new_data_fields, common_data_fields, file_upload.file.name
                    )
                )
            else:
                common_data_fields &= new_data_fields

            tasks += new_tasks
            fileformats.append(file_format)

            if trim_size is not None:
                if len(tasks) > trim_size:
                    break

        return tasks, dict(Counter(fileformats)), common_data_fields


def _old_vs_new_data_keys_inconsistency_message(new_data_keys, old_data_keys, current_file):
    new_data_keys_list = ','.join(new_data_keys)
    old_data_keys_list = ','.join(old_data_keys)
    common_prefix = "You're trying to import inconsistent data:\n"
    if new_data_keys_list == old_data_keys_list:
        return ''
    elif new_data_keys_list == settings.DATA_UNDEFINED_NAME:
        return (
            common_prefix + 'uploading a single file {0} '
            'clashes with data key(s) found from other files:\n"{1}"'.format(current_file, old_data_keys_list)
        )
    elif old_data_keys_list == settings.DATA_UNDEFINED_NAME:
        return (
            common_prefix + 'uploading tabular data from {0} with data key(s) {1}, '
            'clashes with other raw binary files (images, audios, etc.)'.format(current_file, new_data_keys_list)
        )
    else:
        return (
            common_prefix + 'uploading tabular data from "{0}" with data key(s) "{1}", '
            'clashes with data key(s) found from other files:\n"{2}"'.format(
                current_file, new_data_keys_list, old_data_keys_list
            )
        )
