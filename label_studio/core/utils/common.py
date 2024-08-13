"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from __future__ import unicode_literals

import calendar
import contextlib
import copy
import logging
import os
import random
import re
import time
import traceback as tb
import uuid
from collections import defaultdict
from datetime import datetime
from functools import wraps
from typing import Any, Callable, Generator, Iterable, Mapping, Optional

import drf_yasg.openapi as openapi
import pkg_resources
import pytz
import requests
import ujson as json
from boxing import boxing
from colorama import Fore
from core.utils.params import get_env
from django.conf import settings
from django.contrib.postgres.operations import BtreeGinExtension, TrigramExtension
from django.core.exceptions import ValidationError
from django.core.paginator import EmptyPage, Paginator
from django.core.validators import URLValidator
from django.db import models, transaction
from django.db.models.signals import (
    post_delete,
    post_init,
    post_migrate,
    post_save,
    pre_delete,
    pre_init,
    pre_migrate,
    pre_save,
)
from django.db.utils import OperationalError
from django.utils.crypto import get_random_string
from django.utils.module_loading import import_string
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg.inspectors import CoreAPICompatInspector, NotHandled
from label_studio_sdk._extensions.label_studio_tools.core.utils.exceptions import (
    LabelStudioXMLSyntaxErrorSentryIgnored,
)
from pkg_resources import parse_version
from rest_framework import status
from rest_framework.exceptions import ErrorDetail
from rest_framework.views import Response, exception_handler

import label_studio

try:
    from sentry_sdk import capture_exception, set_tag

    sentry_sdk_loaded = True
except (ModuleNotFoundError, ImportError):
    sentry_sdk_loaded = False

from core import version
from core.utils.exceptions import LabelStudioDatabaseLockedException

# these functions will be included to another modules, don't remove them
from core.utils.params import int_from_request

logger = logging.getLogger(__name__)
url_validator = URLValidator()


def _override_exceptions(exc):
    if isinstance(exc, OperationalError) and 'database is locked' in str(exc):
        return LabelStudioDatabaseLockedException()

    return exc


def custom_exception_handler(exc, context):
    """Make custom exception treatment in RestFramework

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
            response_data['validation_errors'] = (
                response.data if isinstance(response.data, dict) else {'non_field_errors': response.data}
            )
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
        if not settings.DEBUG_MODAL_EXCEPTIONS:
            exc_tb = None
        response_data['exc_info'] = exc_tb
        if isinstance(exc, LabelStudioXMLSyntaxErrorSentryIgnored):
            response = Response(status=status.HTTP_400_BAD_REQUEST, data=response_data)
        else:
            response = Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data=response_data)

    return response


def create_hash() -> str:
    """This function creates a secure token for the organization"""
    return get_random_string(length=40)


def paginator(objects, request, default_page=1, default_size=50):
    """DEPRECATED
    TODO: change to standard drf pagination class

    Get from request page and page_size and return paginated objects

    :param objects: all queryset
    :param request: view request object
    :param default_page: start page if there is no page in GET
    :param default_size: page size if there is no page in GET
    :return: paginated objects
    """
    page_size = request.GET.get('page_size', request.GET.get('length', default_size))
    if settings.TASK_API_PAGE_SIZE_MAX and (int(page_size) > settings.TASK_API_PAGE_SIZE_MAX or page_size == '-1'):
        page_size = settings.TASK_API_PAGE_SIZE_MAX

    if 'start' in request.GET:
        page = int_from_request(request.GET, 'start', default_page)
        if page and int(page) > int(page_size) > 0:
            page = int(page / int(page_size)) + 1
        else:
            page += 1
    else:
        page = int_from_request(request.GET, 'page', default_page)

    if page_size == '-1':
        return objects

    try:
        return Paginator(objects, page_size).page(page).object_list
    except ZeroDivisionError:
        return []
    except EmptyPage:
        return []


def paginator_help(objects_name, tag):
    """API help for paginator, use it with swagger_auto_schema

    :return: dict
    """
    if settings.TASK_API_PAGE_SIZE_MAX:
        page_size_description = f'[or "length"] {objects_name} per page. Max value {settings.TASK_API_PAGE_SIZE_MAX}'
    else:
        page_size_description = (
            f'[or "length"] {objects_name} per page, use -1 to obtain all {objects_name} '
            '(in this case "page" has no effect and this operation might be slow)'
        )
    return dict(
        tags=[tag],
        manual_parameters=[
            openapi.Parameter(
                name='page', type=openapi.TYPE_INTEGER, in_=openapi.IN_QUERY, description='[or "start"] current page'
            ),
            openapi.Parameter(
                name='page_size', type=openapi.TYPE_INTEGER, in_=openapi.IN_QUERY, description=page_size_description
            ),
        ],
        responses={
            200: openapi.Response(title='OK', description='')
            # 404: openapi.Response(title='', description=f'No more {objects_name} found')
        },
    )


def string_is_url(url):
    try:
        url_validator(url)
    except ValidationError:
        return False
    else:
        return True


def safe_float(v, default=0):
    if v != v:
        return default
    return v


def sample_query(q, sample_size):
    n = q.count()
    if n == 0:
        raise ValueError("Can't sample from empty query")
    ids = q.values_list('id', flat=True)
    random_ids = random.sample(list(ids), sample_size)
    return q.filter(id__in=random_ids)


def get_client_ip(request):
    """Get IP address from django request

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
    if hasattr(instance, '_find_first_one_to_one_related_field_by_prefix_cache'):
        return getattr(instance, '_find_first_one_to_one_related_field_by_prefix_cache')

    result = None
    for field in instance._meta.get_fields():
        if issubclass(type(field), models.fields.related.OneToOneRel):
            attr_name = field.get_accessor_name()
            if re.match(prefix, attr_name) and hasattr(instance, attr_name):
                result = getattr(instance, attr_name)
                break

    instance._find_first_one_to_one_related_field_by_prefix_cache = result
    return result


