"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.shortcuts import render
from rules.contrib.views import permission_required
from rest_framework.permissions import IsAuthenticated
from core.permissions import view_with_auth, all_permissions


@view_with_auth(['GET'], (IsAuthenticated,))
@permission_required(all_permissions.organizations_change)
def organization_people_list(request):
    return render(request, 'organizations/people_list.html', {
        'user': request.user,
    })
