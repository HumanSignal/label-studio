""" Actions for tasks and annotations provided by data manager
    All actions are stored in _actions dict.
    Data manager uses _actions to know the list of available actions,
    they are called by entry_points from _actions dict items.
"""
import logging

from copy import copy
from label_studio.data_manager.functions import DataManagerException
from label_studio.utils.uri_resolver import resolve_task_data_uri

logger = logging.getLogger(__name__)
_actions = {}


def get_all_actions(project):
    """ Return dict with registered actions
    """
    # copy and sort by order key
    actions = list(_actions.values())
    actions = sorted(actions, key=lambda x: x['order'])
    actions = [copy(action) for action in actions]
    for i, _ in enumerate(actions):
        if actions[i].get('hidden', False):
            continue
        actions[i].pop('entry_point')  # exclude entry points
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
    return {'processed_items': len(items)}


def delete_tasks_completions(project, params, items):
    """ Delete all completions by tasks ids
    """
    project.delete_tasks_completions(items)
    return {'processed_items': len(items)}


def next_task(project, params, items):
    """ Generate next task for labeling stream
    """
    # try to find task is not presented in completions
    completed_tasks_ids = project.get_completions_ids()
    task = project.next_task(completed_tasks_ids, task_ids=items,
                             sampling=params.values.get('sampling', None))
    if task is None:
        # no tasks found
        return {'response_code': 404}

    task = resolve_task_data_uri(task, project=project)

    # collect prediction from multiple ml backends
    if project.ml_backends_connected:
        task = project.make_predictions(task)

    logger.debug('Next task:\n' + str(task.get('id', None)))
    task['response_code'] = 200
    return task


register_action(delete_tasks, 'Delete tasks', 100)
register_action(delete_tasks_completions, 'Delete completions', 101)
register_action(next_task, 'Generate next task', 0, hidden=True)
