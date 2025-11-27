"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import io
import json
import logging
import os
from wsgiref.util import FileWrapper

import pandas as pd
import requests
from core import utils
from core.feature_flags import all_flags, flag_set, get_feature_file_path
from core.label_config import generate_time_series_json
from core.utils.common import collect_versions
from core.utils.io import find_file
from django.conf import settings
from django.contrib.auth import logout
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from django.shortcuts import redirect, render, reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from drf_spectacular.utils import extend_schema
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


_PARAGRAPH_SAMPLE = None


def main(request):
    user = request.user

    if user.is_authenticated:

        if user.active_organization is None and 'organization_pk' not in request.session:
            logout(request)
            return redirect(reverse('user-login'))

        # business mode access
        if flag_set('fflag_all_feat_dia_1777_ls_homepage_short', user):
            return render(request, 'home/home.html')
        else:
            return redirect(reverse('projects:project-index'))

    # not authenticated
    return redirect(reverse('user-login'))


def version_page(request):
    """Get platform version"""
    # update the latest version from pypi response
    # from label_studio.core.utils.common import check_for_the_latest_version
    # check_for_the_latest_version(print_message=False)
    http_page = request.path == '/version/'
    result = collect_versions(force=http_page)

    # html / json response
    if request.path == '/version/':
        # other settings from backend
        if not getattr(settings, 'CLOUD_INSTANCE', False) and request.user.is_superuser:
            result['settings'] = {
                key: str(getattr(settings, key))
                for key in dir(settings)
                if not key.startswith('_') and not hasattr(getattr(settings, key), '__call__')
            }

        result = json.dumps(result, indent=2, ensure_ascii=False)
        return HttpResponse('<pre>' + result + '</pre>')
    else:
        return JsonResponse(result)


def health(request):
    """System health info"""
    logger.debug('Got /health request.')
    return HttpResponse(json.dumps({'status': 'UP'}))


def metrics(request):
    """Empty page for metrics evaluation"""
    return HttpResponse('')


class TriggerAPIError(APIView):
    """500 response for testing"""

    authentication_classes = ()
    permission_classes = ()

    @extend_schema(exclude=True)
    def get(self, request):
        raise Exception('test')


def editor_files(request):
    """Get last editor files"""
    response = utils.common.find_editor_files()
    return HttpResponse(json.dumps(response), status=200)


def samples_time_series(request):
    """Generate time series example for preview"""
    time_column = request.GET.get('time', '')
    value_columns = request.GET.get('values', '').split(',')
    time_format = request.GET.get('tf')

    # separator processing
    separator = request.GET.get('sep', ',')
    separator = separator.replace('\\t', '\t')
    aliases = {'dot': '.', 'comma': ',', 'tab': '\t', 'space': ' '}
    if separator in aliases:
        separator = aliases[separator]

    # check headless or not
    header = True
    if all(n.isdigit() for n in [time_column] + value_columns):
        header = False

    # generate all columns for headless csv
    if not header:
        max_column_n = max([int(v) for v in value_columns] + [0])
        value_columns = range(1, max_column_n + 1)

    ts = generate_time_series_json(time_column, value_columns, time_format)
    csv_data = pd.DataFrame.from_dict(ts).to_csv(index=False, header=header, sep=separator).encode('utf-8')

    # generate response data as file
    filename = 'time-series.csv'
    response = HttpResponse(csv_data, content_type='application/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response['filename'] = filename
    return response


def samples_paragraphs(request):
    """Generate paragraphs example for preview"""
    global _PARAGRAPH_SAMPLE

    if _PARAGRAPH_SAMPLE is None:
        with open(find_file('paragraphs.json'), encoding='utf-8') as f:
            _PARAGRAPH_SAMPLE = json.load(f)
    name_key = request.GET.get('nameKey', 'author')
    text_key = request.GET.get('textKey', 'text')

    result = []
    for line in _PARAGRAPH_SAMPLE:
        result.append({name_key: line['author'], text_key: line['text']})

    return HttpResponse(json.dumps(result), content_type='application/json')


def heidi_tips(request):
    """Fetch live tips from github raw liveContent.json to avoid caching and client side CORS issues"""
    url = 'https://raw.githubusercontent.com/HumanSignal/label-studio/refs/heads/develop/web/apps/labelstudio/src/components/HeidiTips/liveContent.json'

    response = None
    try:
        response = requests.get(
            url,
            headers={'Cache-Control': 'no-cache', 'Content-Type': 'application/json', 'Accept': 'application/json'},
            timeout=5,
        )
        # Raise an exception for bad status codes to avoid caching
        response.raise_for_status()
    # Catch all exceptions and return either the status code if there was a response, or default to 404 if there are network issues
    # This is done this way to catch thrown exceptions from the request itself which will occur for air-gapped environments
    except Exception:
        # Any other HTTP error will return the error code, and other errors like connection/timeout errors will be a 404
        content = {}
        status_code = 404
        if response is not None:
            content['detail'] = response.reason
            status_code = response.status_code
        return HttpResponse(json.dumps(content), content_type='application/json', status=status_code)

    return HttpResponse(response.content, content_type='application/json')


def static_file_with_host_resolver(path_on_disk, content_type):
    """Load any file, replace {{HOSTNAME}} => settings.HOSTNAME, send it as http response"""
    path_on_disk = os.path.join(settings.STATIC_ROOT, path_on_disk)

    def serve_file(request):
        with open(path_on_disk, 'r') as f:
            body = f.read()
            body = body.replace('{{HOSTNAME}}', settings.HOSTNAME)

            out = io.StringIO()
            out.write(body)
            out.seek(0)

            wrapper = FileWrapper(out)
            response = HttpResponse(wrapper, content_type=content_type)
            response['Content-Length'] = len(body)
            return response

    return serve_file


def feature_flags(request):
    user = request.user
    if not user.is_authenticated:
        return HttpResponseForbidden()

    flags = all_flags(request.user)
    flags['$system'] = {
        'FEATURE_FLAGS_DEFAULT_VALUE': settings.FEATURE_FLAGS_DEFAULT_VALUE,
        'FEATURE_FLAGS_FROM_FILE': settings.FEATURE_FLAGS_FROM_FILE,
        'FEATURE_FLAGS_FILE': get_feature_file_path(),
        'VERSION_EDITION': settings.VERSION_EDITION,
        'CLOUD_INSTANCE': settings.CLOUD_INSTANCE if hasattr(settings, 'CLOUD_INSTANCE') else None,
    }

    return HttpResponse('<pre>' + json.dumps(flags, indent=4) + '</pre>', status=200)


@csrf_exempt
@require_http_methods(['POST', 'GET'])
def collect_metrics(request):
    """Lightweight endpoint to collect usage metrics from the frontend only when COLLECT_ANALYTICS is enabled"""
    return HttpResponse(status=204)
