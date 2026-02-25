"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import os.path
import re
import tempfile
from contextlib import contextmanager
from copy import deepcopy
from functools import wraps
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import pytest
import requests
import requests_mock
import ujson as json
from core.feature_flags import flag_set
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
logger = logging.getLogger(__name__)


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
    # be careful, this is a global contextmanager (sample_blob_names)
    # and will affect all tests because it will be applied to all tests that use gcs_client
    # it may lead to flaky tests if the sample blob names are not deterministic

    from collections import namedtuple

    from google.cloud import storage as google_storage

    def get_sample_blob_names_for_bucket(bucket_name):
        # Bucket-specific logic to avoid test bleed
        if bucket_name in ['pytest-recursive-scan-bucket']:
            result = ['dataset/', 'dataset/a.json', 'dataset/sub/b.json', 'other/c.json']
            logger.info(f'get_sample_blob_names_for_bucket({bucket_name}) -> {result} (recursive scan bucket)')
            return result
        elif bucket_name.startswith('multitask_'):
            result = ['test.json']
            logger.info(f'get_sample_blob_names_for_bucket({bucket_name}) -> {result} (multitask)')
            return result
        elif bucket_name.startswith('test-gs-bucket'):
            # Force deterministic samples for standard GCS test buckets - never use closure variable
            result = ['abc', 'def', 'ghi']
            logger.info(f'get_sample_blob_names_for_bucket({bucket_name}) -> {result} (test-gs-bucket prefix)')
            return result
        else:
            result = ['abc', 'def', 'ghi']
            logger.info(f'get_sample_blob_names_for_bucket({bucket_name}) -> {result} (default)')
            return result

    class DummyGCSBlob:
        def __init__(self, bucket_name, key, is_json, is_multitask):
            self.key = key
            self.bucket_name = bucket_name
            # Align with google-cloud-storage: Blob.name is the object key within the bucket
            self.name = key
            self.is_json = is_json
            self.sample_json_contents = (
                [
                    {'data': {'image_url': 'http://ggg.com/image.jpg', 'text': 'Task 1 text'}},
                    {'data': {'image_url': 'http://ggg.com/image2.jpg', 'text': 'Task 2 text'}},
                ]
                if is_multitask
                else {
                    'str_field': 'test',
                    'int_field': 123,
                    'dict_field': {'one': 'wow', 'two': 456},
                }
            )

        def download_as_string(self):
            data = f'test_blob_{self.key}'
            if self.is_json:
                payload = json.dumps(self.sample_json_contents)
                logger.info(
                    f'DummyGCSBlob.download_as_string bucket={self.bucket_name} key={self.key} json=True bytes={len(payload)}'
                )
                return payload
            logger.info(f'DummyGCSBlob.download_as_string bucket={self.bucket_name} key={self.key} json=False')
            return data

        def upload_from_string(self, string):
            print(f'String {string} uploaded to bucket {self.bucket_name}')

        def generate_signed_url(self, **kwargs):
            url = f'https://storage.googleapis.com/{self.bucket_name}/{self.key}'
            logger.info(f'DummyGCSBlob.generate_signed_url url={url}')
            return url

        def download_as_bytes(self):
            b = self.download_as_string().encode('utf-8')
            logger.info(f'DummyGCSBlob.download_as_bytes bucket={self.bucket_name} key={self.key} size={len(b)}')
            return b

    class DummyGCSBucket:
        def __init__(self, bucket_name, is_json, is_multitask):
            self.name = bucket_name
            self.is_json = is_json
            self.is_multitask = is_multitask
            # Use bucket-specific sample names
            self.sample_blob_names = get_sample_blob_names_for_bucket(bucket_name)

        def list_blobs(self, prefix, **kwargs):
            File = namedtuple('File', ['name'])

            if 'fake' in prefix:
                logger.info(f'DummyGCSBucket.list_blobs bucket={self.name} prefix={prefix} -> [] (fake)')
                return []

            # Handle delimiter for non-recursive listing (only direct children)
            if 'delimiter' in kwargs and kwargs['delimiter']:
                delimiter = kwargs['delimiter']
                pref = prefix or ''
                if pref:
                    search_prefix = pref if pref.endswith(delimiter) else pref + delimiter
                    filtered_names = []
                    for name in self.sample_blob_names:
                        if name.startswith(search_prefix):
                            remaining_path = name[len(search_prefix) :]
                            if delimiter not in remaining_path:
                                filtered_names.append(name)
                else:
                    # Root-level: only keys without delimiter are direct children
                    filtered_names = [name for name in self.sample_blob_names if delimiter not in name]
                logger.info(
                    f'DummyGCSBucket.list_blobs bucket={self.name} prefix={prefix} delimiter={delimiter} -> {filtered_names}'
                )
                return [File(name) for name in filtered_names]
            result = [name for name in self.sample_blob_names if prefix is None or name.startswith(prefix)]
            logger.info(f'DummyGCSBucket.list_blobs bucket={self.name} prefix={prefix} -> {result}')
            return [File(name) for name in result]

        def blob(self, key):
            logger.info(f'DummyGCSBucket.blob bucket={self.name} key={key}')
            return DummyGCSBlob(self.name, key, self.is_json, self.is_multitask)

    class DummyGCSClient:
        def get_bucket(self, bucket_name):
            is_json = bucket_name.endswith('_JSON')
            is_multitask = bucket_name.startswith('multitask_')
            logger.info(
                f'DummyGCSClient.get_bucket bucket={bucket_name} is_json={is_json} is_multitask={is_multitask}'
            )
            return DummyGCSBucket(bucket_name, is_json, is_multitask)

        def list_blobs(self, bucket_name, prefix, delimiter=None):
            is_json = bucket_name.endswith('_JSON')
            is_multitask = bucket_name.startswith('multitask_')
            sample_blob_names = get_sample_blob_names_for_bucket(bucket_name)

            # Handle delimiter for non-recursive listing (only direct children)
            if delimiter:
                pref = prefix or ''
                if pref:
                    search_prefix = pref if pref.endswith(delimiter) else pref + delimiter
                    filtered_names = []
                    for name in sample_blob_names:
                        if name.startswith(search_prefix):
                            remaining_path = name[len(search_prefix) :]
                            if delimiter not in remaining_path:
                                filtered_names.append(name)
                else:
                    # Root-level: only keys without delimiter are direct children
                    filtered_names = [name for name in sample_blob_names if delimiter not in name]
                logger.info(
                    f'DummyGCSClient.list_blobs bucket={bucket_name} prefix={prefix} delimiter={delimiter} -> {filtered_names}'
                )
                return [DummyGCSBlob(bucket_name, name, is_json, is_multitask) for name in filtered_names]

            result = [name for name in sample_blob_names if prefix is None or name.startswith(prefix)]
            logger.info(f'DummyGCSClient.list_blobs bucket={bucket_name} prefix={prefix} -> {result}')
            return [
                DummyGCSBlob(bucket_name, name, is_json, is_multitask)
                for name in sample_blob_names
                if prefix is None or name.startswith(prefix)
            ]

    with mock.patch.object(google_storage, 'Client', return_value=DummyGCSClient()):
        logger.info('gcs_client_mock installed')
        yield google_storage


