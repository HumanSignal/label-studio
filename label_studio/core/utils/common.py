"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from __future__ import unicode_literals

import os
import io
import time
import copy
import logging
import hashlib
import requests
import socket
import random
import calendar
import uuid
import pytz
import pkg_resources
import ujson as json
import traceback as tb
import drf_yasg.openapi as openapi
import contextlib
import label_studio

from django.db import models, transaction
from django.template import loader
from django.http import HttpResponse
from django.utils.timezone import now
from django.utils.crypto import get_random_string
from django.utils.module_loading import import_string
from django.core.paginator import Paginator
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db.utils import OperationalError

from rest_framework.views import Response, exception_handler
from rest_framework import status
from rest_framework.exceptions import ErrorDetail

from lxml import objectify
from base64 import b64encode
from lockfile import LockFile
from datetime import datetime
from appdirs import user_cache_dir
from functools import wraps
from requests.auth import HTTPBasicAuth
from pkg_resources import parse_version
from colorama import Fore
from boxing import boxing

try:
    from sentry_sdk import capture_exception, set_tag
    sentry_sdk_loaded = True
except (ModuleNotFoundError, ImportError):
    sentry_sdk_loaded = False

from core import version
from core.utils.exceptions import LabelStudioDatabaseLockedException


# these functions will be included to another modules, don't remove them
from core.utils.params import (
    get_bool_env, bool_from_request, float_from_request, int_from_request
)

logger = logging.getLogger(__name__)
url_validator = URLValidator()


def _override_exceptions(exc):
    if isinstance(exc, OperationalError) and 'database is locked' in str(exc):
        return LabelStudioDatabaseLockedException()

    return exc


def custom_exception_handler(exc, context):
    """ Make custom exception treatment in RestFramework

    :param exc: Exception - you can check specific exception
    :param context: context
    :return: response with error desc
    """
    exception_id = uuid.uuid4()
    logger.error('{} {}'.format(exception_id, exc), exc_info=True)

    exc = _override_exceptions(exc)

    # error body structure
    response_data = {
        'id': exception_id,
        'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,  # default value
        'version': label_studio.__version__,
        'detail': 'Unknown error',  # default value
        'exc_info': None,
    }
    # try rest framework handler
    response = exception_handler(exc, context)
    if response is not None:
        response_data['status_code'] = response.status_code

        if 'detail' in response.data and isinstance(response.data['detail'], ErrorDetail):
            response_data['detail'] = response.data['detail']
            response.data = response_data
        # move validation errors to separate namespace
        else:
            response_data['detail'] = 'Validation error'
            response_data['validation_errors'] = response.data if isinstance(response.data, dict) else {'non_field_errors': response.data}
            response.data = response_data

    # non-standard exception
    else:
        if sentry_sdk_loaded:
            # pass exception to sentry
            set_tag('exception_id', exception_id)
            capture_exception(exc)

        exc_tb = tb.format_exc()
        logger.debug(exc_tb)
        response_data['detail'] = str(exc)
        response_data['exc_info'] = exc_tb
        response = Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data=response_data)

    return response


def directory_index(path, disk_path, prefix):
    c = {}
    t = loader.select_template(['log_files.html'])
    files = []

    for f in disk_path.iterdir():
        if not f.name.startswith('.'):
            url = str(f.relative_to(disk_path))
            if f.is_dir():
                url += '/'
            files.append(url)

    c.update({
        'prefix': prefix + path,
        'files': sorted(files)
    })
    return HttpResponse(t.render(c))


def iter_config_templates():
    templates_dir = os.path.join(os.path.dirname(__file__), '..', 'examples')
    for d in os.listdir(templates_dir):
        # check xml config file exists
        path = os.path.join(templates_dir, d, 'config.xml')
        if not os.path.exists(path):
            continue
        yield path


