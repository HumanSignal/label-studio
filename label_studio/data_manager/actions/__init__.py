"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
""" Actions for tasks and annotations provided by data manager.
    All actions are stored in settings.DATA_MANAGER_ACTIONS dict.
    Data manager uses settings.DATA_MANAGER_ACTIONS to know the list of available actions,
    they are called by entry_points from settings.DATA_MANAGER_ACTIONS dict items.
"""
import os
import copy
import logging
import traceback as tb

from importlib import import_module

from django.conf import settings
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied

from data_manager.functions import DataManagerException
from core.feature_flags import flag_set

logger = logging.getLogger('django')


def check_permissions(user, action):
    """ Actions must have permissions, if only one is in the user role then the action is allowed
    """
    if 'permission' not in action:
        logger.error('Action must have "permission" field: %s', str(action))
        return False

    return user.has_perm(action['permission'])


def get_all_actions(user, project):
    """ Return dict with registered actions

    :param user: list with user permissions
    :param project: current project
    """
    # copy and sort by order key
    actions = list(settings.DATA_MANAGER_ACTIONS.values())
    actions = copy.deepcopy(actions)
    actions = sorted(actions, key=lambda x: x['order'])
    actions = [
        {key: action[key] for key in action if key != 'entry_point'}
        for action in actions if not action.get('hidden', False)
        and check_permissions(user, action)
    ]
    # remove experimental features if they are disabled
    if not (
            flag_set('ff_back_experimental_features', user=project.organization.created_by)
            or settings.EXPERIMENTAL_FEATURES
    ):
        actions = [action for action in actions if not action.get('experimental', False)]

    # generate form if function is passed
    for action in actions:
        form_generator = action.get('dialog', {}).get('form')
        if callable(form_generator):
            action['dialog']['form'] = form_generator(user, project)

    return actions


def register_action(entry_point, title, order, **kwargs):
    """ Register action in global _action instance,
        action_id will be automatically extracted from entry_point function name
    """
    action_id = entry_point.__name__
    if action_id in settings.DATA_MANAGER_ACTIONS:
        logger.debug('Action with id "' + action_id + '" already exists, rewriting registration')

    settings.DATA_MANAGER_ACTIONS[action_id] = {
        'id': action_id,
        'title': title,
        'order': order,
        'entry_point': entry_point,
        **kwargs
    }


def register_actions_from_dir(base_module, action_dir):
    """ Find all python files nearby this file and try to load 'actions' from them
    """
    for path in os.listdir(action_dir):
        # skip non module files
        if '__init__' in path or path.startswith('.'):
            continue

        name = path[0:path.find('.py')]  # get only module name to read *.py and *.pyc
        try:
            module = import_module(f'{base_module}.{name}')
            if not hasattr(module, 'actions'):
                continue
            module_actions = module.actions
        except ModuleNotFoundError as e:
            logger.info(e)
            continue

        for action in module_actions:
            register_action(**action)
            logger.debug('Action registered: ' + str(action['entry_point'].__name__))


def perform_action(action_id, project, queryset, user, **kwargs):
    """ Perform action using entry point from actions
    """
    if action_id not in settings.DATA_MANAGER_ACTIONS:
        raise DataManagerException("Can't find '" + action_id + "' in registered actions")

    action = settings.DATA_MANAGER_ACTIONS[action_id]

    # check user permissions for this action
    if not check_permissions(user, action):
        raise DRFPermissionDenied(f'Action is not allowed for the current user: {action["id"]}')


    try:
        result = action['entry_point'](project, queryset, **kwargs)
    except Exception as e:
        text = 'Error while perform action: ' + action_id + '\n' + tb.format_exc()
        logger.error(text, extra={'sentry_skip': True})
        raise e

    return result


register_actions_from_dir('data_manager.actions', os.path.dirname(__file__))
