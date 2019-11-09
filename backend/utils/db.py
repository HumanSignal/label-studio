from __future__ import print_function

import io
import os
import json
import urllib
import logging

from datetime import datetime

logger = logging.getLogger(__name__)

tasks = None
completions = None
c = None  # config


def _get_single_input_value(label_config):
    input_data_tag = label_config.get_input_data_tags()
    if len(input_data_tag) > 1:
        print(f'Warning! Multiple input data tags found: '
              f'{",".join(tag.attrib.get("name") for tag in input_data_tag)}. Only first one is used.')

    input_data_tag = input_data_tag[0]
    data_key = input_data_tag.attrib.get('value').lstrip('$')
    return data_key


def init(config):
    from .misc import LabelConfigParser
    """ Init database

    :param config: config dict
    """
    global c, tasks
    c = config
    label_config = LabelConfigParser(c['label_config'])

    if not os.path.exists(c['output_dir']):
        os.mkdir(c['output_dir'])

    task_id = 0
    data_key = None

    # load at first start
    if tasks is None:
        tasks = {}

        # file
        if os.path.isfile(c['input_path']):
            files = [os.path.basename(c['input_path'])]
            root_dir = os.path.dirname(c['input_path'])

        # directory
        else:
            root_dir = c['input_path']
            files = (os.path.join(root, f) for root, _, files in os.walk(root_dir) for f in files)

        for f in files:
            path = os.path.join(root_dir, f)
            # load tasks from json
            if f.endswith('.json'):
                json_body = json.load(open(path))

                # multiple tasks in file
                if isinstance(json_body, list):
                    for data in json_body:
                        task_id = len(tasks) + 1
                        tasks[task_id] = {'id': task_id, 'task_path': path, 'data': data}

                # one task in file
                elif isinstance(json_body, dict):
                    task_id = len(tasks) + 1
                    tasks[task_id] = {'id': task_id, 'task_path': path, 'data': json_body}

                # unsupported task type
                else:
                    raise Exception('Unsupported task data:', path)

            # load tasks from txt: line by line, task by task
            elif f.endswith('.txt'):
                if data_key is None:
                    data_key = _get_single_input_value(label_config)
                tasks = {}
                with io.open(path) as fin:
                    for i, line in enumerate(fin):
                        tasks[i] = {
                            'id': i + 1,
                            'task_path': path,
                            'data': {
                                data_key: line.strip()
                            }
                        }

            # load tasks from images in directory
            elif f.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')):
                filename = os.path.basename(f)
                params = urllib.parse.urlencode({'d': os.path.dirname(f)})
                image_url_path = urllib.parse.quote(f'images/{filename}')
                image_local_url = f'{image_url_path}?{params}'
                if data_key is None:
                    data_key = _get_single_input_value(label_config)
                tasks[task_id] = {
                    'id': task_id,
                    'task_path': f,
                    'data': {data_key: image_local_url}
                }
                task_id += 1
            else:
                logger.warning(f'Unrecognized file format for file {f}')

        print(f'{len(tasks)} tasks loaded from: {c["input_path"]}')


def re_init(config):
    """ Re-init DB from scratch

    :param config: dict
    """
    global tasks, completions, c
    tasks, completions, c = None, None, None
    init(config)

# Tasks #


def get_tasks():
    """ Load tasks from JSON files in input_path directory

    :return: file list
    """
    global tasks
    return tasks


def get_task(task_id):
    """ Get one task

    :param task_id:
    :return: task
    """
    global tasks
    try:
        task_id = int(task_id)
    except ValueError:
        return None
    return tasks[task_id] if task_id in tasks else None


def get_task_ids():
    """ Get task ids only

    :return: list of task ids
    """
    global tasks
    return list(tasks.keys())


# Completions #


def get_completions_ids():
    """ List completion ids from output_dir directory

    :return: filenames without extensions and directories
    """
    global completions, c

    root_dir = c['output_dir']
    os.mkdir(root_dir) if not os.path.exists(root_dir) else ()
    files = os.listdir(root_dir)
    completions = [int(os.path.splitext(f)[0]) for f in files if f.endswith('.json')]
    print('Completions found:', c["output_dir"], len(completions))
    return sorted(completions)


def get_completed_at(task_ids):
    """ Get completed time for list of task ids

    :param task_ids: list of task ids
    :return: list of string with formatted datetime
    """
    root_dir = c['output_dir']
    existing_completions = set(get_completions_ids())
    ids = existing_completions.intersection(task_ids)
    times = {i: os.path.getmtime(os.path.join(root_dir, str(i) + '.json')) for i in ids}
    times = {i: datetime.fromtimestamp(t).strftime('%Y-%m-%d %H:%M:%S') for i, t in times.items()}
    return times


def get_completions(task_id):
    """ Get completed time for list of task ids

    :param task_id: task ids
    :return: json dict with completion
    """
    try:
        task_id = int(task_id)  # check task_id is int (disallow to escape from output_dir)
    except ValueError:
        return None

    filename = os.path.join(c['output_dir'], str(task_id) + '.json')

    if os.path.exists(filename):
        data = json.load(open(filename))
    else:
        data = None
    return data


def save_completion(task_id, completion):
    """ Save completion

    :param task_id: task id
    :param completion: json data from label (editor)
    """
    global c

    # try to get completions with task first
    task = get_completions(task_id)

    # init task if completions with task not exists
    if not task:
        task = get_task(task_id)
        task['completions'] = []

    # update old completion
    updated = False
    if 'id' in completion:
        for i, item in enumerate(task['completions']):
            if item['id'] == completion['id']:
                task['completions'][i].update(completion)
                updated = True

    # write new completion
    if not updated:
        completion['id'] = task['id'] * 1000 + len(task['completions']) + 1
        task['completions'].append(completion)

    # write task + completions to file
    filename = os.path.join(c['output_dir'], str(task_id) + '.json')
    os.mkdir(c['output_dir']) if not os.path.exists(c['output_dir']) else ()
    json.dump(task, open(filename, 'w'), indent=4, sort_keys=True)
    return completion['id']


def delete_completion(task_id):
    """ Delete completion from disk

    :param task_id: task id
    """
    filename = os.path.join(c['output_dir'], str(task_id) + '.json')
    os.remove(filename)