def get_config_templates():
    """ Get label config templates from directory (as usual 'examples' directory)
    """
    from collections import defaultdict, OrderedDict
    templates = defaultdict(lambda: defaultdict(list))

    for i, path in enumerate(iter_config_templates()):
        # open and check xml
        code = open(path).read()
        try:
            objectify.fromstring(code)
        except Exception as e:
            logger.error("Can't parse XML for label config template from " + path + ':' + str(e))
            continue

        # extract fields from xml and pass them to template
        try:
            json_string = code.split('<!--')[1].split('-->')[0]
            meta = json.loads(json_string)
        except Exception as e:
            logger.error("Can't parse meta info from label config: " + str(e))
            continue

        meta['pk'] = i
        meta['label_config'] = '-->\n'.join(code.split('-->\n')[1:])  # remove all comments at the beginning of code

        meta['category'] = meta['category'] if 'category' in meta else 'no category'
        meta['complexity'] = meta['complexity'] if 'complexity' in meta else 'no complexity'
        templates[meta['complexity']][meta['category']].append(meta)

    # sort by title
    ordering = {
        'basic': ['audio', 'image', 'text', 'html', 'time-series'],
        'advanced': ['layouts', 'nested', 'per-region', 'other', 'time-series']
    }
    ordered_templates = OrderedDict()
    for complexity in ['basic', 'advanced']:
        ordered_templates[complexity] = OrderedDict()
        # add the rest from categories not presented in manual ordering
        x, y = ordering[complexity], templates[complexity].keys()
        ordering[complexity] = x + list((set(x) | set(y)) - set(x))
        for category in ordering[complexity]:
            sort = sorted(templates[complexity][category], key=lambda z: z.get('order', None) or z['title'])
            ordered_templates[complexity][category] = sort

    return ordered_templates


class SimpleProfiler:
    def __init__(self):
        self.times = [('start', 0, time.time())]

    def checkpoint(self, name):
        self.times += [(name, time.time() - self.times[-1][2], time.time())]

    def print(self):
        logger.info('\n\n\n--- Simple Profiler ---')
        for t in self.times:
            logger.info('%0.4f' % t[1], t[0])
        logger.info('\n\n\n')


def upload_uuid_filename(instance, filename):
    """Upload filename with convention name

    Convention is to use name of class plus uuid of object, width and
    height. UUID is used to fix a privacy issue with private objects.

    """
    __, filename_ext = os.path.splitext(filename)
    parent = getattr(instance.group, instance.PARENT_ATTR)

    return '%s_%s_%d_%d%s' % (
        instance.PARENT_ATTR,
        parent.uuid,
        instance.width,
        instance.height,
        filename_ext.lower()
    )


def upload_random_filename(instance, filename):
    __, filename_ext = os.path.splitext(filename)

    return '%s_%s%s' % (
        get_random_string(),
        now().strftime("%Y%m%d%H%M%S"),
        filename_ext.lower(),
    )


def create_hash():
    """This function generate 40 character long hash"""
    h = hashlib.sha1()
    h.update(str(time.time()).encode('utf-8'))
    return h.hexdigest()[0:16]


def strfdelta(tdelta):
    hours, rem = divmod(tdelta.seconds, 3600)
    minutes, seconds = divmod(rem, 60)

    out = ''
    if tdelta.days > 0:
        out += str(tdelta.days) + (' days ' if tdelta.days > 1 else ' day ')

    if hours > 0:
        out += str(hours) + (' hours ' if hours > 1 else ' hour ')

    if minutes > 0:
        out += str(minutes) + ' min '

    if seconds > 0:
        out += str(seconds) + ' sec '

    return out


def remove_protocol_name(url):
    """ Remove http, https from url
    """
    return url.replace('http://', '').replace('https://', '').replace('ftp://', '')


