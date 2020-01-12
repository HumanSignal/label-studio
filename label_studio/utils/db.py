from __future__ import print_function

import io
import os
import json
import orjson
import urllib
import logging
import random

from datetime import datetime
from collections import OrderedDict, defaultdict

logger = logging.getLogger(__name__)

tasks = None
completions = None
c = None  # config
derived_input_schema = []
derived_output_schema = {
    'from_name_to_name_type': set(),
    'labels': defaultdict(set)
}

_allowed_extensions = {
    'Text': ('.txt',),
    'Image': ('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif'),
    'Audio': ('.wav', '.aiff', '.mp3', '.au', '.flac')
}


def _get_single_input_value(input_data_tags):
    if len(input_data_tags) > 1:
        val = ",".join(tag.attrib.get("name") for tag in input_data_tags)
        print('Warning! Multiple input data tags found: ' +
              val + '. Only first one is used.')
    input_data_tag = input_data_tags[0]
    data_key = input_data_tag.attrib.get('value').lstrip('$')
    return data_key


def _create_task_with_local_uri(filepath, data_key, task_id):
    """ Convert filepath to task with flask serving URL
    """
    global c
    filename = os.path.basename(filepath)
    params = urllib.parse.urlencode({'d': os.path.dirname(filepath)})
    base_url = 'http://localhost:{port}/'.format(port=c.get("port"))
    image_url_path = base_url + urllib.parse.quote('data/' + filename)
    image_local_url = '{image_url_path}?{params}'.format(image_url_path=image_url_path, params=params)
    return {
        'id': task_id,
        'task_path': filepath,
        'data': {data_key: image_local_url}
    }


def is_text_annotation(input_data_tags, filepath):
    return (
        len(input_data_tags) == 1 and input_data_tags[0].tag == 'Text'
        and filepath.endswith(_allowed_extensions['Text'])
    )


def is_image_annotation(input_data_tags, filepath):
    return (
        len(input_data_tags) == 1 and input_data_tags[0].tag == 'Image'
        and filepath.lower().endswith(_allowed_extensions['Image'])
    )


def is_audio_annotation(input_data_tags, filepath):
    return (
        len(input_data_tags) == 1 and input_data_tags[0].tag in ('Audio', 'AudioPlus')
        and filepath.lower().endswith(_allowed_extensions['Audio'])
    )


def tasks_from_json_file(path, tasks):
    """ Prepare tasks from json

    :param path: path to json with list or dict
    :param tasks: main db instance of tasks
    :return: new task id
    """
    def push_task(root):
        task_id = len(tasks) + 1
        data = root['data'] if 'data' in root else root
        tasks[task_id] = {'id': task_id, 'task_path': path, 'data': data}
        if 'predictions' in data:
            tasks[task_id]['predictions'] = data['predictions']
            tasks[task_id]['data'].pop('predictions', None)
        if 'predictions' in root:
            tasks[task_id]['predictions'] = root['predictions']

    logger.debug('Reading tasks from JSON file ' + path)
    with open(path) as f:
        json_body = orjson.loads(f.read())

        # multiple tasks in file
        if isinstance(json_body, list):
            [push_task(data) for data in json_body]

        # one task in file
        elif isinstance(json_body, dict):
            push_task(json_body)

        # unsupported task type
        else:
            raise Exception('Unsupported task data:', path)


def init(config):
    from .misc import LabelConfigParser
    """ Init database

    :param config: config dict
    """
    global c, tasks, derived_input_schema, derived_output_schema
    c = config

    label_config = LabelConfigParser(c['label_config'])

    if not os.path.exists(c['output_dir']):
        os.mkdir(c['output_dir'])

    task_id = 0
    data_key = None

    input_data_tags = label_config.get_input_data_tags()

    # load at first start
    if tasks is None:
        tasks = OrderedDict()

        # file
        if os.path.isfile(c['input_path']):
            files = [os.path.basename(c['input_path'])]
            root_dir = os.path.normpath(os.path.dirname(c['input_path']))

        # directory
        else:
            root_dir = os.path.normpath(c['input_path'])
            files = [os.path.join(root, f) for root, _, files in os.walk(root_dir) for f in files \
                     if 'completion' not in f and 'completion' not in root]

        # walk over all the files
        for f in files:
            norm_f = os.path.normpath(f)
            path = os.path.join(root_dir, norm_f) if not norm_f.startswith(root_dir) else f

            # load tasks from json
            if f.endswith('.json'):
                tasks_from_json_file(path, tasks)

            # load tasks from txt: line by line, task by task
            elif is_text_annotation(input_data_tags, f):
                if data_key is None:
                    data_key = _get_single_input_value(input_data_tags)
                with io.open(path) as fin:
                    for line in fin:
                        task_id = len(tasks) + 1
                        tasks[task_id] = {'id': task_id, 'task_path': path, 'data': {data_key: line.strip()}}

            # load tasks from files: creating URI to local resources
            elif is_image_annotation(input_data_tags, f) or is_audio_annotation(input_data_tags, f):
                if data_key is None:
                    data_key = _get_single_input_value(input_data_tags)
                task_id = len(tasks) + 1
                tasks[task_id] = _create_task_with_local_uri(f, data_key, task_id)
            else:
                logger.warning('Unrecognized file format for file ' + f)

        num_tasks_loaded = len(tasks)

        # make derived input scheme
        if num_tasks_loaded > 0:
            for tag in input_data_tags:
                derived_input_schema.append({
                    'type': tag.tag,
                    'value': tag.attrib['value'].lstrip('$')
                })

        # for all already completed tasks we update derived output schema for further label config validation
        for task_id in get_task_ids():
            task_with_completions = get_task_with_completions(task_id)
            if task_with_completions and 'completions' in task_with_completions:
                completions = task_with_completions['completions']
                for completion in completions:
                    _update_derived_output_schema(completion)

        print(str(len(tasks)) + 'tasks loaded from: ' + c["input_path"])


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


def iter_tasks():
    global tasks, c
    sampling = c.get('sampling', 'sequential')
    if sampling == 'sequential':
        return tasks.items()
    elif sampling == 'uniform':
        keys = list(tasks.keys())
        random.shuffle(keys)
        return ((k, tasks[k]) for k in keys)
    else:
        raise NotImplementedError('Unknown sampling method ' + sampling)


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


def get_task_with_completions(task_id):
    """ Get task with completions

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
        # tasks can hold the newest version of predictions, so task it from tasks
        data['predictions'] = tasks[task_id].get('predictions', [])
    else:
        data = None
    return data


def _update_derived_output_schema(completion):
    """
    Given completion, output schema is updated. Output schema consists of unique tuples (from_name, to_name, type)
    and list of unique labels derived from existed completions
    :param completion:
    :return:
    """
    global derived_output_schema

    for result in completion['result']:
        derived_output_schema['from_name_to_name_type'].add((
            result['from_name'], result['to_name'], result['type']
        ))
        for label in result['value'][result['type']]:
            derived_output_schema['labels'][result['from_name']].add(label)


def save_completion(task_id, completion):
    """ Save completion

    :param task_id: task id
    :param completion: json data from label (editor)
    """
    global c

    # try to get completions with task first
    task = get_task_with_completions(task_id)

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

    _update_derived_output_schema(completion)

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
