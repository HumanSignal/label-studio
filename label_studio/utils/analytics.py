import logging
import os
import io
import requests
import calendar
import threading
import json
import werkzeug

from datetime import datetime
from mixpanel import Mixpanel

from uuid import uuid4
from .misc import get_app_version
from .io import get_config_dir

logger = logging.getLogger(__name__)

mp = Mixpanel('269cd4e25e97cc15bdca5b401e429892')


class Analytics(object):

    def __init__(self, input_args, project):
        self.input_args = input_args
        self.project = project
        collect_analytics = os.getenv('collect_analytics')
        if collect_analytics is None:
            collect_analytics = self.project.config.get('collect_analytics', True)
        self.collect_analytics = bool(int(collect_analytics))

        self.version = get_app_version()
        self.server_id = self._get_server_id()
        self.is_docker = self._is_docker()
        self.is_multi_session = input_args and input_args.command == 'start-multi-session'
        self.env = self._get_label_studio_env()

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
            with io.open(user_id_file, mode='w') as fout:
                fout.write(user_id)
            if self.collect_analytics:
                try:
                    mp.people_set(user_id, {'$name': user_id, 'app': 'label-studio', 'version': self.version})
                except:
                    pass
        else:
            with io.open(user_id_file) as f:
                user_id = f.read()
        return user_id

    def _is_docker(self):
        path = '/proc/self/cgroup'
        return (
            os.path.exists('/.dockerenv') or
            os.path.isfile(path) and any('docker' in line for line in open(path))
        )

    def _get_timestamp_now(self):
        return calendar.timegm(datetime.now().utctimetuple())

    def _prepare_json(self, payload):
        j = payload['json']
        endpoint = payload['endpoint']
        if endpoint in ('api_completions', 'api_completion_update'):
            result = []
            for r in j['result']:
                result.append({'type': r['type'], 'lead_time': r.get('lead_time')})
            payload['json'] = {'result': result, 'lead_time': j['lead_time']}
        elif endpoint == 'api_tasks_cancel':
            payload['json'] = {'lead_time': j['lead_time']}
        elif endpoint == 'api_import':
            payload['json'] = None

    def _prepare_response(self, payload, response):
        r = {'status_code': response.status_code}
        endpoint = payload['endpoint']
        if endpoint == 'api_import' and response.status_code == 201:
            data = json.loads(response.get_data(True))
            data.pop('new_task_ids')
            r['data'] = data
        elif endpoint == 'api_project' and response.status_code == 200:
            data = json.loads(response.get_data(True))
            r['data'] = {'tasks_count': data['task_count'], 'completions_count': data['completion_count']}
        elif endpoint == 'api_generate_next_task' and response.status_code == 200:
            r['data'] = {'predictions': len(json.loads(response.get_data(True)).get('predictions', []))}
        else:
            r['data'] = None
        payload['response'] = r

    def _exclude_endpoint(self, request):
        if request.endpoint in ('static', 'send_static', 'get_data_file'):
            return True
        if request.args.get('polling', False):
            return True

    def send(self, request=None, session=None, response=None, **kwargs):
        if not self.collect_analytics:
            return
        # ignore specific events
        if self._exclude_endpoint(request):
            return
        j = None
        try:
            j = request.json
        except:
            pass
        try:
            payload = {
                'server_id': self.server_id,
                'server_time': self._get_timestamp_now(),
                'session_id': session.get('session_id'),
                'user_agent': request.user_agent.string,
                'url': request.url,
                'endpoint': request.endpoint.replace('label_studio.', ''),
                'method': request.method,
                'values': dict(request.values),
                'json': j,
                'is_docker': self.is_docker,
                'is_multi_session': self.is_multi_session,
                'accept_language': request.accept_languages.to_header(),
                'content_type': request.content_type,
                'content_length': request.content_length,
                'env': self.env,
                'version': self.version,
                'project_name': self.input_args.project_name if self.input_args else None
            }
        except:
            pass
        else:
            thread = threading.Thread(target=self.send_job, args=(payload, response))
            thread.start()

    def send_job(self, payload, response):
        event_name = payload['endpoint']
        self._prepare_json(payload)
        self._prepare_response(payload, response)
        try:
            mp.track(self.server_id, event_name, payload)
        except:
            pass

        try:
            url = 'https://analytics.labelstud.io/prod'
            requests.post(url=url, json=payload)
        except:
            pass
