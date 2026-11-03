"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from core.version import get_short_version
from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def task_page(request, pk):
    """Render the data manager shell.

    Responsibility: return the HTML shell for the project data page.

    Boundary: does not load the project or embed its title or task data,
    including when the user cannot access that project. Project data is loaded
    by the API. Login is required; this view does not grant project access.
    """
    response = {'version': get_short_version()}
    return render(request, 'base.html', response)
