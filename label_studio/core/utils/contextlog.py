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
from uuid import uuid4
from .common import get_app_version, get_client_ip
from .params import get_bool_env
from .io import get_config_dir, find_file

logger = logging.getLogger(__name__)


def _load_log_payloads():
    try:
        all_urls_file = find_file('all_urls.json')
        with open(all_urls_file) as f:
            log_payloads = json.load(f)
    except Exception as exc:
        logger.error(exc)
        return None
    out = {}
    for item in log_payloads:
        out[item['name']] = {
            'exclude_from_logs': item.get('exclude_from_logs', False),
            'log_payloads': item.get('log_payloads')
        }
    return out


class ContextLog(object):

    _log_payloads = _load_log_payloads()

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
            try:
                with io.open(user_id_file, mode='w', encoding='utf-8') as fout:
                    fout.write(user_id)
            except OSError:
                return 'np-' + user_id  # not persistent user id
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

    def _get_response_content(self, response):
        try:
            return json.loads(response.content)
        except:
            return

    def _assert_field_in_test(self, field, payload, view_name):
        if get_bool_env('TEST_ENVIRONMENT', False):
            assert field in payload, f'The field "{field}" should be presented for "{view_name}"'

    def _assert_type_in_test(self, type, payload, view_name):
        if get_bool_env('TEST_ENVIRONMENT', False):
            assert isinstance(payload, type), f'The type of payload is not "{type}" for "{view_name}"'

    def _get_fields(self, view_name, payload, fields):
        out = {}
        for field in fields:
            self._assert_field_in_test(field, payload, view_name)
            out[field] = payload.get(field)
        if not out:
            return None
        return out

    def _secure_data(self, payload, request):
        view_name = payload['view_name']

        if view_name in ('user-signup', 'user-login') and payload['method'] == 'POST':
            payload['json'] = None

        if payload['status_code'] < 200 or payload['status_code'] > 299:
            if payload['status_code'] >= 400:
                payload['json'] = None
            return

        # ======== CUSTOM ======
        if view_name == 'data_manager:dm-actions' and payload['values'].get('id') == 'next_task':
            self._assert_type_in_test(dict, payload['response'], view_name)
            new_response = {}
            self._assert_field_in_test('drafts', payload['response'], view_name)
            new_response['drafts'] = len(payload['response']['drafts']) if isinstance(payload['response']['drafts'], list) else payload['response']['drafts']
            for key in ["id", "inner_id", "cancelled_annotations", "total_annotations", "total_predictions", "updated_by", "created_at", "updated_at", "overlap", "comment_count", "unresolved_comment_count", "last_comment_updated_at", "project", "comment_authors", "queue"]:
                self._assert_field_in_test(key, payload['response'], view_name)
                new_response[key] = payload['response'][key]
            payload['response'] = new_response
            return

        if view_name == 'user-list' and payload['method'] == 'GET':
            self._assert_type_in_test(list, payload['response'], view_name)
            payload['response'] = {'count': len(payload['response'])}
            return

        if view_name == 'projects:api-templates:template-list' and payload['method'] == 'GET':
            self._assert_type_in_test(list, payload['response'].get('templates'), view_name)
            payload['response']['templates'] = [t['title'] for t in payload['response']['templates']]
            return

        if view_name == 'data_manager:dm-actions' and payload['method'] == 'GET':
            self._assert_type_in_test(list, payload['response'], view_name)
            payload['response'] = [item.get('id') for item in payload['response']]
            return

        if view_name == 'data_manager:dm-columns' and payload['method'] == 'GET':
            self._assert_field_in_test('columns', payload['response'], view_name)
            payload['response']['columns'] = [item.get('id') for item in payload['response']['columns']]
            return

        if view_name == 'data_export:api-projects:project-export-formats' and payload['method'] == 'GET':
            self._assert_type_in_test(list, payload['response'], view_name)
            payload['response'] = [item.get('title') for item in payload['response']]
            return

        if (view_name == 'tasks:api:task-annotations' and payload['method'] in 'POST') or \
            (view_name == 'tasks:api-annotations:annotation-detail' and payload['method'] == 'PATCH') or \
            (view_name == 'tasks:api:task-annotations-drafts' and payload['method'] == 'POST') or \
            (view_name == 'tasks:api-drafts:draft-detail' and payload['method'] == 'PATCH'):
            self._assert_field_in_test('lead_time', payload['json'], view_name)
            self._assert_field_in_test('result', payload['json'], view_name)
            self._assert_type_in_test(list, payload['json']['result'], view_name)
            payload['json']['result'] = [
                self._get_fields(view_name, item, ('from_name', 'to_name', 'type', 'origin'))
                for item in payload['json']['result']
            ]

        # ======== DEFAULT ======
        log_payloads = self._log_payloads.get(view_name)

        if not log_payloads or not log_payloads.get('log_payloads'):
            return

        log_payloads = log_payloads['log_payloads']
        for payload_key in log_payloads:
            if not payload.get(payload_key):
                payload[payload_key] = None
                continue
            log_fields = log_payloads[payload_key].get(payload['method'])
            if log_fields is not None:
                payload[payload_key] = self._get_fields(view_name, payload[payload_key], log_fields)

    def _exclude_endpoint(self, request):
        if request.resolver_match and request.resolver_match.view_name:
            view_name = request.resolver_match.view_name
            if view_name not in self._log_payloads:
                return True
            if self._log_payloads[view_name].get('exclude_from_logs'):
                return True
        if request.GET.get('interaction', None) == 'timer':
            return True

    def dont_send(self, request):
        return not self.collect_analytics or self._exclude_endpoint(request)

    def send(self, request=None, response=None, body=None):
        if self.dont_send(request):
            return
        try:
            payload = self.create_payload(request, response, body)
        except Exception as exc:
            logger.debug(exc, exc_info=True)
            if get_bool_env('TEST_ENVIRONMENT', False):
                raise
        else:
            if get_bool_env('TEST_ENVIRONMENT', False):
                pass
            elif get_bool_env('DEBUG_CONTEXTLOG', False):
                logger.debug(f'In DEBUG mode, contextlog is not sent.')
                logger.debug(json.dumps(payload, indent=2))
            else:
                thread = threading.Thread(target=self.send_job, args=(request, response, body))
                thread.start()

    @staticmethod
    def browser_exists(request):
        return hasattr(request, 'user_agent') and request.user_agent and \
               hasattr(request.user_agent, 'browser') and request.user_agent.browser

    def create_payload(self, request, response, body):
        advanced_json = None
        user_id, user_email = None, None
        if hasattr(request, 'user') and hasattr(request.user, 'id'):
            user_id = request.user.id
            if hasattr(request.user, 'email'):
                user_email = request.user.email
        if hasattr(request, 'advanced_json'):
            advanced_json = request.advanced_json
        elif hasattr(request, 'user') and hasattr(request.user, 'advanced_json'):
            advanced_json = request.user.advanced_json

        payload = {
            'url': request.build_absolute_uri(),
            'server_id': self.server_id,
            'user_id': user_id,
            'user_email': user_email,
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
            'advanced_json': advanced_json,
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
        self._secure_data(payload, request)
        for key in ('json', 'response', 'values', 'env'):
            payload[key] = payload[key] or None
        return payload

    def send_job(self, request, response, body):
        try:
            payload = self.create_payload(request, response, body)
        except:
            pass
        else:
            try:
               url = 'https://tele.labelstud.io'
               requests.post(url=url, json=payload, timeout=3.0)
            except:
                pass
