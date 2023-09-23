"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging

import lxml.etree
from core.label_config import get_sample_task
from core.utils.common import get_organization_from_request
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from organizations.models import Organization
from projects.models import Project
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


@login_required
def project_list(request):
    return render(request, 'projects/list.html')


@login_required
def project_settings(request, pk, sub_path):
    return render(request, 'projects/settings.html')


def playground_replacements(request, task_data):
    if request.GET.get('playground', '0') == '1':
        for key in task_data:
            if '/samples/time-series.csv' in task_data[key]:
                task_data[key] = 'https://app.heartex.ai' + task_data[key]
    return task_data


@require_http_methods(['GET', 'POST'])
def upload_example_using_config(request):
    """Generate upload data example by config only"""
    config = request.GET.get('label_config', '')
    if not config:
        config = request.POST.get('label_config', '')

    org_pk = get_organization_from_request(request)
    secure_mode = False
    if org_pk is not None:
        org = generics.get_object_or_404(Organization, pk=org_pk)
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
