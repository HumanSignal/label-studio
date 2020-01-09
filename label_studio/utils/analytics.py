import logging
import os
import io

from mixpanel import Mixpanel, MixpanelException
from copy import deepcopy
from operator import itemgetter
from uuid import uuid4
from .misc import get_config_dir, get_app_version, parse_config

logger = logging.getLogger(__name__)

mp = Mixpanel('269cd4e25e97cc15bdca5b401e429892')


class Analytics(object):

    def __init__(self, label_config_line, collect_analytics=True):
        self._label_config_line = label_config_line
        self._collect_analytics = collect_analytics

        self._version = get_app_version()
        self._user_id = self._get_user_id()
        self._label_types = self._get_label_types()

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
                    logger.error(f'Can\'t send user profile analytics. Reason: {exc}', exc_info=True)
            logger.debug(f'Your user ID {user_id} is saved to {user_id_file}')
        else:
            with io.open(user_id_file) as f:
                user_id = f.read()
            logger.debug(f'Your user ID {user_id} is loaded from {user_id_file}')
        return user_id

    def _get_label_types(self):
        info = parse_config(self._label_config_line)
        label_types = []
        for tag_info in info.values():
            label_types.append({tag_info['type']: list(map(itemgetter('type'), tag_info['inputs']))})
        return label_types

    def update_info(self, label_config_line, collect_analytics=True):
        if label_config_line != self._label_config_line:
            self._label_types = self._get_label_types()
        self._collect_analytics = collect_analytics

    def send(self, event_name, **kwargs):
        if not self._collect_analytics:
            return
        data = deepcopy(kwargs)
        data['version'] = self._version
        data['label_types'] = self._label_types
        try:
            mp.track(self._user_id, f'LS:{event_name}', data)
        except MixpanelException as exc:
            logger.error(f'Can\'t track {event_name}. Reason: {exc}', exc_info=True)
