""" Actions for tasks and annotations provided by data manager
    All actions are stored in _actions dict.
    Data manager uses _actions to know the list of available actions,
    they are called by entry_points from _actions dict items.
"""
from copy import copy
from label_studio.data_manager.functions import DataManagerException

_actions = {}


def get_all_actions(project):
    """ Return dict with registered actions
    """
    # copy and sort by order key
    actions = list(_actions.values())
    actions = sorted(actions, key=lambda x: x['order'])
    actions = [copy(action) for action in actions]
    for i, _ in enumerate(actions):
        actions[i].pop('entry_point')  # exclude entry points
    return actions


def register_action(action_id, title, order, entry_point):
    """ Register action in global _action instance
    """
    if action_id in _actions:
        raise IndexError('Action with id "' + action_id + '" already exists')

    _actions[action_id] = {
        'id': action_id,
        'title': title,
        'order': order,
        'entry_point': entry_point
    }


def perform_action(action_id, project, tab, items):
    """ Perform action using entry point from actions
    """
    if action_id not in _actions:
        raise DataManagerException("Can't find '" + action_id + "' in registered actions")

    return _actions[action_id]['entry_point'](project, tab, items)


def delete_tasks(project, tab, items):
    """ Delete tasks by ids
    """
    # if you want to use tab - don't forget about none check
    if tab is None:
        pass
    project.delete_tasks(items)
    return {'processed_items': len(items)}


def delete_tasks_completions(project, tab, items):
    """ Delete all completions by tasks ids
    """
    # if you want to use tab - don't forget about none check
    if tab is None:
        pass
    project.delete_tasks_completions(items)
    return {'processed_items': len(items)}


register_action('delete_tasks', 'Delete tasks', 100, delete_tasks)
register_action('delete_completions', 'Delete completions', 101, delete_tasks_completions)
