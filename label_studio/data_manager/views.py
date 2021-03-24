"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.shortcuts import redirect, render, reverse
from rules.contrib.views import permission_required, objectgetter

from core.permissions import (IsBusiness, get_object_with_permissions, view_with_auth)
from core.utils.common import get_object_with_check_and_log, find_editor_files, get_organization_from_request
from core.version import get_short_version
from organizations.models import Organization
from projects.models import Project


@view_with_auth(['GET'], (IsBusiness,))
# @permission_required('tasks.delete_task', fn=objectgetter(Project, 'pk'), raise_exception=True)
def task_page(request, pk):
    org_pk = get_organization_from_request(request)
    org = get_object_with_permissions(request, Organization, org_pk, 'organizations.view_organization')
    project = get_object_with_check_and_log(request, Project, pk=pk)

    response = {
        'project': project,
        'version': get_short_version()
    }
    response.update(find_editor_files())
    return render(request, 'data_manager/data.html', response)
