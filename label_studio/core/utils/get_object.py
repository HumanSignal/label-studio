"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

logger = logging.getLogger(__name__)


def get_object_with_check_and_log(request, queryset, *filter_args, **filter_kwargs):
    """ Custom get function:
        - if project is deleted - return 404 instead
        - activity log payload is created via 'request_permissions_add'
    """
    from rest_framework.generics import get_object_or_404 as get_object_or_404_rest
    from core.utils.common import get_project, request_permissions_add

    obj = get_object_or_404_rest(queryset, *filter_args, **filter_kwargs)
    # check current Project, raise 404 if it's deleted or create activity log payload
    try:
        project = get_project(obj)
    except AttributeError:
        logger.debug('Can\'t get Project')
        pass
    else:
        request_permissions_add(request, 'project', project)

    return obj
