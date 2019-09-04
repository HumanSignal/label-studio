import logging
import json
import requests
import os

from requests.adapters import HTTPAdapter
from copy import deepcopy
# from .version import get_git_version

logger = logging.getLogger(__name__)

version = '12345'

ANALYTICS_URL = 'http://ml.heartex.net/19191/'

class BaseHTTPAPI(object):
    MAX_RETRIES = 2
    HEADERS = {
        'User-Agent': 'heartex/' + version,
    }
    CONNECTION_TIMEOUT = 1.0  # seconds
    TIMEOUT = 100.0  # seconds

    def __init__(self, url, timeout=None, connection_timeout=None, max_retries=None, headers=None, **kwargs):
        self._url = url
        self._timeout = timeout or self.TIMEOUT
        self._connection_timeout = connection_timeout or self.CONNECTION_TIMEOUT
        self._headers = headers or {}
        self._max_retries = max_retries or self.MAX_RETRIES
        self._sessions = {self._session_key(): self.create_session()}

    def create_session(self):
        session = requests.Session()
        session.headers.update(self.HEADERS)
        session.headers.update(self._headers)
        session.mount('http://', HTTPAdapter(max_retries=self._max_retries))
        session.mount('https://', HTTPAdapter(max_retries=self._max_retries))
        return session

    def _session_key(self):
        return os.getpid()

    @property
    def http_session(self):
        key = self._session_key()
        if key in self._sessions:
            return self._sessions[key]
        else:
            session = self.create_session()
            self._sessions[key] = session
            return session

    def post(self, *args, **kwargs):
        try:
            kwargs['timeout'] = self._connection_timeout, self._timeout
            logger.debug(f'Send request with {args} and {kwargs}')
            response = self.http_session.request('POST', url=self._url, *args, **kwargs)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.error(f'Can\'t send request from {self.__class__.__name__}', exc_info=True)


class AnalyticsAPI(BaseHTTPAPI):

    def __init__(self, url=ANALYTICS_URL, **kwargs):
        super(AnalyticsAPI, self).__init__(url, **kwargs)
        self._general_info = {}

    def send(self, **kwargs):
        data = deepcopy(self._general_info)
        data.update(kwargs)
        self.post(json=data)
