"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import ujson as json

import json
import pytest
import requests_mock
import requests
import tempfile

from contextlib import contextmanager
from unittest import mock
from types import SimpleNamespace
from box import Box
from pathlib import Path

from django.test import Client
from django.apps import apps
from projects.models import Project
from ml.models import MLBackend
from tasks.serializers import TaskWithAnnotationsSerializer
from organizations.models import Organization
from users.models import User

try:
    from businesses.models import Business, BillingPlan
except ImportError:
    BillingPlan = Business = None


@contextmanager
def ml_backend_mock(**kwargs):
    with requests_mock.Mocker(real_http=True) as m:
        yield register_ml_backend_mock(m, **kwargs)


def register_ml_backend_mock(m, url='http://localhost:9090', predictions=None, health_connect_timeout=False, train_job_id='123', setup_model_version='abc'):
    m.post(f'{url}/setup', text=json.dumps({'status': 'ok', 'model_version': setup_model_version}))
    if health_connect_timeout:
        m.get(f'{url}/health', exc=requests.exceptions.ConnectTimeout)
    else:
        m.get(f'{url}/health', text=json.dumps({'status': 'UP'}))
    m.post(f'{url}/train', text=json.dumps({'status': 'ok', 'job_id': train_job_id}))
    m.post(f'{url}/predict', text=json.dumps(predictions or {}))
    m.post(f'{url}/webhook', text=json.dumps({}))
    return m


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
    from io_storages.gcs.models import google_storage
    from collections import namedtuple

    File = namedtuple('File', ['name'])

    class DummyGCSBlob:
        def __init__(self, bucket_name, key, is_json):
            self.key = key
            self.bucket_name = bucket_name
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

    class DummyGCSBucket:
        def __init__(self, bucket_name, is_json, **kwargs):
            self.name = bucket_name
            self.is_json = is_json
        def list_blobs(self, prefix):
            return [File('abc'), File('def'), File('ghi')]
        def blob(self, key):
            return DummyGCSBlob(self.name, key, self.is_json)

    class DummyGCSClient():
        def get_bucket(self, bucket_name):
            is_json = bucket_name.endswith('_JSON')
            return DummyGCSBucket(bucket_name, is_json)

    with mock.patch.object(google_storage, 'Client', return_value=DummyGCSClient()):
        yield


@contextmanager
def azure_client_mock():
    from io_storages.azure_blob import models 
    from collections import namedtuple

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

    class DummyAzureContainer:
        def __init__(self, container_name, **kwargs):
            self.name = container_name
        def list_blobs(self, name_starts_with):
            return [File('abc'), File('def'), File('ghi')]
        def get_blob_client(self, key):
            return DummyAzureBlob(self.name, key)

    class DummyAzureClient():
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
    payload = dict(title="test_project")
    response = business_client.post(
        "/api/projects/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    return response.json()["id"]


def make_task(config, project):
    from tasks.models import Task

    return Task.objects.create(project=project, overlap=project.maximum_annotations, **config)


def create_business(user):
    return None


def make_annotation(config, task_id):
    from tasks.models import Annotation

    return Annotation.objects.create(task_id=task_id, **config)


def make_prediction(config, task_id):
    from tasks.models import Prediction

    return Prediction.objects.create(task_id=task_id, **config)


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
        r = client.post(f'/user/login/', data={'email': email, 'password': password})
        assert r.status_code == 302, r.status_code
    else:
        r = client.post(f'/user/signup/', data={'email': email, 'password': password, 'title': 'Whatever'})
        assert r.status_code == 302, r.status_code


def signin(client, email, password):
    return client.post(f'/user/login/', data={'email': email, 'password': password})


def _client_is_annotator(client):
    return 'annotator' in client.user.email


def save_response(response):
    filename = 'tavern-output.json'
    with open(filename, 'w') as f:
        json.dump(response.json(), f)


def check_response_with_json_file(response, json_file):
    response = response.json()
    filename = 'tavern-output.json'
    with open(filename, 'w') as f:
        json.dump(response, f, indent=4)

    with open(json_file, 'r') as f:
        true = json.load(f)
        assert response == true


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
