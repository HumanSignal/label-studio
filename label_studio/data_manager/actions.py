""" Actions for tasks and annotations provided by data manager
    All actions are stored in _actions dict.
    Data manager uses _actions to know the list of available actions,
    they are called by entry_points from _actions dict items.
"""
import logging

from copy import copy, deepcopy
from label_studio.data_manager.functions import DataManagerException
from label_studio.utils.uri_resolver import resolve_task_data_uri
from label_studio.utils.misc import timestamp_now

logger = logging.getLogger(__name__)
_actions = {}


def check_permissions(project, action):
    """ Some actions might have a permissions to perform
    """
    if 'permissions' in action:
        if action['permissions'].startswith('project.'):
            field = action['permissions'].replace('project.', '')
            return getattr(project, field)
    else:
        return True


def get_all_actions(project):
    """ Return dict with registered actions
    """
    # copy and sort by order key
    actions = list(_actions.values())
    actions = sorted(actions, key=lambda x: x['order'])
    actions = [
        {key: action[key] for key in action if key != 'entry_point'}
        for action in actions if not action.get('hidden', False)
        and check_permissions(project, action)
    ]
    # remove experimental features if they are disabled
    if not project.config.get('experimental_features', False):
        actions = [action for action in actions if not action.get('experimental', False)]
    return actions


def register_action(entry_point, title, order, **kwargs):
    """ Register action in global _action instance,
        action_id will be automatically extracted from entry_point function name
    """
    action_id = entry_point.__name__
    if action_id in _actions:
        raise IndexError('Action with id "' + action_id + '" already exists')

    _actions[action_id] = {
        'id': action_id,
        'title': title,
        'order': order,
        'entry_point': entry_point,
        **kwargs
    }


def perform_action(action_id, project, tab, items):
    """ Perform action using entry point from actions
    """
    if action_id not in _actions:
        raise DataManagerException("Can't find '" + action_id + "' in registered actions")

    return _actions[action_id]['entry_point'](project, tab, items)


def delete_tasks(project, params, items):
    """ Delete tasks by ids
    """
    project.delete_tasks(items)
    return {'processed_items': len(items),
            'detail': 'Deleted ' + str(len(items)) + ' tasks'}


def delete_tasks_completions(project, params, items):
    """ Delete all completions by tasks ids
    """
    project.delete_tasks_completions(items)
    return {'processed_items': len(items),
            'detail': 'Deleted ' + str(len(items)) + ' completions'}


def propagate_completions(project, params, items):
    if len(items) < 2:
        raise DataManagerException('Select more than two tasks, the first task completion will be picked as source')

    # check first completion
    completed_task = items[0]
    task = project.target_storage.get(completed_task)
    if task is None or len(task.get('completions', [])) == 0:
        raise DataManagerException('The first selected task with ID = ' + str(completed_task) +
                                   ' should have at least one completion to propagate')

    # get first completion
    source_completion = task['completions'][0]

    # copy first completion to new completions for each task
    for i in items[1:]:
        task = project.target_storage.get(i)
        if task is None:
            task = project.source_storage.get(i)
        completion = deepcopy(source_completion)

        # start completion id from task_id * 9000
        completions = task.get('completions', None) or [{'id': i * 9000}]
        completion['id'] = max([c['id'] for c in completions]) + 1
        completion['created_at'] = timestamp_now()

        if 'completions' not in task:
            task['completions'] = []
        task['completions'].append(completion)

        project.target_storage.set(i, task)

    return {'response_code': 200}


def predictions_to_completions(project, params, items):
    for i in items:
        task = project.source_storage.get(i)
        predictions = task.get('predictions', [])
        if len(predictions) == 0:
            continue

        prediction = predictions[-1]

        # load task with completion from target storage
        task_with_completions = project.target_storage.get(i)
        task = copy(task if task_with_completions is None else task_with_completions)

        completions = task.get('completions', None) or [{'id': i * 9000}]
        completion = {
            'id': max([c['id'] for c in completions]) + 1,
            'created_at': timestamp_now(),
            'lead_time': 0,
            'result': prediction.get('result', [])
        }

        if 'completions' not in task:
            task['completions'] = []
        task['completions'].append(completion)

        project.target_storage.set(i, task)

    return {'response_code': 200}


def next_task(project, params, items):
    """ Generate next task for labeling stream

        :param project: project
        :param params.values['sampling'] = sequential | random-uniform | prediction-score-min | prediction-score-max
        :param items: task ids to sample from
    """
    # try to find task is not presented in completions
    sampling = None if params is None else params.values.get('sampling', None)
    completed_tasks_ids = project.get_completions_ids()
    task = project.next_task(completed_tasks_ids, task_ids=items, sampling=sampling)

    if task is None:
        # no tasks found
        return {'response_code': 404, 'id': None}

    task = resolve_task_data_uri(task, project=project)
    task = project.resolve_undefined_task_data(task)

    # collect prediction from multiple ml backends
    if project.ml_backends_connected:
        task = project.make_predictions(task)

    logger.debug('Next task:\n' + str(task.get('id', None)))
    task['response_code'] = 200
    return task


register_action(delete_tasks, 'Delete tasks', 100, permissions='project.can_delete_tasks',
                dialog={'text': 'You are going to delete selected tasks. '
                                'Please, confirm your action.', 'type': 'confirm'})
register_action(delete_tasks_completions, 'Delete completions', 101, permissions='project.can_manage_completions',
                dialog={'text': 'You are going to delete all completions from selected tasks. '
                                'Please, confirm your action.', 'type': 'confirm'})
register_action(propagate_completions, 'Propagate completions', 1, experimental=True,
                dialog={'text': 'This action will pick the first completion from the first selected task, '
                                'create new completions for all selected tasks, '
                                'and propagate the first completion to others. ' +
                                '.' * 80 +
                                '1. Create the first completion for task A. '
                                '2. Select task A with checkbox as first selected item. '
                                '3. Select other tasks where you want to copy the first completion from task A. '
                                '4. Click Propagate completions. ' +
                                '.' * 80 +
                                '! Warning: it is an experimental feature! It could work well with Choices, '
                                'but other annotation types (RectangleLabels, Text Labels, etc) '
                                'will have a lot of issues.',
                        'type': 'confirm'})
register_action(predictions_to_completions, 'Predictions => completions', 1, experimental=True,
                dialog={'text': 'This action will create a new completion from the last task prediction '
                                'for each selected task.',
                        'type': 'confirm'})

register_action(next_task, 'Generate next task', 0, hidden=True)
