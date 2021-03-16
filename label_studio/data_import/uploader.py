"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import io
import csv
import ssl
import uuid
import pickle
import logging
try:
    import ujson as json
except:
    import json
import pandas as pd
import numpy as np

from dateutil import parser
from rest_framework.exceptions import ValidationError
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from urllib.request import urlopen

from .models import FileUpload

logger = logging.getLogger(__name__)
csv.field_size_limit(131072 * 10)


def is_binary(f):
    return isinstance(f, (io.RawIOBase, io.BufferedIOBase))


def csv_generate_header(file):
    """ Generate column names for headless csv file """
    file.seek(0)
    names = []
    line = file.readline()

    num_columns = len(line.split(b',' if isinstance(line, bytes) else ','))
    for i in range(num_columns):
        names.append('column' + str(i+1))
    file.seek(0)
    return names


def check_max_task_number(tasks):
    # max tasks
    if len(tasks) > settings.TASKS_MAX_NUMBER:
        raise ValidationError(f'Maximum task number is {settings.TASKS_MAX_NUMBER}, '
                              f'current task number is {len(tasks)}')


def check_file_sizes_and_number(files):
    total = sum([file.size for _, file in files.items()])

    if total >= settings.TASKS_MAX_FILE_SIZE:
        raise ValidationError(f'Maximum total size of all files is {settings.TASKS_MAX_FILE_SIZE} bytes, '
                              f'current size is {total} bytes')


def create_file_upload(request, project, file):
    instance = FileUpload(user=request.user, project=project, file=file)
    instance.save()
    return instance


def load_tasks(request, project):
    """ Load tasks from different types of request.data / request.files
    """
    file_upload_ids, found_formats, data_keys = [], [], set()
    could_be_tasks_lists = False
    # take tasks from request FILES
    if len(request.FILES):
        check_file_sizes_and_number(request.FILES)
        for filename, file in request.FILES.items():
            file_upload = create_file_upload(request, project, file)
            if file_upload.format_could_be_tasks_list:
                could_be_tasks_lists = True
            file_upload_ids.append(file_upload.id)
        tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)

    # take tasks from url address
    elif 'application/x-www-form-urlencoded' in request.content_type:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        try:
            url = request.data['url']
            filename = url.rsplit('/', 1)[-1]
            with urlopen(url, context=ctx) as file:
                # check size
                meta = file.info()
                file.size = int(meta.get("Content-Length"))
                file.urlopen = True
                check_file_sizes_and_number({url: file})
                file_content = file.read()
                if isinstance(file_content, str):
                    file_content = file_content.encode()
                file_upload = create_file_upload(request, project, SimpleUploadedFile(filename, file_content))
                file_upload_ids.append(file_upload.id)
                tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)

        except ValidationError as e:
            raise e
        except Exception as e:
            raise ValidationError(str(e))

    # take one task from request DATA
    elif 'application/json' in request.content_type and isinstance(request.data, dict):
        tasks = [request.data]

        # take many tasks from request DATA
    elif 'application/json' in request.content_type and isinstance(request.data, list):
        tasks = request.data

    # incorrect data source
    else:
        raise ValidationError('load_tasks: No data found in DATA or in FILES')

    # check is data root is list
    if not isinstance(tasks, list):
        raise ValidationError('load_tasks: Data root must be list')

    # empty tasks error
    if not tasks:
        raise ValidationError('load_tasks: No tasks added')

    check_max_task_number(tasks)
    return tasks, file_upload_ids, could_be_tasks_lists, found_formats, list(data_keys)
