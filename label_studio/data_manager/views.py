"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from core.feature_flags import flag_set
from core.utils.common import find_editor_files
from core.version import get_short_version
from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def task_page(request, pk):
    ff_zendesk_widget = flag_set('fflag_feat_dia_787_zendesk_widget_integration', user='auto')
    response = {
        'version': get_short_version(), 
        'ff_zendesk_widget': ff_zendesk_widget,
    }
    response.update(find_editor_files())
    return render(request, 'base.html', response)
