"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import io
import sys
import json
import logging

import pandas as pd

from django.conf import settings
from django.contrib.auth import logout
from django.http import HttpResponse, HttpResponseServerError, HttpResponseForbidden
from django.shortcuts import redirect, reverse
from django.template import loader
from django.views.static import serve
from django.http import JsonResponse
from wsgiref.util import FileWrapper
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema

from core import utils
from core.utils.io import find_file
from core.utils.params import get_env
from core.label_config import generate_time_series_json
from core.utils.common import collect_versions

logger = logging.getLogger(__name__)


_PARAGRAPH_SAMPLE = None


def main(request):
    user = request.user

    if user.is_authenticated:

        if user.active_organization is None and 'organization_pk' not in request.session:
            logout(request)
            return redirect(reverse('user-login'))

        # business mode access
        return redirect(reverse('projects:project-index'))

    # not authenticated
    return redirect(reverse('user-login'))


def version_page(request):
    """ Get platform version
    """
    # update latest version from pypi response
    # from label_studio.core.utils.common import check_for_the_latest_version
    # check_for_the_latest_version(print_message=False)
    http_page = request.path == '/version/'
    result = collect_versions(force=http_page)

    # html / json response
    if request.path == '/version/':
        # other settings from backend
        if request.user.is_superuser:
            result['settings'] = {key: str(getattr(settings, key)) for key in dir(settings)
                                  if not key.startswith('_') and not hasattr(getattr(settings, key), '__call__')}

        result = json.dumps(result, indent=2)
        result = result.replace('},', '},\n').replace('\\n', ' ').replace('\\r', '')
        return HttpResponse('<pre>' + result + '</pre>')
    else:
        return JsonResponse(result)


def health(request):
    """ System health info """
    logger.debug('Got /health request.')
    return HttpResponse(json.dumps({
        "status": "UP"
    }))


def metrics(request):
    """ Empty page for metrics evaluation """
    return HttpResponse('')


class TriggerAPIError(APIView):
    """ 500 response for testing """
    authentication_classes = ()
    permission_classes = ()

    @swagger_auto_schema(auto_schema=None)
    def get(self, request):
        raise Exception('test')


def editor_files(request):
    """ Get last editor files
    """
    response = utils.common.find_editor_files()
    return HttpResponse(json.dumps(response), status=200)


def custom_500(request):
    """ Custom 500 page """
    t = loader.get_template('500.html')
    type_, value, tb = sys.exc_info()
    return HttpResponseServerError(t.render({'exception': value}))


def samples_time_series(request):
    """ Generate time series example for preview
    """
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
        value_columns = range(1, max_column_n+1)

    ts = generate_time_series_json(time_column, value_columns, time_format)
    csv_data = pd.DataFrame.from_dict(ts).to_csv(index=False, header=header, sep=separator).encode('utf-8')

    # generate response data as file
    filename = 'time-series.csv'
    response = HttpResponse(csv_data, content_type='application/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response['filename'] = filename
    return response


def samples_paragraphs(request):
    """ Generate paragraphs example for preview
    """
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


def localfiles_data(request):
    """Serving files for LocalFilesImportStorage"""
    path = request.GET.get('d')
    if settings.LOCAL_FILES_SERVING_ENABLED is False:
        return HttpResponseForbidden("Serving local files can be dangerous, so it's disabled by default. "
                                     'You can enable it with LOCAL_FILES_SERVING_ENABLED environment variable')

    local_serving_document_root = get_env('LOCAL_FILES_DOCUMENT_ROOT', default='/')
    if path and request.user.is_authenticated:
        return serve(request, path, document_root=local_serving_document_root)

    return HttpResponseForbidden()


def static_file_with_host_resolver(path_on_disk, content_type):
    """ Load any file, replace {{HOSTNAME}} => settings.HOSTNAME, send it as http response
    """
    path_on_disk = os.path.join(os.path.dirname(__file__), path_on_disk)

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
