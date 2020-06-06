import logging
import os
import io
import requests
import calendar
import threading

from datetime import datetime
from mixpanel import Mixpanel, MixpanelException
from copy import deepcopy
from operator import itemgetter

from uuid import uuid4
from .misc import get_app_version, parse_config, convert_string_to_hash
from .io import get_config_dir

logger = logging.getLogger(__name__)

mp = Mixpanel('269cd4e25e97cc15bdca5b401e429892')


class Analytics(object):

    def __init__(self, label_config_line, collect_analytics=True, project_name='', context=None):
        self._label_config_line = label_config_line
        self._collect_analytics = collect_analytics
        self._project_name = convert_string_to_hash(project_name)

        self._version = get_app_version()
        self._user_id = self._get_user_id()
        self._label_types = self._get_label_types()
        self._context = context or {}

    def _get_user_id(self):
        user_id_file = os.path.join(get_config_dir(), 'user_id')
        if not os.path.exists(user_id_file):
            user_id = str(uuid4())
            with io.open(user_id_file, mode='w') as fout:
                fout.write(user_id)
            if self._collect_analytics:
                try:
                    mp.people_set(user_id, {
                        '$name': user_id,
                        'app': 'label-studio',
                        'version': self._version
                    })
                except MixpanelException as exc:
                    logger.error('Can\'t send user profile analytics. Reason: ' + str(exc), exc_info=True)
            logger.debug('Your user ID ' + str(user_id) + ' is saved to ' + str(user_id_file))
        else:
            with io.open(user_id_file) as f:
                user_id = f.read()
            logger.debug('Your user ID ' + str(user_id) + ' is loaded from ' + str(user_id_file))
        return user_id

    def _get_label_types(self):
        info = parse_config(self._label_config_line)
        label_types = []
        for tag_info in info.values():
            output_type = tag_info['type']
            input_types = list(map(itemgetter('type'), tag_info['inputs']))
            label_types.append({
                output_type: {
                    'input_types': input_types,
                    'num_labels': len(tag_info['labels'])
                }
            })
        return label_types

    def _get_timestamp_now(self):
        return calendar.timegm(datetime.now().timetuple())

    def update_info(self, label_config_line, collect_analytics=True, project_name='', context=None):
        if label_config_line != self._label_config_line:
            self._label_types = self._get_label_types()
        self._collect_analytics = collect_analytics
        self._context = context or {}
        self._project_name = convert_string_to_hash(project_name)

    def send(self, event_name, **kwargs):
        # self.send_job(event_name, **kwargs)
        thread = threading.Thread(target=self.send_job, args=(event_name,), kwargs=kwargs)
        thread.start()

    def send_job(self, event_name, **kwargs):
        if not self._collect_analytics:
            return
        data = deepcopy(kwargs)
        data.update(self._context)
        data['version'] = self._version
        data['label_types'] = self._label_types
        data['project'] = self._project_name
        event_name = 'LS:' + str(event_name)
        try:
            mp.track(self._user_id, event_name, data)
        except MixpanelException as exc:
            logger.debug('Can\'t track ' + str(event_name) + ' . Reason: ' + str(exc), exc_info=True)

        json_data = data
        json_data['event'] = event_name
        json_data['server_id'] = self._user_id
        json_data['server_time'] = self._get_timestamp_now()
        try:
            url = 'https://analytics.labelstud.io/prod'
            logger.debug('Sending to {url}:\n{data}'.format(url=url, data=json_data))
            requests.post(url=url, json=json_data)
        except requests.RequestException as exc:
            logger.debug('Analytics error: {exc}'.format(exc=str(exc)))
