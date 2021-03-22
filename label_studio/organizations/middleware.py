"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from organizations.models import Organization


logger = logging.getLogger(__name__)


class DummyGetSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        org = Organization.objects.first()
        user = request.user
        if user and user.is_authenticated and user.active_organization is None:
            user.active_organization = org
            user.save(update_fields=['active_organization'])
        if org is not None:
            request.session['organization_pk'] = org.id
        response = self.get_response(request)
        return response

