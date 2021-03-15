"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import re
from django.apps import apps
from django.db.models import (Q)

from core.utils.common import (create_hash)
from projects.models import (Project,
                             ProjectOnboardingSteps)
from tasks.models import (Task)

rq_logger = logging.getLogger('rq.worker')
logger = logging.getLogger(__name__)


def add_data_to_project(project, data_json):
    """ Add data to project
    """
    for d in data_json:
        Task.objects.create(project=project, data=d)


def generate_unique_title(created_by, title):
    """ Generate unique title by existing title

    :param created_by: user who wants to create project
    :param title: string
    :return: new title or title as is if it's unique across all created_by user projects
    """
    # check duplicates
    project_titles = Project.objects.filter(Q(created_by=created_by) & Q(title=title)).values('title')
    if {'title': title} in project_titles:
        s = re.search(r'( )\([0-9]+\)$', title)  # search 'name (1)' => (1)
        if s:
            i = int(s[0][2:-1]) + 1  # get (1) => 1 and add +1 => (2)
            title = title.replace(s[0], '')  # remove old (1)
        else:
            i = 1
        title = title + f' ({i})'

    return title


def duplicate_project(project, new_title, duplicate_tasks, owner=None):
    """ Duplicate (clone) project with new title and old tasks if need
    """
    # remember source project
    project_src = Project.objects.get(pk=project.pk)

    # duplicate project and add active connection
    old_pk = project.pk
    project.pk = None
    project.title = new_title
    project.is_published = False
    project.model_version = ''
    project.created_by = owner if owner is not None else project.created_by
    project.token = create_hash()
    project.save()

    # duplicate onboarding
    for step in ProjectOnboardingSteps.objects.all():
        project.onboarding_step_finished(step.code)

    # duplicate tasks
    if duplicate_tasks:
        tasks = Task.objects.filter(project__pk=old_pk)
        for task in tasks:
            task.project = project
            task.pk = None
            task.reset_updates()
        Task.objects.bulk_create(tasks)

    logger.info(f'Project "{project_src.title}" with owner = {project_src.created_by} duplicated to '
                f'"{new_title}" with duplicate tasks = {duplicate_tasks}, '
                f'and new owner = {owner}')
    return project
