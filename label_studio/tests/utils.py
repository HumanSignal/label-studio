"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import ujson as json

import json
import requests_mock
import requests

from contextlib import contextmanager
from unittest import mock
from types import SimpleNamespace

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
    with requests_mock.Mocker() as m:
        yield register_ml_backend_mock(m, **kwargs)


def register_ml_backend_mock(m, url='http://localhost:9090', predictions=None, health_connect_timeout=False, train_job_id='123', setup_model_version='abc'):
    m.post(f'{url}/setup', text=json.dumps({'status': 'ok', 'model_version': setup_model_version}))
    if health_connect_timeout:
        m.get(f'{url}/health', exc=requests.exceptions.ConnectTimeout)
    else:
        m.get(f'{url}/health', text=json.dumps({'status': 'UP'}))
    m.post(f'{url}/train', text=json.dumps({'status': 'ok', 'job_id': train_job_id}))
    m.post(f'{url}/predict', text=json.dumps(predictions or {}))
    return m


class _TestJob(object):
    def __init__(self, job_id):
        self.id = job_id


@contextmanager
def mixpanel_mock():
    from mixpanel import Mixpanel, MixpanelException
    with mock.patch.object(Mixpanel, 'people_set'):
        yield


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
        def __init__(self, bucket_name, key):
            self.key = key
            self.bucket_name = bucket_name
        def download_as_string(self):
            return f'test_blob_{self.key}'
        def upload_from_string(self, string):
            print(f'String {string} uploaded to bucket {self.bucket_name}')
        def generate_signed_url(self, **kwargs):
            return f'https://storage.googleapis.com/{self.bucket_name}/{self.key}'

    class DummyGCSBucket:
        def __init__(self, bucket_name, **kwargs):
            self.name = bucket_name
        def list_blobs(self, prefix):
            return [File('abc'), File('def'), File('ghi')]
        def blob(self, key):
            return DummyGCSBlob(self.name, key)

    class DummyGCSClient():
        def get_bucket(self, bucket_name):
            return DummyGCSBucket(bucket_name)

    with mock.patch.object(google_storage, 'Client', return_value=DummyGCSClient()):
        yield


def upload_data(client, project, tasks):
    tasks = TaskWithAnnotationsSerializer(tasks, many=True).data
    data = [{'data': task['data'], 'annotations': task['annotations']} for task in tasks]
    return client.post(f'/api/projects/{project.id}/tasks/bulk', data=data, content_type='application/json')


def make_project(config, user, use_ml_backend=True, team_id=None):
    org = Organization.objects.filter(created_by=user).first()
    project = Project.objects.create(created_by=user, organization=org, **config)
    if use_ml_backend:
        MLBackend.objects.create(project=project, url='http://localhost:8999')

    return project


def make_task(config, project):
    from tasks.models import Task

    return Task.objects.create(project=project, overlap=project.maximum_annotations, **config)


def create_business(user):
    if Business:
        with mixpanel_mock(), email_mock():
            business = Business.objects.create(admin=user, is_approved=True, is_active=True)
            business.plan = BillingPlan.objects.get(ptype=BillingPlan.ENTERPRISE_V1)
            business.save()


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
