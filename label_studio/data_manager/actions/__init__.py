"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
""" Actions for tasks and annotations provided by data manager.
    All actions are stored in _actions dict.
    Data manager uses _actions to know the list of available actions,
    they are called by entry_points from _actions dict items.
"""
import os
import logging
import traceback as tb

from importlib import import_module

from data_manager.functions import DataManagerException

logger = logging.getLogger('django')
_actions = {}


def check_permissions(params, action):
    """ Some actions might have a permissions to perform
    """
    if 'permissions' in action:
        field = action['permissions']
        return params[field]
    else:
        return True


def get_all_actions(params):
    """ Return dict with registered actions

    :param params: dict with permissions and other flags
    """
    # copy and sort by order key
    actions = list(_actions.values())
    actions = sorted(actions, key=lambda x: x['order'])
    actions = [
        {key: action[key] for key in action if key != 'entry_point'}
        for action in actions if not action.get('hidden', False)
        and check_permissions(params, action)
    ]
    # remove experimental features if they are disabled
    if not params.get('experimental_features', False):
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


def register_all_actions():
    """ Find all python files nearby this file and try to load 'actions' from them
    """
    for path in os.listdir(os.path.dirname(__file__)):
        if '.py' in path and '__init__' not in path:
            name = path[0:path.find('.py')]  # get only module name to read *.py and *.pyc
            module_actions = import_module('data_manager.actions.' + name).actions

            for action in module_actions:
                register_action(**action)
                logger.debug('Action registered: ' + str(action['entry_point'].__name__))


def perform_action(action_id, project, queryset, **kwargs):
    """ Perform action using entry point from actions
    """
    if action_id not in _actions:
        raise DataManagerException("Can't find '" + action_id + "' in registered actions")

    try:
        result = _actions[action_id]['entry_point'](project, queryset, **kwargs)
    except Exception as e:
        text = 'Error while perform action: ' + action_id + '\n' + tb.format_exc()
        logger.error(text)
        raise e

    return result


register_all_actions()
