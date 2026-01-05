"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import os
import uuid
from collections import Counter

import ijson
import pandas as pd

try:
    import ujson as json
except:  # noqa: E722
    import json

from core.utils.exceptions import extract_message
from django.conf import settings
from django.db import models
from django.utils.functional import cached_property
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

    @cached_property
    def filepath(self):
        return self.file.name

    @cached_property
    def file_name(self):
        return os.path.basename(self.file.name)

    @property
    def url(self):
        if settings.FORCE_SCRIPT_NAME and not (settings.HOSTNAME and settings.CLOUD_FILE_STORAGE_ENABLED):
            return settings.FORCE_SCRIPT_NAME + '/' + self.file.url.lstrip('/')
        else:
            return self.file.url

    @property
    def format(self):
        file_format = None
        try:
            file_format = os.path.splitext(self.filepath)[-1]
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

    def _detect_csv_separator(self):
        """
        Detect the CSV separator by analyzing the first line of the file.

        This method implements a reliable heuristic:
        1. If semicolons are more frequent than commas in the first line, use semicolon
        2. Otherwise, default to comma

        Returns:
            str: The detected separator (',' or ';')
        """
        try:
            # Read the first line to analyze separators
            with self.file.open() as f:
                first_line = f.readline()
                if isinstance(first_line, bytes):
                    first_line = first_line.decode('utf-8')

                # Count potential separators
                comma_count = first_line.count(',')
                semicolon_count = first_line.count(';')

                # Use semicolon if it's clearly indicated by higher frequency
                if semicolon_count > comma_count:
                    logger.debug(
                        f'Detected semicolon separator (found {semicolon_count} semicolons vs {comma_count} commas)'
                    )
                    return ';'
                else:
                    logger.debug(
                        f'Using default comma separator (found {comma_count} commas vs {semicolon_count} semicolons)'
                    )
                    return ','
        except Exception as e:
            logger.warning(f'Failed to detect CSV separator, defaulting to comma: {e}')
            return ','

    def read_tasks_list_from_csv(self):
        """
        Read tasks from a CSV file with automatic separator detection.

        The separator is automatically detected by analyzing the first line:
        - If semicolons are clearly indicated (more frequent than commas), use semicolon
        - Otherwise, use the default comma separator

        Returns:
            list: List of tasks in the format [{'data': {...}}, ...]
        """
        logger.debug('Read tasks list from CSV file {}'.format(self.filepath))
        separator = self._detect_csv_separator()
        tasks = pd.read_csv(self.file.open(), sep=separator).fillna('').to_dict('records')
        tasks = [{'data': task} for task in tasks]
        return tasks

    def read_tasks_list_from_tsv(self):
        """
        Read tasks from a TSV (tab-separated values) file.

        Returns:
            list: List of tasks in the format [{'data': {...}}, ...]
        """
        logger.debug('Read tasks list from TSV file {}'.format(self.filepath))
        tasks = pd.read_csv(self.file.open(), sep='\t').fillna('').to_dict('records')
        tasks = [{'data': task} for task in tasks]
        return tasks

    def read_tasks_list_from_txt(self):
        logger.debug('Read tasks list from text file {}'.format(self.filepath))
        lines = self.content.splitlines()
        tasks = [{'data': {settings.DATA_UNDEFINED_NAME: line}} for line in lines]
        return tasks

    def read_tasks_list_from_json(self):
        logger.debug('Read tasks list from JSON file {}'.format(self.filepath))

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

    def read_tasks_list_from_json_streaming(self, batch_size=100):
        logger.debug('Read tasks list from JSON file streaming {}'.format(self.filepath))

        try:
            with self.file.open('rb') as file_handle:
                # Peek a small prefix to detect top-level container ('[' array or '{' object)
                sniff = file_handle.read(4096) or b''
                # Find first non-whitespace byte
                first_byte = None
                for b in sniff:
                    if b not in (0x20, 0x09, 0x0A, 0x0D):  # space, tab, lf, cr
                        first_byte = b
                        break

                # Rewind after sniffing
                file_handle.seek(0)

                batch = []

                if first_byte == ord('['):
                    # Stream array items one-by-one
                    # use_float=True prevents Decimal objects which cause JSON serialization issues downstream
                    for task in ijson.items(file_handle, 'item', use_float=True):
                        formatted_task = self._format_task_for_json_streaming(task)
                        batch.append(formatted_task)
                        if len(batch) >= batch_size:
                            yield batch
                            batch = []

                elif first_byte == ord('{'):
                    # Single JSON object: parse once and yield a single-item batch
                    raw_data = file_handle.read()
                    try:
                        task_data = json.loads(raw_data)
                    except TypeError:
                        task_data = json.loads(raw_data.decode('utf8'))
                    formatted_task = self._format_task_for_json_streaming(task_data)
                    batch.append(formatted_task)

                else:
                    # Unknown/invalid JSON structure
                    raise ValidationError('Unsupported or invalid JSON structure')

                # Yield remaining tasks if any
                if batch:
                    yield batch

        except Exception as exc:
            raise ValidationError(f'Failed to parse JSON file {self.file_name}: {extract_message(exc)}')

    def _format_task_for_json_streaming(self, task):
        """Format task data for JSON streaming consistency with read_tasks_list_from_json"""
        # Handle different task types as in the original read_tasks_list_from_json method
        if isinstance(task, dict):
            if not task.get('data'):
                task = {'data': task}
        else:
            # If task is not a dict (e.g., list), wrap it in {'data': task}
            task = {'data': task}

        if not isinstance(task['data'], dict):
            raise ValidationError('Task item should be dict')
        return task

    def read_task_from_hypertext_body(self):
        logger.debug('Read 1 task from hypertext file {}'.format(self.filepath))
        body = self.content
        tasks = [{'data': {settings.DATA_UNDEFINED_NAME: body}}]
        return tasks

    def read_task_from_uploaded_file(self):
        logger.debug('Read 1 task from uploaded file {}'.format(self.filepath))
        if settings.CLOUD_FILE_STORAGE_ENABLED:
            tasks = [{'data': {settings.DATA_UNDEFINED_NAME: self.filepath}}]
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
            raise ValidationError('Failed to parse input file ' + self.file_name + ': ' + extract_message(exc))
        return tasks

    def read_tasks_streaming(self, file_as_tasks_list=True, batch_size=100):
        """Streaming version of read_tasks that yields tasks in batches for memory efficiency"""
        file_format = self.format

        try:
            # For JSON files, use streaming JSON parser
            if file_format == '.json':
                for batch in self.read_tasks_list_from_json_streaming(batch_size):
                    yield batch

            # For other file types, use existing methods but yield in batches
            else:
                # Use existing non-streaming methods for non-JSON files
                if file_format == '.csv' and file_as_tasks_list:
                    tasks = self.read_tasks_list_from_csv()
                elif file_format == '.tsv' and file_as_tasks_list:
                    tasks = self.read_tasks_list_from_tsv()
                elif file_format == '.txt' and file_as_tasks_list:
                    tasks = self.read_tasks_list_from_txt()
                elif not self.project.one_object_in_label_config:
                    raise ValidationError(
                        'Your label config has more than one data key and direct file upload supports only '
                        'one data key. To import data with multiple data keys, use a JSON or CSV file.'
                    )
                elif file_format in ('.html', '.htm', '.xml'):
                    tasks = self.read_task_from_hypertext_body()
                else:
                    tasks = self.read_task_from_uploaded_file()

                # Yield tasks in batches
                for i in range(0, len(tasks), batch_size):
                    batch = tasks[i : i + batch_size]
                    yield batch

        except Exception as exc:
            raise ValidationError('Failed to parse input file ' + self.file_name + ': ' + extract_message(exc))

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

    @classmethod
    def load_tasks_from_uploaded_files_streaming(
        cls, project, file_upload_ids=None, formats=None, files_as_tasks_list=True, batch_size=5000
    ):
        """Stream tasks from uploaded files in batches to reduce memory usage using true streaming for JSON files"""
        fileformats = []
        common_data_fields = set()
        accumulated_batch = []
        total_yielded = 0

        # scan all files
        file_uploads = FileUpload.objects.filter(project=project)
        if file_upload_ids:
            file_uploads = file_uploads.filter(id__in=file_upload_ids)

        for file_upload in file_uploads:
            file_format = file_upload.format
            if formats and file_format not in formats:
                continue

            fileformats.append(file_format)

            # Use streaming method for reading tasks
            for task_batch in file_upload.read_tasks_streaming(files_as_tasks_list, batch_size):
                # Add file_upload_id to each task in the batch
                for task in task_batch:
                    task['file_upload_id'] = file_upload.id

                # Validate data fields consistency for first batch from each file
                if task_batch:
                    new_data_fields = set(task_batch[0]['data'].keys())
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

                # Add tasks to accumulated batch
                accumulated_batch.extend(task_batch)

                # Yield accumulated batch when it reaches the target size
                while len(accumulated_batch) >= batch_size:
                    batch_to_yield = accumulated_batch[:batch_size]
                    accumulated_batch = accumulated_batch[batch_size:]

                    yield batch_to_yield, dict(Counter(fileformats)), common_data_fields
                    total_yielded += len(batch_to_yield)

        # Yield remaining tasks if any
        if accumulated_batch:
            yield accumulated_batch, dict(Counter(fileformats)), common_data_fields
            total_yielded += len(accumulated_batch)

        # If no tasks were yielded, return empty batch with metadata
        if total_yielded == 0:
            yield [], dict(Counter(fileformats)), common_data_fields


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