@contextmanager
def azure_client_mock(sample_json_contents=None, sample_blob_names=None):
    # be careful, this is a global contextmanager (sample_json_contents, sample_blob_names)
    # and will affect all tests because it will be applied to all tests that use azure_client
    # and it may lead to flaky tests if the sample blob names are not deterministic

    from collections import namedtuple

    from io_storages.azure_blob import models

    File = namedtuple('File', ['name'])

    sample_json_contents = sample_json_contents or {
        'str_field': 'test',
        'int_field': 123,
        'dict_field': {'one': 'wow', 'two': 456},
    }
    sample_blob_names = sample_blob_names or ['abc', 'def', 'ghi']

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
            return json.dumps(sample_json_contents)

        def content_as_bytes(self):
            return json.dumps(sample_json_contents).encode('utf-8')

    class DummyAzureContainer:
        def __init__(self, container_name, **kwargs):
            self.name = container_name
            self.sample_blob_names = deepcopy(sample_blob_names)

        def list_blobs(self, name_starts_with):
            return [File(name) for name in self.sample_blob_names]

        def walk_blobs(self, name_starts_with, delimiter):
            return [File(name) for name in self.sample_blob_names]

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
def redis_client_mock():
    from fakeredis import FakeRedis
    from io_storages.redis.models import RedisStorageMixin

    redis = FakeRedis(decode_responses=True)
    # TODO: add mocked redis data

    with mock.patch.object(RedisStorageMixin, 'get_redis_connection', return_value=redis):
        yield redis


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
    payload = dict(
        title='test_project',
        label_config='<View><Text name="text" value="$text"/><Choices name="test_batch_predictions" toName="text"><Choice value="class_A"/><Choice value="class_B"/></Choices></View>',
    )
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
    return {
        'os_independent_path': str(os_independent_path),
        'os_independent_path_parent': str(os_independent_path_parent),
        'os_independent_path_tmpdir': str(Path(tempfile.gettempdir())),
    }


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
    return {'file_path': file_path}


def save_convert_file_path(response, export_id=None):
    export = response.json()[0]
    convert = export['converted_formats'][0]

    converted = ConvertedFormat.objects.get(id=convert['id'])

    dir_path = os.path.join(settings.MEDIA_ROOT, settings.DELAYED_EXPORT_DIR)
    os.listdir(dir_path)
    try:
        file_path = converted.file.path
        return {'convert_file_path': file_path}
    except ValueError:
        return {'convert_file_path': None}


def file_exists_in_storage(response, exists=True, file_path=None):
    if not file_path:
        export_id = response.json().get('id')
        export = Export.objects.get(id=export_id)
        file_path = export.file.path

    assert os.path.isfile(file_path) == exists


def mock_feature_flag(flag_name: str, value: bool, parent_module: str = 'core.feature_flags'):
    """Decorator to mock a feature flag state for a test function.

    Args:
        flag_name: Name of the feature flag to mock
        value: True or False to set the flag state
        parent_module: Module path containing the flag_set function to patch
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            def fake_flag_set(feature_flag, *flag_args, **flag_kwargs):
                if feature_flag == flag_name:
                    return value
                return flag_set(feature_flag, *flag_args, **flag_kwargs)

            with mock.patch(f'{parent_module}.flag_set', wraps=fake_flag_set):
                return func(*args, **kwargs)

        return wrapper

    return decorator
