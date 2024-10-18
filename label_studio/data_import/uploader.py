"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import csv
import io
import logging
import mimetypes
import os

try:
    import ujson as json
except:  # noqa: E722
    import json

from core.utils.common import timeit
from core.utils.io import ssrf_safe_get
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.exceptions import ValidationError

from .models import FileUpload

logger = logging.getLogger(__name__)
csv.field_size_limit(131072 * 10)


def is_binary(f):
    return isinstance(f, (io.RawIOBase, io.BufferedIOBase))


def csv_generate_header(file):
    """Generate column names for headless csv file"""
    file.seek(0)
    names = []
    line = file.readline()

    num_columns = len(line.split(b',' if isinstance(line, bytes) else ','))
    for i in range(num_columns):
        names.append('column' + str(i + 1))
    file.seek(0)
    return names


def check_max_task_number(tasks):
    # max tasks
    if len(tasks) > settings.TASKS_MAX_NUMBER:
        raise ValidationError(
            f'Maximum task number is {settings.TASKS_MAX_NUMBER}, ' f'current task number is {len(tasks)}'
        )


def check_tasks_max_file_size(value):
    if value >= settings.TASKS_MAX_FILE_SIZE:
        raise ValidationError(
            f'Maximum total size of all files is {settings.TASKS_MAX_FILE_SIZE} bytes, '
            f'current size is {value} bytes'
        )


def check_extensions(files):
    for filename, file_obj in files.items():
        _, ext = os.path.splitext(file_obj.name)
        if ext.lower() not in settings.SUPPORTED_EXTENSIONS:
            raise ValidationError(f'{ext} extension is not supported')


def check_request_files_size(files):
    total = sum([file.size for _, file in files.items()])

    check_tasks_max_file_size(total)


def create_file_upload(user, project, file):
    instance = FileUpload(user=user, project=project, file=file)
    if settings.SVG_SECURITY_CLEANUP:
        content_type, encoding = mimetypes.guess_type(str(instance.file.name))
        if content_type in ['image/svg+xml']:
            clean_xml = allowlist_svg(instance.file.read().decode())
            instance.file.seek(0)
            instance.file.write(clean_xml.encode())
            instance.file.truncate()
    instance.save()
    return instance


def allowlist_svg(dirty_xml):
    """Filter out malicious/harmful content from SVG files
    by defining allowed tags
    """
    from lxml.html import clean

    allow_tags = [
        'xml',
        'svg',
        'circle',
        'ellipse',
        'line',
        'path',
        'polygon',
        'polyline',
        'rect',
    ]

    cleaner = clean.Cleaner(
        allow_tags=allow_tags,
        style=True,
        links=True,
        add_nofollow=False,
        page_structure=True,
        safe_attrs_only=False,
        remove_unknown_tags=False,
    )

    clean_xml = cleaner.clean_html(dirty_xml)
    return clean_xml


def str_to_json(data):
    try:
        json_acceptable_string = data.replace("'", '"')
        return json.loads(json_acceptable_string)
    except ValueError:
        return None


def tasks_from_url(file_upload_ids, project, user, url, could_be_tasks_list):
    """Download file using URL and read tasks from it"""
    # process URL with tasks
    try:
        filename = url.rsplit('/', 1)[-1]

        response = ssrf_safe_get(
            url, verify=project.organization.should_verify_ssl_certs(), stream=True, headers={'Accept-Encoding': None}
        )
        file_content = response.content
        check_tasks_max_file_size(int(response.headers['content-length']))
        file_upload = create_file_upload(user, project, SimpleUploadedFile(filename, file_content))
        if file_upload.format_could_be_tasks_list:
            could_be_tasks_list = True
        file_upload_ids.append(file_upload.id)
        tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)

    except ValidationError as e:
        raise e
    except Exception as e:
        raise ValidationError(str(e))
    return data_keys, found_formats, tasks, file_upload_ids, could_be_tasks_list


@timeit
def create_file_uploads(user, project, FILES):
    could_be_tasks_list = False
    file_upload_ids = []
    check_request_files_size(FILES)
    check_extensions(FILES)
    for _, file in FILES.items():
        file_upload = create_file_upload(user, project, file)
        if file_upload.format_could_be_tasks_list:
            could_be_tasks_list = True
        file_upload_ids.append(file_upload.id)

    logger.debug(f'created file uploads: {file_upload_ids} could_be_tasks_list: {could_be_tasks_list}')
    return file_upload_ids, could_be_tasks_list


def load_tasks_for_async_import(project_import, user):
    """Load tasks from different types of request.data / request.files saved in project_import model"""
    file_upload_ids, found_formats, data_keys = [], [], set()

    if project_import.file_upload_ids:
        file_upload_ids = project_import.file_upload_ids
        tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(
            project_import.project, file_upload_ids
        )

    # take tasks from url address
    elif project_import.url:
        url = project_import.url
        # try to load json with task or tasks from url as string
        json_data = str_to_json(url)
        if json_data:
            file_upload = create_file_upload(
                user,
                project_import.project,
                SimpleUploadedFile('inplace.json', url.encode()),
            )
            file_upload_ids.append(file_upload.id)
            tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(
                project_import.project, file_upload_ids
            )

        # download file using url and read tasks from it
        else:
            could_be_tasks_list = False
            (
                data_keys,
                found_formats,
                tasks,
                file_upload_ids,
                could_be_tasks_list,
            ) = tasks_from_url(file_upload_ids, project_import.project, user, url, could_be_tasks_list)
            if could_be_tasks_list:
                project_import.could_be_tasks_list = True
                project_import.save(update_fields=['could_be_tasks_list'])

    elif project_import.tasks:
        tasks = project_import.tasks

    # check is data root is list
    if not isinstance(tasks, list):
        raise ValidationError('load_tasks: Data root must be list')

    # empty tasks error
    if not tasks:
        raise ValidationError('load_tasks: No tasks added')

    check_max_task_number(tasks)
    return tasks, file_upload_ids, found_formats, list(data_keys)


def load_tasks(request, project):
    """Load tasks from different types of request.data / request.files"""
    file_upload_ids, found_formats, data_keys = [], [], set()
    could_be_tasks_list = False

    # take tasks from request FILES
    if len(request.FILES):
        check_request_files_size(request.FILES)
        check_extensions(request.FILES)
        for filename, file in request.FILES.items():
            file_upload = create_file_upload(request.user, project, file)
            if file_upload.format_could_be_tasks_list:
                could_be_tasks_list = True
            file_upload_ids.append(file_upload.id)
        tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)

    # take tasks from url address
    elif 'application/x-www-form-urlencoded' in request.content_type:
        # empty url
        url = request.data.get('url')
        if not url:
            raise ValidationError('"url" is not found in request data')

        # try to load json with task or tasks from url as string
        json_data = str_to_json(url)
        if json_data:
            file_upload = create_file_upload(request.user, project, SimpleUploadedFile('inplace.json', url.encode()))
            file_upload_ids.append(file_upload.id)
            tasks, found_formats, data_keys = FileUpload.load_tasks_from_uploaded_files(project, file_upload_ids)

        # download file using url and read tasks from it
        else:
            (
                data_keys,
                found_formats,
                tasks,
                file_upload_ids,
                could_be_tasks_list,
            ) = tasks_from_url(file_upload_ids, project, request.user, url, could_be_tasks_list)

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
    return tasks, file_upload_ids, could_be_tasks_list, found_formats, list(data_keys)
