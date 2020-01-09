# Import tasks from json, csv, zip, txt and more

import os
import csv
import shutil
import zipfile
import rarfile
import logging
import tempfile
import pandas as pd
try:
    import ujson as json
except:
    import json

from os.path import join
from .exceptions import ValidationError
from .misc import Settings
from urllib.request import urlopen

settings = Settings
logger = logging.getLogger(__name__)
csv.field_size_limit(131072 * 10)


def tasks_from_file(filename, file):
    try:
        if filename.endswith('.csv'):
            tasks = pd.read_csv(file).fillna('').to_dict('records')
            tasks = [{'data': task} for task in tasks]
        elif filename.endswith('.tsv'):
            tasks = pd.read_csv(file, sep='\t').fillna('').to_dict('records')
            tasks = [{'data': task} for task in tasks]
        elif filename.endswith('.txt'):
            lines = file.read().splitlines()
            tasks = [{'data': {settings.UPLOAD_DATA_UNDEFINED_NAME: line.decode('utf-8')}} for line in lines]
        elif filename.endswith('.json'):
            tasks = json.load(file)  # try simple json
        else:
            raise ValueError(f'Unsupported input file format')
    except Exception as exc:
        raise ValidationError(f'Failed to parse input file {filename}: {exc}')

    # null in file
    if tasks is None:
        raise ValidationError(f'null in {filename} is not allowed')

    # one task as dict
    elif isinstance(tasks, dict):
        tasks = [tasks]

    # list
    elif isinstance(tasks, list):
        return tasks

    # something strange
    else:
        raise ValidationError(f'Incorrect task type in {filename}: "{str(tasks)[0:100]}". '
                              f'It is allowed "dict" or "list of dicts" only')

    return tasks


def create_and_release_temp_dir(func):
    def wrapper(*args, **kwargs):
        with tempfile.TemporaryDirectory(prefix='htx_') as temp_dir:
            return func(temp_dir=temp_dir, *args, **kwargs)
    return wrapper


def extract_archive(archive, filename, temp_dir):
    """ Extract all files from archive and returns extracted file names

    :param archive: ZipFile or similar interface instance
    :param filename: zip filename
    :param temp_dir: temporary dir
    :return: extracted file names
    """
    final_dir = join(temp_dir, filename)
    names = {join(final_dir, name): 'archive' for name in archive.namelist()}
    logger.info(f'ZIP archive {filename} found with {len(names)} files inside, extracting to {final_dir}')

    archive.extractall(final_dir)
    logger.info(f'ZIP archive {filename} extracted successfully')
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


def aggregate_files(request_files, temp_dir):
    files = {}

    # extract all files from archives to temp dir
    for filename, file in request_files.items():

        # read urlopen till end and save this file
        if hasattr(file, 'urlopen') and (filename.endswith('.zip') or filename.endswith('.rar')):
            path = os.path.join(temp_dir, 'current_file')
            with open(path, 'wb') as current_file:
                shutil.copyfileobj(file, current_file)
                current_file.close()
                file = path  # rewrite file as path

        # zip
        if filename.endswith('.zip'):
            with zipfile.ZipFile(file, 'r') as archive:
                names = extract_archive(archive, filename, temp_dir)
                files.update(names)

        # rar
        elif filename.endswith('.rar'):
            with rarfile.RarFile(file, 'r') as archive:
                names = extract_archive(archive, filename, temp_dir)
                files.update(names)

        # other
        else:
            files[filename] = file

    return files


def aggregate_tasks(files):
    tasks = []

    # scan all files
    for filename, file in files.items():
        # extracted file from archive
        if file is 'archive':
            with open(filename) as f:
                tasks += tasks_from_file(filename, f)
        # file from request
        else:
            tasks += tasks_from_file(filename, file)

        check_max_task_number(tasks)

    return tasks


@create_and_release_temp_dir
def load_tasks(request, temp_dir):
    """ Load tasks from different types of request.data / request.files
    """
    # take tasks from request FILES
    if len(request.FILES):
        # check_file_sizes_and_number(request.FILES)
        files = aggregate_files(request.FILES, temp_dir)
        tasks = aggregate_tasks(files)

    # take tasks from url address
    elif 'application/x-www-form-urlencoded' in request.content_type:
        try:
            url = request.data['url']
            with urlopen(url) as file:
                # check size
                meta = file.info()
                file.size = int(meta.get("Content-Length"))
                file.urlopen = True
                request_files = {url: file}
                check_file_sizes_and_number(request_files)

                # start parsing
                files = aggregate_files(request_files, temp_dir)
                tasks = aggregate_tasks(files)

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
    return tasks
