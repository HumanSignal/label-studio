""" Actions for tasks and annotations provided by data manager
    All actions are stored in _actions dict.
    Data manager uses _actions to know the list of available actions,
    they are called by entry_points from _actions dict items.
"""
from label_studio.data_manager.functions import DataManagerException

_actions = {}


def get_all_actions(project, include_entry_points=False):
    """ Return dict with registered actions
    """
    actions = {key: _actions[key] for key in _actions}  # copy
    if not include_entry_points:
        for key in actions:
            actions[key].pop('entry_point')  # exclude entry points
        return _actions


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
    project.delete_a
    return {'deleted': 42}


def delete_completions(project, tab, items):
    return {'deleted': 42}


register_action('delete_tasks', 'Delete tasks', 100, delete_tasks)
register_action('delete_completions', 'Delete completions', 101, delete_completions)
