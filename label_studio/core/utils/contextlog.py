"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import os
import sys
import io
import requests
import calendar
import threading
import json
import platform

from datetime import datetime
from django.conf import settings

from uuid import uuid4
from .common import get_app_version, get_bool_env, get_client_ip
from .io import get_config_dir

logger = logging.getLogger(__name__)


class ContextLog(object):

    def __init__(self):
        self.collect_analytics = get_bool_env('collect_analytics', True)
        self.version = get_app_version()
        self.server_id = self._get_server_id()

    def _get_label_studio_env(self):
        env = {}
        for env_key, env_value in os.environ.items():
            if env_key.startswith('LABEL_STUDIO_'):
                env[env_key] = env_value
        return env

    def _get_server_id(self):
        user_id_file = os.path.join(get_config_dir(), 'user_id')
        if not os.path.exists(user_id_file):
            user_id = str(uuid4())
            with io.open(user_id_file, mode='w', encoding='utf-8') as fout:
                fout.write(user_id)
        else:
            with io.open(user_id_file, encoding='utf-8') as f:
                user_id = f.read()
        return user_id

    def _is_docker(self):
        path = '/proc/self/cgroup'
        return (
            os.path.exists('/.dockerenv') or
            os.path.isfile(path) and any('docker' in line for line in open(path, encoding='utf-8'))
        )

    def _get_timestamp_now(self):
        return calendar.timegm(datetime.now().utctimetuple())

    def _prepare_json(self, payload, request):
        j = payload['json']
        view_name = payload['view_name']
        if view_name in ('tasks:api:task-annotations', 'tasks:api-annotations:annotation-detail'):
            types = [r.get('type') for r in j.get('result', [])]
            payload['json'] = {'result': types, 'lead_time': j.get('lead_time')}

    def _get_response_content(self, response):
        try:
            return json.loads(response.content)
        except:
            return

    def _prepare_response(self, payload):
        view_name = payload['view_name']
        if view_name in (
            'data_export:api-projects:project-export',
            'data_manager:api:view-tasks',
            'data_manager:data_manager.api.ProjectActionsAPI',
            'data_manager:data_manager.api.TaskAPI',
            'projects:api-templates:template-list',
            'data_import:api-projects:project-file-upload-list',
            'tasks:api:task-annotations',
            'tasks:api-annotations:annotation-detail'
        ) and payload['status_code'] in (200, 201):
            payload['response'] = None

    def _exclude_endpoint(self, request):
        if request.resolver_match and request.resolver_match.view_name in [
            'django.views.static.serve',
            'data_import:data-upload'
        ]:
            return True
        if request.GET.get('interaction', None) == 'timer':
            return True

    def send(self, request=None, response=None, body=None):
        if settings.DEBUG:
            try:
                payload = self.create_payload(request, response, body)
            except Exception as exc:
                logger.error(exc, exc_info=True)
            else:
                if get_bool_env('DEBUG_CONTEXTLOG', False):
                    logger.debug(json.dumps(payload, indent=2))
                pass
        else:
            # ignore specific events
            if not self.collect_analytics or self._exclude_endpoint(request):
                return
            thread = threading.Thread(target=self.send_job, args=(request, response, body))
            thread.start()

    @staticmethod
    def browser_exists(request):
        return hasattr(request, 'user_agent') and request.user_agent and \
               hasattr(request.user_agent, 'browser') and request.user_agent.browser

    def create_payload(self, request, response, body):
        payload = {
            'server_id': self._get_server_id(),
            'server_time': self._get_timestamp_now(),
            'session_id': request.session.get('uid', None),
            'client_ip': get_client_ip(request),
            'is_docker': self._is_docker(),
            'python': str(sys.version_info[0]) + '.' + str(sys.version_info[1]),
            'env': self._get_label_studio_env(),
            'version': self.version,
            'view_name': request.resolver_match.view_name if request.resolver_match else None,
            'namespace': request.resolver_match.namespace if request.resolver_match else None,
            'scheme': request.scheme,
            'method': request.method,
            'values': request.GET.dict(),
            'json': body,
            'language': request.LANGUAGE_CODE,
            'content_type': request.content_type,
            'content_length': int(request.environ.get('CONTENT_LENGTH')) if request.environ.get('CONTENT_LENGTH') else None,
            'status_code': response.status_code,
            'response': self._get_response_content(response)
        }
        if self.browser_exists(request):
            payload.update({
                'is_mobile': request.user_agent.is_mobile,
                'is_tablet': request.user_agent.is_tablet,
                'is_touch_capable': request.user_agent.is_touch_capable,
                'is_pc': request.user_agent.is_pc,
                'is_bot': request.user_agent.is_bot,
                'browser': request.user_agent.browser.family,
                'browser_version': request.user_agent.browser.version_string,
                'os': request.user_agent.os.family,
                'platform_system': platform.system(),
                'platform_release': platform.release(),
                'os_version': request.user_agent.os.version_string,
                'device': request.user_agent.device.family,
            })
        self._prepare_json(payload, request)
        self._prepare_response(payload)
        return payload

    def send_job(self, request, response, body):
        try:
            payload = self.create_payload(request, response, body)
        except:
            pass
        else:
            try:
               url = 'https://tele.labelstud.io'
               requests.post(url=url, json=payload)
            except:
                pass