def pretty_date(t):
    # check version is datetime
    is_timestamp = True
    if isinstance(t, datetime):
        t = str(int(t.timestamp()))

    # check if version is correct timestamp from string
    else:
        try:
            int(t)
        except (ValueError, TypeError):
            is_timestamp = False
        else:
            if datetime.fromtimestamp(int(t)) < datetime(1990, 1, 1):
                is_timestamp = False

    # pretty format if timestamp else print version as is
    if is_timestamp:
        timestamp = int(t)
        dt = datetime.fromtimestamp(timestamp)
        return dt.strftime(f'%d %b %Y %H:%M:%S.{str(t)[-3:]}')
    else:
        return t


def paginator(objects, request, default_page=1, default_size=50):
    """ Get from request page and page_size and return paginated objects

    :param objects: all queryset
    :param request: view request object
    :param default_page: start page if there is no page in GET
    :param default_size: page size if there is no page in GET
    :return: paginated objects
    """
    page_size = request.GET.get('page_size', request.GET.get('length', default_size))
    if 'start' in request.GET:
        page = int_from_request(request.GET, 'start', default_page)
        page = page / int(page_size) + 1
    else:
        page = int_from_request(request.GET, 'page', default_page)

    if page_size == '-1':
        return objects
    else:
        paginator = Paginator(objects, page_size)
        return paginator.page(page).object_list


def paginator_help(objects_name, tag):
    """ API help for paginator, use it with swagger_auto_schema

    :return: dict
    """
    return dict(tags=[tag], manual_parameters=[
            openapi.Parameter(name='page', type=openapi.TYPE_INTEGER, in_=openapi.IN_QUERY,
                              description='[or "start"] current page'),
            openapi.Parameter(name='page_size', type=openapi.TYPE_INTEGER, in_=openapi.IN_QUERY,
                              description=f'[or "length"] {objects_name} per page, use -1 to obtain all {objects_name} '
                                          '(in this case "page" has no effect and this operation might be slow)')
        ],
        responses={
            200: openapi.Response(title='OK', description=''),
            404: openapi.Response(title='', description=f'No more {objects_name} found')
        })


def find_editor_files():
    """ Find label studio files
    """

    # playground uses another LSF build
    prefix = '/label-studio/'
    editor_dir = settings.EDITOR_ROOT

    # find editor files to include in html
    editor_js_dir = os.path.join(editor_dir, 'js')
    editor_js = [prefix + 'js/' + f for f in os.listdir(editor_js_dir) if f.endswith('.js')]
    editor_css_dir = os.path.join(editor_dir, 'css')
    editor_css = [prefix + 'css/' + f for f in os.listdir(editor_css_dir) if f.endswith('.css')]
    return {'editor_js': editor_js, 'editor_css': editor_css}


def string_is_url(url):
    try:
        url_validator(url)
    except ValidationError:
        return False
    else:
        return True


def download_base64_uri(url, username, password):
    try:
        if username is not None and password is not None:
            r = requests.get(url, auth=HTTPBasicAuth(username, password))
        else:
            r = requests.get(url)
        r.raise_for_status()
    except requests.exceptions.RequestException as e:
        logger.error(f'Failed downloading {url}. Reason: {e}', exc_info=True)
    else:
        encoded_uri = b64encode(r.content).decode('utf-8')
        return f'data:{r.headers["Content-Type"]};base64,{encoded_uri}'


def download_base64_uri_with_cache(url, username=None, password=None):
    cache_dir = user_cache_dir()
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)
    filename = hashlib.md5(url.encode()).hexdigest()
    filepath = os.path.join(cache_dir, filename)
    if os.path.exists(filepath):
        with io.open(filepath) as f:
            return f.read()
    else:
        uri = download_base64_uri(url, username, password)
        if uri:
            with LockFile(filepath):
                with io.open(filepath, mode='w') as fout:
                    fout.write(uri)
            return uri


def safe_float(v, default=0):
    if v != v:
        return default
    return v


