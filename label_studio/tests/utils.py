"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os.path
import re
import tempfile
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import pytest
import requests
import requests_mock
import ujson as json
from box import Box
from data_export.models import ConvertedFormat, Export
from django.apps import apps
from django.conf import settings
from django.test import Client
from ml.models import MLBackend
from organizations.models import Organization
from projects.models import Project
from tasks.serializers import TaskWithAnnotationsSerializer
from users.models import User

try:
    from businesses.models import BillingPlan, Business
except ImportError:
    BillingPlan = Business = None


@contextmanager
def ml_backend_mock(**kwargs):
    with requests_mock.Mocker(real_http=True) as m:
        yield register_ml_backend_mock(m, **kwargs)


def register_ml_backend_mock(
    m,
    url='http://localhost:9090',
    predictions=None,
    health_connect_timeout=False,
    train_job_id='123',
    setup_model_version='abc',
):
    m.post(f'{url}/setup', text=json.dumps({'status': 'ok', 'model_version': setup_model_version}))
    if health_connect_timeout:
        m.get(f'{url}/health', exc=requests.exceptions.ConnectTimeout)
    else:
        m.get(f'{url}/health', text=json.dumps({'status': 'UP'}))
    m.post(f'{url}/train', text=json.dumps({'status': 'ok', 'job_id': train_job_id}))
    m.post(f'{url}/predict', text=json.dumps(predictions or {}))
    m.post(f'{url}/webhook', text=json.dumps({}))
    m.get(f'{url}/versions', text=json.dumps({'versions': ['1', '2']}))
    return m


@contextmanager
def import_from_url_mock(**kwargs):
    with mock.patch('core.utils.io.validate_upload_url'):
        with requests_mock.Mocker(real_http=True) as m:

            with open('./tests/test_suites/samples/test_1.csv', 'rb') as f:
                matcher = re.compile('data\.heartextest\.net/test_1\.csv')

                m.get(matcher, body=f, headers={'Content-Length': '100'})
                yield m


class _TestJob(object):
    def __init__(self, job_id):
        self.id = job_id


@contextmanager
def email_mock():
    from django.core.mail import EmailMultiAlternatives

    with mock.patch.object(EmailMultiAlternatives, 'send'):
        yield


@contextmanager
def gcs_client_mock():
    from collections import namedtuple

    from google.cloud import storage as google_storage

    File = namedtuple('File', ['name'])

    class DummyGCSBlob:
        def __init__(self, bucket_name, key, is_json):
            self.key = key
            self.bucket_name = bucket_name
            self.name = f'{bucket_name}/{key}'
            self.is_json = is_json

        def download_as_string(self):
            data = f'test_blob_{self.key}'
            if self.is_json:
                return json.dumps({'str_field': data, 'int_field': 123, 'dict_field': {'one': 'wow', 'two': 456}})
            return data

        def upload_from_string(self, string):
            print(f'String {string} uploaded to bucket {self.bucket_name}')

        def generate_signed_url(self, **kwargs):
            return f'https://storage.googleapis.com/{self.bucket_name}/{self.key}'

        def download_as_bytes(self):
            data = f'test_blob_{self.key}'
            if self.is_json:
                return json.dumps({'str_field': data, 'int_field': 123, 'dict_field': {'one': 'wow', 'two': 456}})
            return data

    class DummyGCSBucket:
        def __init__(self, bucket_name, is_json, **kwargs):
            self.name = bucket_name
            self.is_json = is_json

        def list_blobs(self, prefix, **kwargs):
            if 'fake' in prefix:
                return []
            return [File('abc'), File('def'), File('ghi')]

        def blob(self, key):
            return DummyGCSBlob(self.name, key, self.is_json)

    class DummyGCSClient:
        def get_bucket(self, bucket_name):
            is_json = bucket_name.endswith('_JSON')
            return DummyGCSBucket(bucket_name, is_json)

        def list_blobs(self, bucket_name, prefix):
            is_json = bucket_name.endswith('_JSON')
            return [
                DummyGCSBlob(bucket_name, 'abc', is_json),
                DummyGCSBlob(bucket_name, 'def', is_json),
                DummyGCSBlob(bucket_name, 'ghi', is_json),
            ]

    with mock.patch.object(google_storage, 'Client', return_value=DummyGCSClient()):
        yield