def start_browser(ls_url, no_browser):
    import threading
    import webbrowser

    if no_browser:
        return

    browser_url = ls_url
    threading.Timer(2.5, lambda: webbrowser.open(browser_url)).start()
    logger.info('Start browser at URL: ' + browser_url)


def db_is_not_sqlite() -> bool:
    """
    A common predicate for use with conditional_atomic.

    Checks if the DB is NOT sqlite, because sqlite dbs are locked during any write.
    """

    return settings.DJANGO_DB != settings.DJANGO_DB_SQLITE


@contextlib.contextmanager
def conditional_atomic(
    predicate: Callable[..., bool],
    predicate_args: Optional[Iterable[Any]] = None,
    predicate_kwargs: Optional[Mapping[str, Any]] = None,
) -> Generator[None, None, None]:
    """Use transaction if and only if the passed predicate function returns true

    Params:
        predicate: function taking any combination of args and kwargs
        predicate_args: optional array of positional args for the predicate
        predicate_kwargs: optional map of keyword args for the predicate
    """

    should_use_transaction = predicate(*(predicate_args or []), **(predicate_kwargs or {}))

    if should_use_transaction:
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
    version = pkg_resources.get_distribution('label-studio').version
    if isinstance(version, str):
        return version
    elif isinstance(version, dict):
        return version.get('version') or version.get('latest_version')


def get_latest_version():
    """Get version from pypi"""
    pypi_url = 'https://pypi.org/pypi/%s/json' % label_studio.package_name
    try:
        response = requests.get(pypi_url, timeout=10).text
        data = json.loads(response)
        latest_version = data['info']['version']
        upload_time = data.get('releases', {}).get(latest_version, [{}])[-1].get('upload_time', None)
    except Exception:
        logger.warning("Can't get latest version", exc_info=True)
    else:
        return {'latest_version': latest_version, 'upload_time': upload_time}


def current_version_is_outdated(latest_version):
    latest_version = parse_version(latest_version)
    current_version = parse_version(label_studio.__version__)
    return current_version < latest_version


def check_for_the_latest_version(print_message):
    """Check latest pypi version"""
    if not settings.LATEST_VERSION_CHECK:
        return

    import label_studio

    # prevent excess checks by time intervals
    current_time = time.time()
    if label_studio.__latest_version_check_time__ and current_time - label_studio.__latest_version_check_time__ < 60:
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
                curr_version=label_studio.__version__, latest_version=latest_version, command=update_command
            ),
            style='double',
        )

    if outdated and print_message:
        print(update_package_message())

    label_studio.__latest_version__ = latest_version
    label_studio.__latest_version_upload_time__ = data['upload_time']
    label_studio.__current_version_is_outdated__ = outdated


