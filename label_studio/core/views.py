"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import io
import sys
import json
import logging
import pandas as pd
import posixpath
import mimetypes

from pathlib import Path
from django.utils._os import safe_join
from django.conf import settings
from django.contrib.auth import logout
from django.http import HttpResponse, HttpResponseServerError, HttpResponseForbidden, HttpResponseNotFound
from django.shortcuts import redirect, reverse
from django.template import loader
from ranged_fileresponse import RangedFileResponse
from django.http import JsonResponse
from wsgiref.util import FileWrapper
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from django.db.models import Value, F, CharField

from core import utils
from core.utils.io import find_file
from core.label_config import generate_time_series_json
from core.utils.common import collect_versions
from io_storages.localfiles.models import LocalFilesImportStorage
from core.feature_flags import all_flags


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
    user = request.user
    path = request.GET.get('d')
    if settings.LOCAL_FILES_SERVING_ENABLED is False:
        return HttpResponseForbidden("Serving local files can be dangerous, so it's disabled by default. "
                                     'You can enable it with LOCAL_FILES_SERVING_ENABLED environment variable, '
                                     'please check docs: https://labelstud.io/guide/storage.html#Local-storage')

    local_serving_document_root = settings.LOCAL_FILES_DOCUMENT_ROOT
    if path and request.user.is_authenticated:
        path = posixpath.normpath(path).lstrip('/')
        full_path = Path(safe_join(local_serving_document_root, path))
        user_has_permissions = False

        # Try to find Local File Storage connection based prefix:
        # storage.path=/home/user, full_path=/home/user/a/b/c/1.jpg =>
        # full_path.startswith(path) => True
        localfiles_storage = LocalFilesImportStorage.objects \
            .annotate(_full_path=Value(os.path.dirname(full_path), output_field=CharField())) \
            .filter(_full_path__startswith=F('path'))
        if localfiles_storage.exists():
            user_has_permissions = any(storage.project.has_permission(user) for storage in localfiles_storage)

        if user_has_permissions and os.path.exists(full_path):
            content_type, encoding = mimetypes.guess_type(str(full_path))
            content_type = content_type or 'application/octet-stream'
            return RangedFileResponse(request, open(full_path, mode='rb'), content_type)
        else:
            return HttpResponseNotFound()

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


def feature_flags(request):
    user = request.user
    if not user.is_authenticated:
        return HttpResponseForbidden()
    return HttpResponse(json.dumps(all_flags(request.user), indent=4), status=200)