@contextmanager
def azure_client_mock():
    from collections import namedtuple

    from io_storages.azure_blob import models

    File = namedtuple('File', ['name'])

    class DummyAzureBlob:
        def __init__(self, container_name, key):
            self.key = key
            self.container_name = container_name

        def download_as_string(self):
            return f'test_blob_{self.key}'

        def upload_blob(self, string, overwrite):
            print(f'String {string} uploaded to bucket {self.container_name}')

        def generate_signed_url(self, **kwargs):
            return f'https://storage.googleapis.com/{self.container_name}/{self.key}'

        def content_as_text(self):
            return json.dumps({'str_field': str(self.key), 'int_field': 123, 'dict_field': {'one': 'wow', 'two': 456}})

    class DummyAzureContainer:
        def __init__(self, container_name, **kwargs):
            self.name = container_name

        def list_blobs(self, name_starts_with):
            return [File('abc'), File('def'), File('ghi')]

        def get_blob_client(self, key):
            return DummyAzureBlob(self.name, key)

        def get_container_properties(self, **kwargs):
            return SimpleNamespace(
                name='test-container',
                last_modified='2022-01-01 01:01:01',
                etag='test-etag',
                lease='test-lease',
                public_access='public',
                has_immutability_policy=True,
                has_legal_hold=True,
                immutable_storage_with_versioning_enabled=True,
                metadata={'key': 'value'},
                encryption_scope='test-scope',
                deleted=False,
                version='1.0.0',
            )

        def download_blob(self, key):
            return DummyAzureBlob(self.name, key)

    class DummyAzureClient:
        def get_container_client(self, container_name):
            return DummyAzureContainer(container_name)

    # def dummy_generate_blob_sas(*args, **kwargs):
    #     return 'token'

    with mock.patch.object(models.BlobServiceClient, 'from_connection_string', return_value=DummyAzureClient()):
        with mock.patch.object(models, 'generate_blob_sas', return_value='token'):
            yield


@contextmanager
def azure_client_sp_mock():
    from collections import namedtuple

    from io_storages.azure_serviceprincipal import models

    File = namedtuple('File', ['name'])

    class DummyAzureBlob:
        def __init__(self, container_name, key):
            self.key = key
            self.container_name = container_name

        def download_as_string(self):
            return f'test_blob_{self.key}'

        def upload_blob(self, string, overwrite):
            print(f'String {string} uploaded to bucket {self.container_name}')

        def generate_signed_url(self, **kwargs):
            return f'https://storage.googleapis.com/{self.container_name}/{self.key}'

        def content_as_text(self):
            return json.dumps({'str_field': str(self.key), 'int_field': 123, 'dict_field': {'one': 'wow', 'two': 456}})

    class DummyAzureContainer:
        def __init__(self, container_name, **kwargs):
            self.name = container_name

        def list_blobs(self, name_starts_with):
            return [File('abc'), File('def'), File('ghi')]

        def get_blob_client(self, key):
            return DummyAzureBlob(self.name, key)

        def get_container_properties(self, **kwargs):
            return SimpleNamespace(
                name='test-container',
                last_modified='2022-01-01 01:01:01',
                etag='test-etag',
                lease='test-lease',
                public_access='public',
                has_immutability_policy=True,
                has_legal_hold=True,
                immutable_storage_with_versioning_enabled=True,
                metadata={'key': 'value'},
                encryption_scope='test-scope',
                deleted=False,
                version='1.0.0',
            )

        def download_blob(self, key):
            return DummyAzureBlob(self.name, key)

    class MockUserDelegationKey:
        def __init__(self, **kwargs):
            self.signedOid = kwargs.get('signedOid', 'sample_signed_oid')
            self.signedTid = kwargs.get('signedTid', 'sample_signed_tid')
            self.signedStart = kwargs.get('signedStart', (datetime.now() - timedelta(days=1)).isoformat())
            self.signedExpiry = kwargs.get('signedExpiry', (datetime.now() + timedelta(days=1)).isoformat())
            self.signedService = kwargs.get('signedService', 'b')
            self.signedVersion = kwargs.get('signedVersion', '2021-04-10')
            self.value = kwargs.get('value', 'sample_value')

        def __iter__(self):
            for attr in self.__dict__:
                yield attr, self.__dict__[attr]

    class DummyBlobServiceClient:
        def __init__(self, *args, **kwargs):
            pass

        def get_container_client(self, container_name):
            return DummyAzureContainer(container_name)

        def get_user_delegation_key(self, key_start_time, key_expiry_time):
            return MockUserDelegationKey()

    class DummyClientSecretCredential:
        def __init__(self, *args, **kwargs):
            pass

        def get_token(self):
            return 'token'

    with mock.patch.object(models, 'ClientSecretCredential', DummyClientSecretCredential):
        with mock.patch.object(models, 'BlobServiceClient', DummyBlobServiceClient):
            with mock.patch.object(models, 'generate_blob_sas', return_value='token'):
                yield


@contextmanager
def redis_client_mock():
    from fakeredis import FakeRedis
    from io_storages.redis.models import RedisStorageMixin

    redis = FakeRedis()
    # TODO: add mocked redis data

    with mock.patch.object(RedisStorageMixin, 'get_redis_connection', return_value=redis):
        yield


