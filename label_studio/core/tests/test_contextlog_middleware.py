"""Regression tests for issue #6794.

ContextLogMiddleware used to read request.body eagerly on every request. For
uploads larger than settings.DATA_UPLOAD_MAX_MEMORY_SIZE that read raises
RequestDataTooBig mid-stream, leaving the request marked as read without a
cached body, so the view's later body access (data_import's load_tasks ->
DRF request.FILES -> _parse -> stream -> body) raised RawPostDataException
("You cannot access body after reading from request's data stream") and the
import API answered 500 instead of handling the upload.
"""

import io

import pytest
from django.core.exceptions import RequestDataTooBig
from django.http import HttpResponse, RawPostDataException
from django.test import RequestFactory, override_settings
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.request import Request

from core.middleware import ContextLogMiddleware

# the parser classes ImportAPI (data_import/api.py) is configured with
IMPORT_PARSERS = [JSONParser(), MultiPartParser(), FormParser()]


class TestContextLogMiddlewareLargeBody:
    @staticmethod
    def _oversize_post(content_type):
        return RequestFactory().post(
            '/api/projects/1/import',
            data=b'a' * 2048,  # double DATA_UPLOAD_MAX_MEMORY_SIZE below
            content_type=content_type,
        )

    @override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=1024, COLLECT_ANALYTICS=False)
    def test_large_json_body_raises_data_too_big_not_raw_post_data(self):
        """Over-limit body: the view's own read raises Django's RequestDataTooBig
        (which maps to a clean 400), not the mid-stream RawPostDataException
        500 from the issue."""
        request = self._oversize_post('application/json')

        ContextLogMiddleware(lambda req: HttpResponse('ok'))(request)

        with pytest.raises(RequestDataTooBig):
            request.body

    @override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=1024, COLLECT_ANALYTICS=False)
    def test_within_limit_multipart_body_is_not_consumed_by_middleware(self):
        """A normal-size multipart import must reach the view with its stream
        intact, so request.FILES actually contains the uploaded files."""
        request = RequestFactory().post(
            '/api/projects/1/import',
            data={'file': io.BytesIO(b'{"tasks": []}')},
        )

        seen = {}

        def view(req):
            seen['files'] = list(req.FILES)
            return HttpResponse('ok')

        ContextLogMiddleware(view)(request)

        assert 'file' in seen['files']

    @override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=1024, COLLECT_ANALYTICS=False)
    def test_large_upload_view_gets_data_not_raw_post_data_exception(self):
        """ImportAPI's load_tasks does len(request.FILES) on the DRF request."""
        request = self._oversize_post('multipart/form-data')

        view_error = {}

        def view(req):
            try:
                Request(req, parsers=IMPORT_PARSERS).FILES
            except Exception as exc:  # noqa: BLE001
                view_error['exc'] = exc
            return HttpResponse('ok')

        ContextLogMiddleware(view)(request)

        assert not isinstance(view_error.get('exc'), RawPostDataException), view_error

    @override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=1024, COLLECT_ANALYTICS=False)
    def test_small_json_body_is_still_read_for_context_log(self):
        request = RequestFactory().post('/api/tasks', data=b'{"text": "hello"}', content_type='application/json')
        request.session = {}

        ContextLogMiddleware(lambda req: HttpResponse('ok'))(request)

        # body stays available to the view, so the fix does not change the
        # middleware's behaviour for normal-size requests
        assert request.body == b'{"text": "hello"}'
