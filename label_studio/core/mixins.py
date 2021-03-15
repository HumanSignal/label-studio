"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging

from django.shortcuts import redirect
from django.urls import reverse
from django.http import HttpResponseNotAllowed


logger = logging.getLogger(__name__)


class APIViewVirtualRedirectMixin(object):        
    def post(self, request, *args, **kwargs):
        red = self.request.POST.get('_redirect', '').lower()
        method = self.request.POST.get('_method', '').lower()

        res = super(APIViewVirtualRedirectMixin, self).post(request, *args, **kwargs)

        if red == 'true':
            if method == "delete" and hasattr(self, 'redirect_delete_route'):
                return redirect(reverse(self.redirect_delete_route))
            elif hasattr(self, 'redirect_route_callback'):
                return redirect(self.redirect_route_callback(**self.request.POST))
            elif hasattr(self, 'redirect_kwarg'):
                return redirect(reverse(self.redirect_route,
                                        kwargs={'pk': self.kwargs[self.redirect_kwarg]}))
            else:
                return redirect(reverse(self.redirect_route))
        else:
            return res


class APIViewVirtualMethodMixin(object):
    def post(self, request, *args, **kwargs):
        method = self.request.POST.get('_method', '').lower()

        if method == 'put':
            res = self.put(request, *args, **kwargs)
        elif method == 'delete':
            res = self.delete(request, *args, **kwargs)
        elif method == 'patch':
            res = self.patch(request, *args, **kwargs)
        else:
            if hasattr(super(APIViewVirtualMethodMixin, self), 'post'):
                res = super(APIViewVirtualMethodMixin, self).post(request, *args, **kwargs)
            else:
                return HttpResponseNotAllowed(permitted_methods=[])

        return res


class RequestDebugLogMixin(object):

    def initial(self, request, *args, **kwargs):
        try:
            logger.debug(f'Request to {request.path}:\n{json.dumps(request.data, indent=2)}')
        except Exception as exc:
            logger.error(exc, exc_info=True)
        super(RequestDebugLogMixin, self).initial(request, *args, **kwargs)
