"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.shortcuts import render
from rules.contrib.views import permission_required
from core.permissions import view_with_auth, IsBusiness

from .models import Organization


@view_with_auth(['GET'], (IsBusiness,))
@permission_required('organizations.change_organization', fn=Organization.from_request, raise_exception=True)
def organization_people_list(request):
    return render(request, 'organizations/people_list.html', {
        'user': request.user,
    })