def sample_query(q, sample_size):
    n = q.count()
    if n == 0:
        raise ValueError('Can\'t sample from empty query')
    ids = q.values_list('id', flat=True)
    random_ids = random.sample(list(ids), sample_size)
    return q.filter(id__in=random_ids)


def get_project(obj):
    from projects.models import Project, ProjectSummary
    from tasks.models import Task, Annotation, AnnotationDraft
    from data_manager.models import View

    if isinstance(obj, Project):
        return obj
    elif isinstance(obj, (Task, ProjectSummary, View)):
        return obj.project
    elif isinstance(obj, (Annotation, AnnotationDraft)):
        return obj.task.project
    else:
        raise AttributeError(f'Can\'t get Project from instance {obj}')


def request_permissions_add(request, key, model_instance):
    """ Store accessible objects via permissions to request. It's used for access log.
    """
    request.permissions = {} if not hasattr(request, 'permissions') else request.permissions
    # this func could be called multiple times in one request, and this means there are multiple objects on page/api
    # do not save different values, just rewrite value to None
    if key not in request.permissions:
        request.permissions[key] = copy.deepcopy(model_instance)
    else:
        if request.permissions[key] is not None and request.permissions[key].id != model_instance.id:
            request.permissions[key] = None


def get_client_ip(request):
    """ Get IP address from django request

    :param request: django request
    :return: str with ip
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_attr_or_item(obj, key):
    if hasattr(obj, key):
        return getattr(obj, key)
    elif isinstance(obj, dict) and key in obj:
        return obj[key]
    else:
        raise KeyError(f"Can't get attribute or dict key '{key}' from {obj}")


def datetime_to_timestamp(dt):
    if dt.tzinfo:
        dt = dt.astimezone(pytz.UTC)
    return calendar.timegm(dt.timetuple())


def timestamp_now():
    return datetime_to_timestamp(datetime.utcnow())


def find_first_one_to_one_related_field_by_prefix(instance, prefix):
    for field in instance._meta.get_fields():
        if issubclass(type(field), models.fields.related.OneToOneRel):
            attr_name = field.get_accessor_name()
            if attr_name.startswith(prefix) and hasattr(instance, attr_name):
                return getattr(instance, attr_name)


def start_browser(ls_url, no_browser):
    import threading
    import webbrowser
    if no_browser:
        return

    browser_url = ls_url
    threading.Timer(2.5, lambda: webbrowser.open(browser_url)).start()
    print('Start browser at URL: ' + browser_url)


@contextlib.contextmanager
def conditional_atomic():
    """Skip opening transaction for sqlite database backend
    for performance improvement"""

    if settings.DJANGO_DB != settings.DJANGO_DB_SQLITE:
        with transaction.atomic():
            yield
    else:
        yield


def retry_database_locked():
    back_off = 2

    def deco_retry(f):
        @wraps(f)
        def f_retry(*args, **kwargs):
            mtries, mdelay = 10, 3
            while mtries > 0:
                try:
                    return f(*args, **kwargs)
                except OperationalError as e:
                    if 'database is locked' in str(e):
                        time.sleep(mdelay)
                        mtries -= 1
                        mdelay *= back_off
                    else:
                        raise
            return f(*args, **kwargs)
        return f_retry
    return deco_retry


def get_app_version():
    return pkg_resources.get_distribution('label-studio').version


def get_latest_version():
    """ Get version from pypi
    """
    pypi_url = 'https://pypi.org/pypi/%s/json' % label_studio.package_name
    try:
        response = requests.get(pypi_url, timeout=10).text
        data = json.loads(response)
        latest_version = data['info']['version']
        upload_time = data.get('releases', {}).get(latest_version, [{}])[-1].get('upload_time', None)
    except Exception as exc:
        logger.warning("Can't get latest version", exc_info=True)
    else:
        return {'latest_version': latest_version, 'upload_time': upload_time}


def current_version_is_outdated(latest_version):
    latest_version = parse_version(latest_version)
    current_version = parse_version(label_studio.__version__)
    return current_version < latest_version


def check_for_the_latest_version(print_message):
    """ Check latest pypi version
    """
    import label_studio

    # prevent excess checks by time intervals
    current_time = time.time()
    if label_studio.__latest_version_check_time__ and \
       current_time - label_studio.__latest_version_check_time__ < 60:
        return
    label_studio.__latest_version_check_time__ = current_time

    data = get_latest_version()
    if not data:
        return
    latest_version = data['latest_version']
    outdated = latest_version and current_version_is_outdated(latest_version)

    def update_package_message():
        update_command = Fore.CYAN + 'pip install -U ' + label_studio.package_name + Fore.RESET
        return boxing(
            'Update available {curr_version} → {latest_version}\nRun {command}'.format(
                curr_version=label_studio.__version__,
                latest_version=latest_version,
                command=update_command
            ), style='double')

    if outdated and print_message:
        print(update_package_message())

    label_studio.__latest_version__ = latest_version
    label_studio.__latest_version_upload_time__ = data['upload_time']
    label_studio.__current_version_is_outdated__ = outdated


# check version ASAP while package loading
check_for_the_latest_version(print_message=True)


def collect_versions(force=False):
    """ Collect versions for all modules

    :return: dict with sub-dicts of version descriptions
    """
    import label_studio
    if settings.VERSIONS and not force:
        return settings.VERSIONS

    # main pypi package
    result = {
        'package': {
            'version': label_studio.__version__,
            'short_version': '.'.join(label_studio.__version__.split('.')[:2]),
            'latest_version_from_pypi': label_studio.__latest_version__,
            'latest_version_upload_time': label_studio.__latest_version_upload_time__,
            'current_version_is_outdated': label_studio.__current_version_is_outdated__
        },
        # backend full git info
        'backend': version.get_git_commit_info()
    }

    # label studio frontend
    try:
        lsf = json.load(open(os.path.join(settings.EDITOR_ROOT, 'version.json')))
        result['label-studio-frontend'] = lsf
    except:
        pass

    # data manager
    try:
        dm = json.load(open(os.path.join(settings.DM_ROOT, 'version.json')))
        result['dm2'] = dm
    except:
        pass

    settings.VERSIONS = result
    return result


def get_organization_from_request(request):
    """Helper for backward compatability with org_pk in session """
    # TODO remove session logic in next release
    user = request.user
    if user and user.is_authenticated:
        if user.active_organization is None:
            organization_pk = request.session.get('organization_pk')
            if organization_pk:
                user.active_organization_id = organization_pk
                user.save()
                request.session.pop('organization_pk', None)
                request.session.modified = True
        return user.active_organization_id


def load_func(func_string):
    """
    If the given setting is a string import notation,
    then perform the necessary import or imports.
    """
    if func_string is None:
        return None
    elif isinstance(func_string, str):
        return import_from_string(func_string)
    return func_string


def import_from_string(func_string):
    """
    Attempt to import a class from a string representation.
    """
    try:
        return import_string(func_string)
    except ImportError:
        msg = f"Could not import {func_string} from settings"
        raise ImportError(msg)


get_object_with_check_and_log = load_func(settings.GET_OBJECT_WITH_CHECK_AND_LOG)


class temporary_disconnect_signal:
    """ Temporarily disconnect a model from a signal """
    def __init__(self, signal, receiver, sender, dispatch_uid=None):
        self.signal = signal
        self.receiver = receiver
        self.sender = sender
        self.dispatch_uid = dispatch_uid

    def __enter__(self):
        self.signal.disconnect(
            receiver=self.receiver,
            sender=self.sender,
            dispatch_uid=self.dispatch_uid
        )

    def __exit__(self, type_, value, traceback):
        self.signal.connect(
            receiver=self.receiver,
            sender=self.sender,
            dispatch_uid=self.dispatch_uid
        )
