"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from projects.api import ProjectNextTaskAPI

logger = logging.getLogger(__name__)


def next_task(project, queryset, **kwargs):
    """ Generate next task for labeling stream

    :param project: project
    :param queryset: task ids to sample from
    :param kwargs: arguments from api request
    """
    kwargs['pk'] = project.pk
    api = ProjectNextTaskAPI(kwargs=kwargs)
    api.prepared_tasks = queryset

    response = api.get(request=kwargs['request'])
    result = response.data
    result['response_code'] = response.status_code
    return result


actions = [
    {
        'entry_point': next_task,
        'title': 'Generate next task',
        'order': 0,
        'hidden': True
    }
]