# check version ASAP while package loading
# skip notification for uwsgi, as we're running in production ready mode
if settings.APP_WEBSERVER != 'uwsgi':
    check_for_the_latest_version(print_message=True)


def collect_versions(force=False):
    """Collect versions for all modules

    :return: dict with sub-dicts of version descriptions
    """
    import label_studio

    # prevent excess checks by time intervals
    current_time = time.time()
    need_check = current_time - settings.VERSIONS_CHECK_TIME > 300
    settings.VERSIONS_CHECK_TIME = current_time

    if settings.VERSIONS and not force and not need_check:
        return settings.VERSIONS

    # main pypi package
    result = {
        'release': label_studio.__version__,
        'label-studio-os-package': {
            'version': label_studio.__version__,
            'short_version': '.'.join(label_studio.__version__.split('.')[:2]),
            'latest_version_from_pypi': label_studio.__latest_version__,
            'latest_version_upload_time': label_studio.__latest_version_upload_time__,
            'current_version_is_outdated': label_studio.__current_version_is_outdated__,
        },
        # backend full git info
        'label-studio-os-backend': version.get_git_commit_info(ls=True),
    }

    # label studio frontend
    try:
        with open(os.path.join(settings.EDITOR_ROOT, 'version.json')) as f:
            lsf = json.load(f)
        result['label-studio-frontend'] = lsf
    except:  # noqa: E722
        pass

    # data manager
    try:
        with open(os.path.join(settings.DM_ROOT, 'version.json')) as f:
            dm = json.load(f)
        result['dm2'] = dm
    except:  # noqa: E722
        pass

    # converter from label-studio-sdk
    try:
        import label_studio_sdk.converter

        result['label-studio-converter'] = {'version': label_studio_sdk.__version__}
    except Exception:
        pass

    # ml
    try:
        import label_studio_ml

        result['label-studio-ml'] = {'version': label_studio_ml.__version__}
    except Exception:
        pass

    result.update(settings.COLLECT_VERSIONS(result=result))

    for key in result:
        if 'message' in result[key] and len(result[key]['message']) > 70:
            result[key]['message'] = result[key]['message'][0:70] + ' ...'

    if settings.SENTRY_DSN:
        import sentry_sdk

        sentry_sdk.set_context('versions', copy.deepcopy(result))

        for package in result:
            if 'version' in result[package]:
                sentry_sdk.set_tag('version-' + package, result[package]['version'])
            if 'commit' in result[package]:
                sentry_sdk.set_tag('commit-' + package, result[package]['commit'])

    settings.VERSIONS = result
    return result


def get_organization_from_request(request):
    """Helper for backward compatibility with org_pk in session"""
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
    except ImportError as e:
        msg = f'Could not import {func_string} from settings: {e}'
        raise ImportError(msg)


class temporary_disconnect_signal:
    """Temporarily disconnect a model from a signal

    Example:
        with temporary_disconnect_all_signals(
            signals.post_delete, update_is_labeled_after_removing_annotation, Annotation):
            do_something()
    """

    def __init__(self, signal, receiver, sender, dispatch_uid=None):
        self.signal = signal
        self.receiver = receiver
        self.sender = sender
        self.dispatch_uid = dispatch_uid

    def __enter__(self):
        self.signal.disconnect(receiver=self.receiver, sender=self.sender, dispatch_uid=self.dispatch_uid)

    def __exit__(self, type_, value, traceback):
        self.signal.connect(receiver=self.receiver, sender=self.sender, dispatch_uid=self.dispatch_uid)


class temporary_disconnect_all_signals(object):
    def __init__(self, disabled_signals=None):
        self.stashed_signals = defaultdict(list)
        self.disabled_signals = disabled_signals or [
            pre_init,
            post_init,
            pre_save,
            post_save,
            pre_delete,
            post_delete,
            pre_migrate,
            post_migrate,
        ]

    def __enter__(self):
        for signal in self.disabled_signals:
            self.disconnect(signal)

    def __exit__(self, exc_type, exc_val, exc_tb):
        for signal in list(self.stashed_signals):
            self.reconnect(signal)

    def disconnect(self, signal):
        self.stashed_signals[signal] = signal.receivers
        signal.receivers = []

    def reconnect(self, signal):
        signal.receivers = self.stashed_signals.get(signal, [])
        del self.stashed_signals[signal]


