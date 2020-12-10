# Import tasks from json, csv, zip, txt and more
import os
import csv

import shutil
import zipfile
import rarfile
import logging
import tempfile
import pandas as pd
import htmlmin
try:
    import ujson as json
except:
    import json

from os.path import join
from collections import Counter

from label_studio.utils.exceptions import ValidationError
from label_studio.utils.misc import Settings
from label_studio.utils.functions import get_external_hostname


settings = Settings
logger = logging.getLogger(__name__)
csv.field_size_limit(131072 * 10)


class TasksFromFileReader(object):

    def __init__(self, project, file_as_tasks_list):
        self.project = project
        self.file_as_tasks_list = file_as_tasks_list
        self.is_time_series_only = len(project.data_types) == 1 and 'TimeSeries' in project.data_types.values()

    def read_tasks_list_from_csv(self, filename, file, sep=','):
        logger.debug('Read tasks list from CSV file {}'.format(filename))
        tasks = pd.read_csv(file, sep=sep).fillna('').to_dict('records')
        tasks = [{'data': task} for task in tasks]
        return tasks

    def read_tasks_list_from_tsv(self, filename, file):
        logger.debug('Read tasks list from TSV file {}'.format(filename))
        tasks = pd.read_csv(file, sep='\t').fillna('').to_dict('records')
        tasks = [{'data': task} for task in tasks]
        return tasks

    def read_tasks_list_from_txt(self, filename, file):
        logger.debug('Read tasks list from text file {}'.format(filename))
        lines = file.read().splitlines()
        tasks = [{'data': {settings.UPLOAD_DATA_UNDEFINED_NAME: line.decode('utf-8')}} for line in lines]
        return tasks

    def read_tasks_list_from_json(self, filename, file):
        logger.debug('Read tasks list from JSON file {}'.format(filename))
        raw_data = file.read()
        # Python 3.5 compatibility fix https://docs.python.org/3/whatsnew/3.6.html#json
        try:
            tasks = json.loads(raw_data)
        except TypeError:
            tasks = json.loads(raw_data.decode('utf8'))
        return tasks

    def read_task_from_json(self, filename, file):
        logger.debug('Read 1 task from JSON file {}'.format(filename))
        raw_data = file.read()
        # Python 3.5 compatibility fix https://docs.python.org/3/whatsnew/3.6.html#json
        try:
            task = json.loads(raw_data)
        except TypeError:
            task = json.loads(raw_data.decode('utf8'))
        assert isinstance(task, dict)
        return [task]

    def read_task_from_hypertext_body(self, filename, file):
        logger.debug('Read 1 task from hypertext file {}'.format(filename))
        data = file.read()
        body = htmlmin.minify(data.decode('utf8'), remove_all_empty_space=True)
        tasks = [{'data': {settings.UPLOAD_DATA_UNDEFINED_NAME: body}}]
        return tasks

    def read_task_from_uploaded_file(self, filename, file):
        logger.debug('Read 1 task from uploaded file {}'.format(filename))
        path = get_external_hostname() + '/data/upload/' + filename
        tasks = [{'data': {settings.UPLOAD_DATA_UNDEFINED_NAME: path}}]
        return tasks

    def read(self, filename, file):
        try:
            file_format = os.path.splitext(filename)[-1]
        except:
            file_format = None
        tasks = None

        if self.file_as_tasks_list:
            try:
                if file_format == '.csv':
                    tasks = self.read_tasks_list_from_csv(filename, file)
                elif file_format == '.tsv':
                    tasks = self.read_tasks_list_from_tsv(filename, file)
                elif file_format == '.txt':
                    tasks = self.read_tasks_list_from_txt(filename, file)
                elif file_format == '.json':
                    tasks = self.read_tasks_list_from_json(filename, file)
            except Exception as exc:
                raise ValidationError('Failed to parse input file ' + filename + ': ' + str(exc) + ' into tasks list')

        # upload file via drag & drop
        elif len(self.project.data_types) > 1:
            raise ValidationError(
                'Your label config has more than one data keys, direct file upload supports only '
                'one data key. To import data with multiple data keys use JSON or CSV')

        elif not se:
            try:
                if file_format in ('.html', '.htm', '.xml'):
                    tasks = self.read_task_from_hypertext_body(filename, file)
                elif file_format == '.json':
                    tasks = self.read_task_from_json(filename, file)
                else:
                    tasks = self.read_task_from_uploaded_file(filename, file)
            except Exception as exc:
                raise ValidationError('Failed to create task from input file ' + filename + ': ' + str(exc))

        if tasks is None:
            raise ValidationError(
                'Incorrect task type in ' + filename + ': "' + str(str(tasks)[0:100]) +
                '". It is allowed "dict" or "list of dicts" only')
        return tasks, file_format


def tasks_from_file(filename, file, project, file_as_tasks_list):
    reader = TasksFromFileReader(project, file_as_tasks_list)
    tasks, file_format = reader.read(filename, file)
    return tasks, file_format


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
    logger.info('ZIP archive {filename} found with {names} files inside, extracting to {final_dir}'
                .format(filename=filename, names=len(names), final_dir=final_dir))

    archive.extractall(final_dir)
    logger.info('ZIP archive {filename} extracted successfully')
    return names


def check_max_task_number(tasks):
    # max tasks
    if len(tasks) > settings.TASKS_MAX_NUMBER:
        raise ValidationError('Maximum task number is {TASKS_MAX_NUMBER}, '
                              'current task number is {num_tasks}'
                              .format(TASKS_MAX_NUMBER=settings.TASKS_MAX_NUMBER, num_tasks=len(tasks)))


def check_file_sizes_and_number(files):
    total = sum([file.size for _, file in files.items()])

    if total >= settings.TASKS_MAX_FILE_SIZE:
        raise ValidationError('Maximum total size of all files is {TASKS_MAX_FILE_SIZE} bytes, '
                              'current size is {total} bytes'
                              .format(TASKS_MAX_FILE_SIZE=settings.TASKS_MAX_FILE_SIZE, total=total))


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


def aggregate_tasks(files, project, formats=None, files_as_tasks_list=None):
    tasks = []
    fileformats = []
    # scan all files
    for filename, file in files.items():
        # extracted file from archive
        if file == 'archive':
            if os.path.isdir(filename):
                # TODO: recursive scan
                logger.error('Found directory {} in archive: recursive scan is not implemented.'.format(filename))
                continue
            with open(filename) as f:
                new_tasks, fileformat = tasks_from_file(filename, f, project, files_as_tasks_list)
                if formats and fileformat not in formats:
                    # TODO: not so effective to read all file content before checking format
                    continue
                tasks += new_tasks
                fileformats.append(fileformat)
        # file from request
        else:
            new_tasks, fileformat = tasks_from_file(filename, file, project, files_as_tasks_list)
            if formats and fileformat not in formats:
                # TODO: not so effective to read all file content before checking format
                continue
            tasks += new_tasks
            fileformats.append(fileformat)

        check_max_task_number(tasks)

    return tasks, dict(Counter(fileformats))
