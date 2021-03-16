"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import json

from django.middleware.common import CommonMiddleware
from organizations.models import Organization


logger = logging.getLogger(__name__)


class DummyGetSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        org = Organization.objects.first()
        if org is not None:
            request.session['organization_pk'] = org.id
        response = self.get_response(request)
        return response


class GetSessionMiddleware(CommonMiddleware):

    def __init__(self, get_response):
        super(GetSessionMiddleware, self).__init__(get_response)
        self.get_response = get_response

    def _get_organization_pk(self, request):
        maybe_request = request.POST.get('organization_pk', None) or request.GET.get('organization_pk', None) or \
                        request.POST.get('organization_id', None) or request.GET.get('organization_id', None)
        if maybe_request is not None:
            return maybe_request
        if hasattr(request, 'body'):
            try:
                data = json.loads(request.body)
                if 'organization_id' in data:
                    return data['organization_id']
                if 'organization_pk' in data:
                    return data['organization_pk']
            except:
                return None

    def _flush_session(self, request):
        if request.user.is_authenticated:
            logger.error(f'Session is broken: "organization_pk" not found: will flush session to enforce user relogin')
            request.session.flush()

    def _org_member_whitelist(self, request):
        """Ignore inspecting specific endpoints against project members:
        they fall into the scenario where user is already authorized, but organization/project membership state not set
        """
        path = request.path
        return any((
            'annotator/invites' in path,
            'organization/welcome' in path
        ))

    def process_request(self, request):
        request.saved_body = request.body
        if self._org_member_whitelist(request):
            return self.get_response(request)

        if 'organization_pk' not in request.session:
            org_pk = self._get_organization_pk(request)
            # import pdb; pdb.set_trace()
            if org_pk is not None:
                logger.debug(f'Getting organization {org_pk} from request')
                request.session['organization_pk'] = org_pk
                request.session.modified = True
            else:
                self._flush_session(request)
        else:
            org_pk = request.session['organization_pk']
            logger.debug(f'Getting organization {org_pk} from session')

        if org_pk is not None:
            # Check whether requested organization still has current user as a member
            org = Organization.objects.filter(pk=org_pk)

            if org.count() == 1:
                org = org.first()
                user = request.user
                if user.is_authenticated  and not org.has_user(user) and not org.has_project_member(user):
                    # organization is specified, but there is no such member - possibly organization/project has been deleted
                    self._flush_session(request)
                    logger.warning(f'User {user} is not a member of org={org}')
            else:
                logger.error(f'Found {org.count()} organizations with pk={org_pk}')

        return self.get_response(request)