class DjangoFilterDescriptionInspector(CoreAPICompatInspector):
    def get_filter_parameters(self, filter_backend):
        if isinstance(filter_backend, DjangoFilterBackend):
            result = super(DjangoFilterDescriptionInspector, self).get_filter_parameters(filter_backend)
            if not isinstance(result, Iterable):
                return result

            for param in result:
                if not param.get('description', ''):
                    param.description = 'Filter the returned list by {field_name}'.format(field_name=param.name)

            return result

        return NotHandled


def batch(iterable, n=1):
    l = len(iterable)  # noqa: E741
    for ndx in range(0, l, n):
        yield iterable[ndx : min(ndx + n, l)]


def round_floats(o):
    if isinstance(o, float):
        return round(o, 2)
    if isinstance(o, dict):
        return {k: round_floats(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [round_floats(x) for x in o]
    return o


class temporary_disconnect_list_signal:
    """Temporarily disconnect a list of signals
    Each signal tuple: (signal_type, signal_method, object)
    Example:
        with temporary_disconnect_list_signal(
            [(signals.post_delete, update_is_labeled_after_removing_annotation, Annotation)]
            ):
            do_something()
    """

    def __init__(self, signals):
        self.signals = signals

    def __enter__(self):
        for signal in self.signals:
            sig = signal[0]
            receiver = signal[1]
            sender = signal[2]
            dispatch_uid = signal[3] if len(signal) > 3 else None
            sig.disconnect(receiver=receiver, sender=sender, dispatch_uid=dispatch_uid)

    def __exit__(self, type_, value, traceback):
        for signal in self.signals:
            sig = signal[0]
            receiver = signal[1]
            sender = signal[2]
            dispatch_uid = signal[3] if len(signal) > 3 else None
            sig.connect(receiver=receiver, sender=sender, dispatch_uid=dispatch_uid)


def trigram_migration_operations(next_step):
    ops = [
        TrigramExtension(),
        next_step,
    ]
    SKIP_TRIGRAM_EXTENSION = get_env('SKIP_TRIGRAM_EXTENSION', None)
    if SKIP_TRIGRAM_EXTENSION == '1' or SKIP_TRIGRAM_EXTENSION == 'yes' or SKIP_TRIGRAM_EXTENSION == 'true':
        ops = [next_step]
    if SKIP_TRIGRAM_EXTENSION == 'full':
        ops = []

    return ops


def btree_gin_migration_operations(next_step):
    ops = [
        BtreeGinExtension(),
        next_step,
    ]
    SKIP_BTREE_GIN_EXTENSION = get_env('SKIP_BTREE_GIN_EXTENSION', None)
    if SKIP_BTREE_GIN_EXTENSION == '1' or SKIP_BTREE_GIN_EXTENSION == 'yes' or SKIP_BTREE_GIN_EXTENSION == 'true':
        ops = [next_step]
    if SKIP_BTREE_GIN_EXTENSION == 'full':
        ops = []

    return ops


def merge_labels_counters(dict1, dict2):
    """
    Merge two dictionaries with nested dictionary values into a single dictionary.

    Args:
        dict1 (dict): The first dictionary to merge.
        dict2 (dict): The second dictionary to merge.

    Returns:
        dict: A new dictionary with the merged nested dictionaries.

    Example:
        dict1 = {'sentiment': {'Negative': 1, 'Positive': 1}}
        dict2 = {'sentiment': {'Positive': 2, 'Neutral': 1}}
        result_dict = merge_nested_dicts(dict1, dict2)
        # {'sentiment': {'Negative': 1, 'Positive': 3, 'Neutral': 1}}
    """
    result_dict = {}

    # iterate over keys in both dictionaries
    for key in set(dict1.keys()) | set(dict2.keys()):
        # add the corresponding values if they exist in both dictionaries
        value = {}
        if key in dict1:
            value.update(dict1[key])
        if key in dict2:
            for subkey in dict2[key]:
                value[subkey] = value.get(subkey, 0) + dict2[key][subkey]
        # add the key-value pair to the result dictionary
        result_dict[key] = value

    return result_dict


def timeit(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        logging.debug(f'{func.__name__} execution time: {end-start} seconds')
        return result

    return wrapper


def empty(*args, **kwargs):
    pass


def get_ttl_hash(seconds: int = 60) -> int:
    """Return the same value within `seconds` time period"""
    return round(time.time() / seconds)
