"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging
import lxml.etree
from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rules.contrib.views import objectgetter, permission_required
from projects.models import Project

from core.utils.common import get_object_with_check_and_log
from core.permissions import IsBusiness, view_with_auth
from core.label_config import get_sample_task
from core.utils.common import get_organization_from_request

from organizations.models import Organization

logger = logging.getLogger(__name__)


@view_with_auth(['GET'], (IsBusiness,))
def project_list(request):
    return render(request, 'projects/list.html', {})


@view_with_auth(['GET', 'POST'], (IsBusiness,))
@permission_required('projects.add_project', fn=Organization.from_request, raise_exception=True)
def project_create(request):
    """ Create new project

    Create a new project linked to the business account
    """
    return render(request, 'projects/create.html', {})


@view_with_auth(['GET'], (IsBusiness,))
@permission_required('projects.change_project', fn=objectgetter(Project, 'pk'), raise_exception=True)
def project_settings(request, pk):
    project = get_object_with_check_and_log(request, Project, pk=pk)
    return render(request, 'projects/settings.html', {
        'project': project,
    })


def playground_replacements(request, task_data):
    if request.GET.get('playground', '0') == '1':
        for key in task_data:
            if "/samples/time-series.csv" in task_data[key]:
                task_data[key] = "https://app.heartex.ai" + task_data[key]
    return task_data


@require_http_methods(['GET', 'POST'])
def upload_example_using_config(request):
    """ Generate upload data example by config only
    """
    config = request.GET.get('label_config', '')
    if not config:
        config = request.POST.get('label_config', '')

    org_pk = get_organization_from_request(request)
    secure_mode = False
    if org_pk is not None:
        org = get_object_with_check_and_log(request, Organization, pk=org_pk)
        secure_mode = org.secure_mode

    try:
        Project.validate_label_config(config)
        task_data, _, _ = get_sample_task(config, secure_mode)
        task_data = playground_replacements(request, task_data)
    except (ValueError, ValidationError, lxml.etree.Error):
        response = HttpResponse('error while example generating', status=status.HTTP_400_BAD_REQUEST)
    else:
        response = HttpResponse(json.dumps(task_data))
    return response
