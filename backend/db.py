import os
import json

tasks = None
completions = None
c = None  # config


def init(config):
    """ Init database

    :param config: config dict
    """
    global c, tasks
    c = config

    if not os.path.exists(c['output_dir']):
        os.mkdir(c['output_dir'])

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
    """ List completion ids from output_dir directory

    :return: filenames without extensions and directories
    """
    global completions, c

    root_dir = c['output_dir']
    files = os.listdir(root_dir)
    completions = [os.path.splitext(f)[0] for f in files if f.endswith('.json')]
    print(f'Completions found in "{c["output_dir"]}"', len(completions))
    return sorted(completions)


def save_completion(task_id, completion):
    """ Save completion

    :param task_id: task id
    :param completion: json data from label (editor)
    """
    global c

    completion['task'] = get_tasks()[task_id]
    filename = os.path.join(c['output_dir'], task_id + '.json')
    json.dump(completion, open(filename, 'w'), indent=4, sort_keys=True)


def delete_completion(task_id):
    """ Delete completion from disk

    :param task_id: task id
    """
    filename = os.path.join(c['output_dir'], task_id + '.json')
    os.remove(filename)
