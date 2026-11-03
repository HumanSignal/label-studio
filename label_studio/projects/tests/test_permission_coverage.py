"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import inspect

from django.test import RequestFactory, TestCase
from django.urls import URLPattern, URLResolver, get_resolver
from projects.action_permissions import PERMISSION_ACTIONS, PUBLIC_VIEWS, resolve_permission_name
from rest_framework.views import APIView
from tasks.api import PredictionAPI

# File and proxy views authorize in the view body. Only these qualnames may
# appear in EXPLICIT_ENSURE_VIEWS, and only when their source calls ensure_*.
_FILE_OR_PROXY_VIEWS = frozenset(
    {
        'data_import.api.UploadedFileResponse',
        'data_import.api.DownloadStorageData',
        'data_import.api.FileUploadAPI',
        'data_export.api.ProjectExportFiles',
        'data_export.api.ProjectExportFilesAuthCheck',
        'data_export.api.ExportDownloadAPI',
        'io_storages.localfiles.views.localfiles_data',
        'io_storages.proxy_api.TaskResolveStorageUri',
        'io_storages.proxy_api.ProjectResolveStorageUri',
        'io_storages.react_code_proxy.ReactCodeTokenView',
        'io_storages.react_code_proxy.ReactCodeResolveView',
    }
)

# Views already calling ensure_project_visible or ensure_project_manage in source.
EXPLICIT_ENSURE_VIEWS = frozenset(
    {
        'data_import.api.UploadedFileResponse',
        'data_import.api.DownloadStorageData',
    }
)

_SKIPPED_METHODS = frozenset({'head', 'options', 'trace'})
_HANDLED_METHODS = ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')


def _walk(urlpatterns):
    for pattern in urlpatterns:
        if isinstance(pattern, URLResolver):
            yield from _walk(pattern.url_patterns)
        elif isinstance(pattern, URLPattern):
            yield pattern


def _unwrap(callback):
    seen = set()
    current = callback
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        yield current
        current = getattr(current, '__wrapped__', None)


def _view_class(callback):
    for current in _unwrap(callback):
        for attr in ('cls', 'view_class'):
            cls = getattr(current, attr, None)
            if isinstance(cls, type) and issubclass(cls, APIView):
                return cls
    return None


def _actions_map(callback):
    for current in _unwrap(callback):
        actions = getattr(current, 'actions', None)
        if actions:
            return actions
    return None


def _api_views():
    """Map each routed APIView subclass to the action maps mounted for it."""
    found = {}
    for pattern in _walk(get_resolver().url_patterns):
        cls = _view_class(pattern.callback)
        if cls is None:
            continue
        found.setdefault(cls, []).append(_actions_map(pattern.callback))
    return found


def _qualname(cls):
    return f'{cls.__module__}.{cls.__name__}'


def _implemented_http_methods(cls):
    allowed = {method.upper() for method in getattr(cls, 'http_method_names', [])}
    methods = []
    for method in _HANDLED_METHODS:
        if method not in allowed:
            continue
        handler = getattr(cls, method.lower(), None)
        if handler is None:
            continue
        func = getattr(handler, '__func__', handler)
        qualname = getattr(func, '__qualname__', '')
        if qualname.startswith('APIView.') or qualname.startswith('View.'):
            continue
        methods.append(method)
    return methods


def _permission_pairs(cls, action_maps):
    pairs = []
    seen = set()
    routed = False
    for actions in action_maps:
        if not actions:
            continue
        routed = True
        items = [
            (method.upper(), action)
            for method, action in actions.items()
            if method.lower() not in _SKIPPED_METHODS
        ]
        for item in items:
            if item not in seen:
                seen.add(item)
                pairs.append(item)
    if routed:
        return pairs
    for method in _implemented_http_methods(cls):
        pairs.append((method, None))
    return pairs


def _unmapped_reasons(cls, action_maps):
    pairs = _permission_pairs(cls, action_maps)
    if not pairs:
        return ['no HTTP method to resolve']
    view = cls.__new__(cls)
    factory = RequestFactory()
    reasons = []
    for method, action in pairs:
        request = getattr(factory, method.lower())('/')
        view.action = action
        name = resolve_permission_name(view, request)
        if name not in PERMISSION_ACTIONS:
            label = method if action is None else f'{method} {action}'
            reasons.append(f'{label} -> {name!r}')
    return reasons


class PermissionCoverageTests(TestCase):
    def test_every_api_view_is_public_mapped_or_explicit_ensure(self):
        """An API view with no mapped permission must fail this list.

        Production change that fails the test: a new APIView is routed without
        a PUBLIC_VIEWS entry, a permission_required string in PERMISSION_ACTIONS,
        or an EXPLICIT_ENSURE_VIEWS entry.
        """
        self.maxDiff = None
        missing = []
        for cls, action_maps in _api_views().items():
            name = _qualname(cls)
            if name in PUBLIC_VIEWS or name in EXPLICIT_ENSURE_VIEWS:
                continue
            reasons = _unmapped_reasons(cls, action_maps)
            if reasons:
                missing.append(f'{name}: {", ".join(reasons)}')
        self.assertEqual(missing, [])

    def test_explicit_ensure_views_are_file_proxies_that_call_ensure(self):
        """File and proxy views may skip permission_required only by calling ensure_*.

        Production change that fails the test: EXPLICIT_ENSURE_VIEWS names a view
        that is not a file or proxy view, or its source no longer calls
        ensure_project_visible or ensure_project_manage.
        """
        found = {_qualname(cls): cls for cls in _api_views()}
        self.assertTrue(EXPLICIT_ENSURE_VIEWS <= _FILE_OR_PROXY_VIEWS)
        self.assertTrue(EXPLICIT_ENSURE_VIEWS <= set(found))
        for name in sorted(EXPLICIT_ENSURE_VIEWS):
            source = inspect.getsource(found[name])
            self.assertTrue(
                'ensure_project_visible' in source or 'ensure_project_manage' in source,
                name,
            )

    def test_prediction_api_get_reads_tasks_and_other_methods_manage_predictions(self):
        """Prediction reads are task access; writes stay prediction management.

        Production change that fails the test: PredictionAPI GET no longer
        resolves tasks.view, or POST, PUT, PATCH, or DELETE no longer resolves
        predictions.any.
        """
        view = PredictionAPI.__new__(PredictionAPI)
        factory = RequestFactory()
        self.assertEqual(resolve_permission_name(view, factory.get('/')), 'tasks.view')
        for method_name in ('post', 'put', 'patch', 'delete'):
            request = getattr(factory, method_name)('/')
            self.assertEqual(resolve_permission_name(view, request), 'predictions.any')

    def test_project_action_permission_is_installed_by_default(self):
        """Authentication, then the action check, then the legacy object check.

        DRF stops at the first failure. The action class has to run before
        HasObjectPermission so a hidden project is NotFound, and after
        IsAuthenticated so an anonymous request stays unauthenticated.
        """
        from django.conf import settings

        self.assertEqual(
            settings.REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES'],
            [
                'rest_framework.permissions.IsAuthenticated',
                'projects.action_permissions.ProjectActionPermission',
                'core.api_permissions.HasObjectPermission',
            ],
        )
