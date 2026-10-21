"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from django.contrib.auth.decorators import login_required
from django.shortcuts import render

logger = logging.getLogger(__name__)


@login_required
def project_list(request):
    """Render the project list shell.

    Responsibility: return the HTML shell for the project list page.

    Boundary: does not load or embed project records. Project data is loaded
    by the API, which applies project visibility. Login is required; this view
    does not grant project access.
    """
    return render(request, 'projects/list.html')


@login_required
def project_settings(request, pk, sub_path):
    """Render the project settings shell.

    Responsibility: return the HTML shell for a project's settings page.

    Boundary: does not load the project or embed its title or other data,
    including when the user cannot access that project. Project data is loaded
    by the API. Login is required; this view does not grant project access.
    """
    return render(request, 'projects/settings.html')
