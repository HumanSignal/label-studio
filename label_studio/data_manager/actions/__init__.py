"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
""" Actions for tasks and annotations provided by data manager.
    All actions are stored in settings.DATA_MANAGER_ACTIONS dict.
    Data manager uses settings.DATA_MANAGER_ACTIONS to know the list of available actions,
    they are called by entry_points from settings.DATA_MANAGER_ACTIONS dict items.
"""
import copy
import logging
import os
import traceback as tb
from importlib import import_module
from typing import Callable, Optional, TypedDict, Union

from core.feature_flags import flag_set
from core.utils.common import load_func
from data_manager.functions import DataManagerException
from django.conf import settings
from rest_framework.exceptions import PermissionDenied

logger = logging.getLogger(__name__)


class DataManagerAction(TypedDict):
    entry_point: Callable
    permission: Union[str, list[str]]
    title: str
    order: int
    experimental: Optional[bool]
    dialog: dict
    hidden: Optional[bool]
    disabled: Optional[Callable]
    disabled_reason: Optional[str]


def check_action_permission(user, action, project):
    """Actions must have permissions, if only one is in the user role then the action is allowed"""
    if 'permission' not in action:
        logger.error('Action must have "permission" field: %s', str(action))
        return False

    permissions = action['permission']
    if not isinstance(permissions, list):
        permissions = [permissions]
    for permission in permissions:
        if not user.has_perm(permission):
            return False
    return True


def get_all_actions(user, project):
    """Return dict with registered actions

    :param user: list with user permissions
    :param project: current project
    """
    # copy and sort by order key
    actions = list(settings.DATA_MANAGER_ACTIONS.values())
    actions = copy.deepcopy(actions)
    actions: list[DataManagerAction] = sorted(actions, key=lambda x: x['order'])

    check_permission = load_func(settings.DATA_MANAGER_CHECK_ACTION_PERMISSION)
    actions = [
        {key: action[key] for key in action if key != 'entry_point'}
        for action in actions
        if not action.get('hidden', False) and check_permission(user, action, project)
    ]
    # remove experimental features if they are disabled
    if not (
        flag_set('ff_back_experimental_features', user=project.organization.created_by)
        or settings.EXPERIMENTAL_FEATURES
    ):
        actions = [action for action in actions if not action.get('experimental', False)]

    for action in actions:
        # remove form if generator is defined
        # will be loaded on demand in /api/actions/<action_id>/form
        form_generator = action.get('dialog', {}).get('form')
        if callable(form_generator):
            action['dialog']['form'] = None

        disabled_generator = action.get('disabled')
        if callable(disabled_generator):
            action['disabled'] = disabled_generator(user, project)

    return actions


def register_action(entry_point, title, order, **kwargs):
    """Register action in global _action instance,
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
        **kwargs,
    }


def register_actions_from_dir(base_module, action_dir):
    """Find all python files nearby this file and try to load 'actions' from them"""
    for path in os.listdir(action_dir):
        # skip non module files
        if '__init__' in path or '__pycache' in path or path.startswith('.'):
            continue

        name = path[0 : path.find('.py')]  # get only module name to read *.py and *.pyc
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
    """Perform action using entry point from actions"""
    if action_id not in settings.DATA_MANAGER_ACTIONS:
        raise DataManagerException("Can't find '" + action_id + "' in registered actions")

    action = settings.DATA_MANAGER_ACTIONS[action_id]
    check_permission = load_func(settings.DATA_MANAGER_CHECK_ACTION_PERMISSION)

    # check user permissions for this action
    if not check_permission(user, action, project):
        raise PermissionDenied(f'Action is not allowed for the current user: {action["id"]}')

    try:
        result = action['entry_point'](project, queryset, **kwargs)
    except Exception as e:
        text = 'Error while perform action: ' + action_id + '\n' + tb.format_exc()
        logger.error(text, extra={'sentry_skip': True})
        raise e

    return result


def get_action_form(action_id, project, user):
    if action_id not in settings.DATA_MANAGER_ACTIONS:
        raise DataManagerException("Can't find '" + action_id + "' in registered actions")

    action = settings.DATA_MANAGER_ACTIONS[action_id]
    check_permission = load_func(settings.DATA_MANAGER_CHECK_ACTION_PERMISSION)

    if not check_permission(user, action, project):
        raise PermissionDenied(f'Action is not allowed for the current user: {action["id"]}')

    form = action.get('dialog', {}).get('form')
    if callable(form):
        return form(user, project)
    return form or []


register_actions_from_dir('data_manager.actions', os.path.dirname(__file__))
