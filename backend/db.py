import os
import json

tasks = None
completions = None
config = None


def init(c):
    """ Init database

    :param c: config dict
    """
    global config, tasks
    config = c

    if not os.path.exists(c['output_path']):
        os.mkdir(c['output_path'])

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
            files = os.listdir(root_dir)

        for f in files:

            # load tasks from json
            if f.endswith('.json'):
                path = os.path.join(root_dir, f)
                json_body = json.load(open(path))

                # multiple tasks in file
                if isinstance(json_body, list):
                    for data in json_body:
                        task_id = os.path.splitext(f)[0] + '-' + str(len(tasks))
                        tasks[task_id] = {'id': task_id, 'path': path, 'data': data}

                # one task in file
                elif isinstance(json_body, dict):
                    task_id = os.path.splitext(f)[0] + '-' + str(len(tasks))
                    tasks[task_id] = {'id': task_id, 'path': path, 'data': json_body}

                # unsupported task type
                else:
                    raise Exception(f'Unsupported task data in "{path}"')

        print(f'Tasks loaded from "{c["input_path"]}"', len(tasks))


def get_tasks():
    """ Load tasks from JSON files in input_path directory

    :return: file list
    """
    global tasks
    return tasks


def get_completions_ids():
    """ List completion ids from output_path directory

    :return: filenames without extensions and directories
    """
    global completions, config
    c = config

    root_dir = c['output_path']
    files = os.listdir(root_dir)
    completions = [os.path.splitext(f)[0] for f in files if f.endswith('.json')]
    print(f'Completions found in "{c["output_path"]}"', len(completions))
    return sorted(completions)


def save_completion(task_id, completion):
    """ Save completion

    :param task_id: task id
    :param completion: json data from label (editor)
    """
    global config

    filename = os.path.join(config['output_path'], task_id + '.json')
    json.dump(json.loads(completion["result"]), open(filename, 'w'))
