"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from core.utils.common import find_editor_files
from core.version import get_short_version


@login_required
def task_page(request, pk):
    response = {
        'version': get_short_version()
    }
    response.update(find_editor_files())
    return render(request, 'base.html', response)
