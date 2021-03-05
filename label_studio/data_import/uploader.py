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
from label_studio.utils.io import get_temp_dir
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
        return self.read_tasks_list_from_csv(filename, file, '\t')

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
        if isinstance(tasks, dict):
            tasks = [tasks]
        tasks_formatted = []
        for task in tasks:
            if not task.get('data'):
                task = {'data': task}
            if not isinstance(task['data'], dict):
                raise ValidationError('Task item should be dict')
            tasks_formatted.append(task)
        return tasks_formatted

    def read_task_from_hypertext_body(self, filename, file):
        logger.debug('Read 1 task from hypertext file {}'.format(filename))
        data = file.read()
        body = htmlmin.minify(data.decode('utf8'), remove_all_empty_space=True)
        tasks = [{'data': {settings.UPLOAD_DATA_UNDEFINED_NAME: body}}]
        return tasks

    def read_task_from_uploaded_file(self, filename, file):
        logger.debug('Read 1 task from uploaded file {}'.format(filename))
        # remove hostname if it's localhost and use absolute path
        hostname = get_external_hostname()
        if 'localhost' in hostname:
            hostname = ''
        # make path with hostname
        path = hostname + '/data/upload/' + filename
        tasks = [{'data': {settings.UPLOAD_DATA_UNDEFINED_NAME: path}}]
        return tasks

    def read(self, filename, file):
        try:
            file_format = os.path.splitext(filename)[-1]
        except:
            file_format = None
        finally:
            logger.debug('Get file format ' + file_format)

        try:
            # file as tasks list
            if file_format == '.csv' and self.file_as_tasks_list:
                tasks = self.read_tasks_list_from_csv(filename, file)
            elif file_format == '.tsv' and self.file_as_tasks_list:
                tasks = self.read_tasks_list_from_tsv(filename, file)
            elif file_format == '.txt' and self.file_as_tasks_list:
                tasks = self.read_tasks_list_from_txt(filename, file)
            elif file_format == '.json':
                tasks = self.read_tasks_list_from_json(filename, file)

            # otherwise - only one object tag should be presented in label config
            elif not self.project.one_object_in_label_config:
                raise ValidationError(
                    'Your label config has more than one data keys, direct file upload supports only '
                    'one data key. To import data with multiple data keys use JSON or CSV')

            # file as a single asset
            elif file_format in ('.html', '.htm', '.xml'):
                tasks = self.read_task_from_hypertext_body(filename, file)
            else:
                tasks = self.read_task_from_uploaded_file(filename, file)

        except Exception as exc:
            raise ValidationError('Failed to parse input file ' + filename + ': ' + str(exc))
        return tasks, file_format


def tasks_from_file(filename, file, project, file_as_tasks_list):
    reader = TasksFromFileReader(project, file_as_tasks_list)
    tasks, file_format = reader.read(filename, file)
    data_keys = set(iter(tasks[0]['data'].keys())) if len(tasks) > 0 else set()
    return tasks, file_format, data_keys


def create_and_release_temp_dir(func):
    def wrapper(*args, **kwargs):
        with tempfile.TemporaryDirectory(prefix='htx_') as temp_dir:
            return func(temp_dir=temp_dir, *args, **kwargs)
    return wrapper


def extract_archive(archive, output_dir):
    """ Extract all files from archive and returns extracted file names

    :param archive: ZipFile or similar interface instance
    :param output: Directory where to extract the content
    :return: extracted file names
    """
    names = archive.namelist()
    logger.info('ZIP archive {filename} found with {names} files inside, extracting to {final_dir}'
                .format(filename=archive.filename, names=len(names), final_dir=output_dir))
    archive.extractall(output_dir)
    return names


def aggregate_files(request_files, temp_dir, upload_dir):
    files = {}

    # extract all files from archives to temp dir
    for filename, file in request_files.items():

        # read urlopen till end and save this file
        if hasattr(file, 'urlopen') and filename.endswith(('.zip', '.rar')):
            path = os.path.join(temp_dir, 'current_file')
            with open(path, 'wb') as current_file:
                shutil.copyfileobj(file, current_file)
                current_file.close()
                file = path  # rewrite file as path

        # zip, rar
        if filename.endswith(('.zip', '.rar')):
            archive_class = zipfile.ZipFile if filename.endswith('.zip') else rarfile.RarFile
            with archive_class(file, 'r') as archive:
                names = extract_archive(archive, upload_dir)
                files.update({name: open(os.path.join(upload_dir, name), mode='rb') for name in names})

        # other
        else:
            files[filename] = file

    return files


def _old_vs_new_data_keys_inconsistency_message(new_data_keys, old_data_keys, current_file):
    new_data_keys_list = ','.join(new_data_keys)
    old_data_keys_list = ','.join(old_data_keys)
    common_prefix = "You're trying to import inconsistent data:\n"
    if new_data_keys_list == old_data_keys_list:
        return ''
    elif new_data_keys_list == Settings.UPLOAD_DATA_UNDEFINED_NAME:
        return common_prefix + "uploading a single file {0} " \
                               "clashes with data key(s) found from other files:\n\"{1}\"".format(
                                current_file, old_data_keys_list)
    elif old_data_keys_list == Settings.UPLOAD_DATA_UNDEFINED_NAME:
        return common_prefix + "uploading tabular data from {0} with data key(s) {1}, " \
                               "clashes with other raw binary files (images, audios, etc.)".format(
                                current_file, new_data_keys_list)
    else:
        return common_prefix + "uploading tabular data from \"{0}\" with data key(s) \"{1}\", " \
                               "clashes with data key(s) found from other files:\n\"{2}\"".format(
                                current_file, new_data_keys_list, old_data_keys_list)


def aggregate_tasks(files, project, formats=None, files_as_tasks_list=None, trim_size=None):
    tasks = []
    fileformats = []
    data_keys = set()
    # scan all files
    for filename, file in files.items():
        new_tasks, fileformat, new_data_keys = tasks_from_file(filename, file, project, files_as_tasks_list)
        if formats and fileformat not in formats:
            # TODO: not so effective to read all file content before checking format
            continue
        if not data_keys:
            data_keys = new_data_keys
        if data_keys != new_data_keys:
            raise ValidationError(_old_vs_new_data_keys_inconsistency_message(new_data_keys, data_keys, filename))
        tasks += new_tasks
        fileformats.append(fileformat)

        if trim_size is not None:
            if len(tasks) > trim_size:
                break

    return tasks, dict(Counter(fileformats)), data_keys