def upload_data(client, project, tasks):
    tasks = TaskWithAnnotationsSerializer(tasks, many=True).data
    data = [{'data': task['data'], 'annotations': task['annotations']} for task in tasks]
    return client.post(f'/api/projects/{project.id}/tasks/bulk', data=data, content_type='application/json')


def make_project(config, user, use_ml_backend=True, team_id=None, org=None):
    if org is None:
        org = Organization.objects.filter(created_by=user).first()
    project = Project.objects.create(created_by=user, organization=org, **config)
    if use_ml_backend:
        MLBackend.objects.create(project=project, url='http://localhost:8999')

    return project


@pytest.fixture
@pytest.mark.django_db
def project_id(business_client):
    payload = dict(title='test_project')
    response = business_client.post(
        '/api/projects/',
        data=json.dumps(payload),
        content_type='application/json',
    )
    return response.json()['id']


def make_task(config, project):
    from tasks.models import Task

    return Task.objects.create(project=project, overlap=project.maximum_annotations, **config)


def create_business(user):
    return None


def make_annotation(config, task_id):
    from tasks.models import Annotation, Task

    task = Task.objects.get(pk=task_id)

    return Annotation.objects.create(project_id=task.project_id, task_id=task_id, **config)


def make_prediction(config, task_id):
    from tasks.models import Prediction, Task

    task = Task.objects.get(pk=task_id)
    return Prediction.objects.create(task_id=task_id, project=task.project, **config)


def make_annotator(config, project, login=False, client=None):
    from users.models import User

    user = User.objects.create(**config)
    user.set_password('12345')
    user.save()

    create_business(user)
    if login:
        Organization.create_organization(created_by=user, title=user.first_name)

        if client is None:

            client = Client()
        signin_status_code = signin(client, config['email'], '12345').status_code
        assert signin_status_code == 302, f'Sign-in status code: {signin_status_code}'

    project.add_collaborator(user)
    if login:
        client.annotator = user
        return client
    return user


def invite_client_to_project(client, project):
    if apps.is_installed('annotators'):
        return client.get(f'/annotator/invites/{project.token}/')
    else:
        return SimpleNamespace(status_code=200)


def login(client, email, password):
    if User.objects.filter(email=email).exists():
        r = client.post('/user/login/', data={'email': email, 'password': password})
        assert r.status_code == 302, r.status_code
    else:
        r = client.post('/user/signup/', data={'email': email, 'password': password, 'title': 'Whatever'})
        assert r.status_code == 302, r.status_code


def signin(client, email, password):
    return client.post('/user/login/', data={'email': email, 'password': password})


def signout(client):
    return client.get('/logout')


def _client_is_annotator(client):
    return 'annotator' in client.user.email


def save_response(response):
    fp = os.path.join(settings.TEST_DATA_ROOT, 'tavern-output.json')
    with open(fp, 'w') as f:
        json.dump(response.json(), f)


def os_independent_path(_, path, add_tempdir=False):
    os_independent_path = Path(path)
    if add_tempdir:
        tempdir = Path(tempfile.gettempdir())
        os_independent_path = tempdir / os_independent_path

    os_independent_path_parent = os_independent_path.parent
    return Box(
        {
            'os_independent_path': str(os_independent_path),
            'os_independent_path_parent': str(os_independent_path_parent),
            'os_independent_path_tmpdir': str(Path(tempfile.gettempdir())),
        }
    )


def verify_docs(response):
    for _, path in response.json()['paths'].items():
        print(path)
        for _, method in path.items():
            print(method)
            if isinstance(method, dict):
                assert 'api' not in method['tags'], f'Need docs for API method {method}'


def empty_list(response):
    assert len(response.json()) == 0, f'Response should be empty, but is {response.json()}'


def save_export_file_path(response):
    export_id = response.json().get('id')
    export = Export.objects.get(id=export_id)
    file_path = export.file.path
    return Box({'file_path': file_path})


def save_convert_file_path(response, export_id=None):
    export = response.json()[0]
    convert = export['converted_formats'][0]

    converted = ConvertedFormat.objects.get(id=convert['id'])

    dir_path = os.path.join(settings.MEDIA_ROOT, settings.DELAYED_EXPORT_DIR)
    os.listdir(dir_path)
    try:
        file_path = converted.file.path
        return Box({'convert_file_path': file_path})
    except ValueError:
        return Box({'convert_file_path': None})


def file_exists_in_storage(response, exists=True, file_path=None):
    if not file_path:
        export_id = response.json().get('id')
        export = Export.objects.get(id=export_id)
        file_path = export.file.path

    assert os.path.isfile(file_path) == exists
