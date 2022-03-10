"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.shortcuts import render
from django.contrib.auth.decorators import login_required


@login_required
def organization_people_list(request):
    return render(request, 'organizations/people_list.html')

@login_required
def simple_view(request):
    return render(request, 'organizations/people_list.html')
