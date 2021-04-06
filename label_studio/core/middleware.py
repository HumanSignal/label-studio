"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import time

from uuid import uuid4
from django.http import HttpResponsePermanentRedirect
from django.utils.deprecation import MiddlewareMixin
from django.core.handlers.base import BaseHandler
from django.core.exceptions import MiddlewareNotUsed
from django.middleware.common import CommonMiddleware
from django.conf import settings
from django.utils import timezone
from django.utils.http import escape_leading_slashes
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response
from core.utils.contextlog import ContextLog


class DisableCSRF(MiddlewareMixin):
    def process_request(self, request):
        setattr(request, '_dont_enforce_csrf_checks', True)


class HttpSmartRedirectResponse(HttpResponsePermanentRedirect):
    pass


class CommonMiddlewareAppendSlashWithoutRedirect(CommonMiddleware):
    """ This class converts HttpSmartRedirectResponse to the common response
        of Django view, without redirect. This is necessary to match status_codes
        for urls like /url?q=1 and /url/?q=1. If you don't use it, you will have 302
        code always on pages without slash.
    """
    response_redirect_class = HttpSmartRedirectResponse

    def __init__(self, *args, **kwargs):
        # create django request resolver
        self.handler = BaseHandler()

        # prevent recursive includes
        old = settings.MIDDLEWARE
        name = self.__module__ + '.' + self.__class__.__name__
        settings.MIDDLEWARE = [i for i in settings.MIDDLEWARE if i != name]

        self.handler.load_middleware()

        settings.MIDDLEWARE = old
        super(CommonMiddlewareAppendSlashWithoutRedirect, self).__init__(*args, **kwargs)

    def get_full_path_with_slash(self, request):
        """ Return the full path of the request with a trailing slash appended
            without Exception in Debug mode
        """
        new_path = request.get_full_path(force_append_slash=True)
        # Prevent construction of scheme relative urls.
        new_path = escape_leading_slashes(new_path)
        return new_path

    def process_response(self, request, response):
        response = super(CommonMiddlewareAppendSlashWithoutRedirect, self).process_response(request, response)

        if isinstance(response, HttpSmartRedirectResponse):
            if not request.path.endswith('/'):
                # remove prefix SCRIPT_NAME
                path = request.path[len(settings.FORCE_SCRIPT_NAME):] if settings.FORCE_SCRIPT_NAME \
                    else request.path
                request.path = path + '/'
            # we don't need query string in path_info because it's in request.GET already
            request.path_info = request.path
            response = self.handler.get_response(request)

        return response


class SetSessionUIDMiddleware(CommonMiddleware):

    def process_request(self, request):
        if 'uid' not in request.session:
            request.session['uid'] = str(uuid4())


class ContextLogMiddleware(CommonMiddleware):

    def __init__(self, get_response):
        self.get_response = get_response
        self.log = ContextLog()

    def __call__(self, request):
        try:
            body = json.loads(request.body)
        except:
            body = {}
        response = self.get_response(request)
        self.log.send(request=request, response=response, body=body)
        return response


class DRFResponseFormatter(CommonMiddleware):
    """ This class takes DRF Response and formats it to standard presentation.
    For example, if response = "test string" then response will be reformatted to {"detail": "test string"}
    """
    def __init__(self, get_response):
        super(DRFResponseFormatter, self).__init__(get_response)
        self.get_response = get_response

    def process_response(self, request, response):
        # affect only DRF Response
        if isinstance(response, Response):
            if isinstance(response.data, str):
                response.data = {'detail': response.data}
                response._is_rendered = False
                response.render()

        return response


class DatabaseIsLockedRetryMiddleware(CommonMiddleware):
    """Workaround for sqlite performance issues
    we wait and retry request if database is locked"""

    def __init__(self, get_response):
        if settings.DJANGO_DB != settings.DJANGO_DB_SQLITE:
            raise MiddlewareNotUsed()
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        retries_number = 0
        sleep_time = 1
        backoff = 1.5
        while (
            response.status_code == 500
            and hasattr(response, 'content')
            and b'database-is-locked-error' in response.content
            and retries_number < 15
        ):
            time.sleep(sleep_time)
            response = self.get_response(request)
            retries_number += 1
            sleep_time *= backoff
        return response


class UpdateLastActivityMiddleware(CommonMiddleware):
    def process_view(self, request, view_func, view_args, view_kwargs):
        if hasattr(request, 'user') and request.method not in SAFE_METHODS:
            if request.user.is_authenticated:
                request.user.update_last_activity()
