"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import pytest
import ujson as json
import requests_mock
import re
import boto3
import logging

from moto import mock_s3
from copy import deepcopy
from django.conf import settings
from projects.models import Project
from tasks.models import Task
from tests.utils import make_project
from users.models import User
from organizations.models import Organization
from types import SimpleNamespace

from .utils import create_business, signin, gcs_client_mock, ml_backend_mock, register_ml_backend_mock, azure_client_mock


boto3.set_stream_logger('botocore.credentials', logging.DEBUG)


@pytest.fixture(scope='function')
def aws_credentials():
    """Mocked AWS Credentials for moto."""
    os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
    os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
    os.environ['AWS_SECURITY_TOKEN'] = 'testing'
    os.environ['AWS_SESSION_TOKEN'] = 'testing'


@pytest.fixture(autouse=True)
def azure_credentials():
    """Mocked Azure credentials"""
    os.environ['AZURE_BLOB_ACCOUNT_NAME'] = 'testing'
    os.environ['AZURE_BLOB_ACCOUNT_KEY'] = 'testing'


@pytest.fixture(scope='function')
def s3(aws_credentials):
    with mock_s3():
        yield boto3.client('s3', region_name='us-east-1')


@pytest.fixture(autouse=True)
def s3_with_images(s3):
    """
    Bucket structure:
    s3://pytest-s3-images/image1.jpg
    s3://pytest-s3-images/subdir/image1.jpg
    s3://pytest-s3-images/subdir/image2.jpg
    """
    with mock_s3():
        bucket_name = 'pytest-s3-images'
        s3.create_bucket(Bucket=bucket_name)
        s3.put_object(Bucket=bucket_name, Key='image1.jpg', Body='123')
        s3.put_object(Bucket=bucket_name, Key='subdir/image1.jpg', Body='456')
        s3.put_object(Bucket=bucket_name, Key='subdir/image2.jpg', Body='789')
        yield s3


@pytest.fixture(autouse=True)
def s3_export_bucket(s3):
    with mock_s3():
        bucket_name = 'pytest-export-s3-bucket'
        s3.create_bucket(Bucket=bucket_name)
        yield s3


@pytest.fixture(autouse=True)
def gcs_client():
    with gcs_client_mock():
        yield


@pytest.fixture(autouse=True)
def azure_client():
    with azure_client_mock():
        yield


@pytest.fixture(autouse=True)
def ml_backend():
    with ml_backend_mock() as m:
        yield m


@pytest.fixture(autouse=True)
def ml_backend_1(ml_backend):
    register_ml_backend_mock(ml_backend, url='https://test.heartex.mlbackend.com:9090', setup_model_version='Fri Feb 19 17:10:44 2021')
    register_ml_backend_mock(ml_backend, url='https://test.heartex.mlbackend.com:9091', health_connect_timeout=True)
    register_ml_backend_mock(ml_backend, url='http://localhost:8999', predictions={'results': []})
    yield ml_backend


def pytest_configure():
    for q in settings.RQ_QUEUES.values():
        q['ASYNC'] = False


class URLS:
    """ This class keeps urls with api
    """
    def __init__(self):
        self.project_create = '/api/projects/'
        self.task_bulk = None

    def set_project(self, pk):
        self.task_bulk = f'/api/projects/{pk}/tasks/bulk/'
        self.plots = f'/projects/{pk}/plots'


def project_ranker():
    label = '''<View>
         <HyperText name="hypertext_markup" value="$markup"></HyperText>
         <List name="ranker" value="$replies" elementValue="$text" elementTag="Text" 
               ranked="true" sortedHighlightColor="#fcfff5"></List>
        </View>'''
    return {'label_config': label, 'title': 'test'}


def project_dialog():
    """ Simple project with dialog configs

    :return: config of project with task
    """    
    label = '''<View>
      <TextEditor>
        <Text name="dialog" value="$dialog"></Text>
        <Header name="header" value="Your answer is:"></Header>
        <TextArea name="answer"></TextArea>
      </TextEditor>
    </View>'''

    return {'label_config': label, 'title': 'test'}


def project_choices():
    label = """<View>
    <Choices name="animals" toName="xxx" choice="single-radio">
      <Choice value="Cat"></Choice>
      <Choice value="Dog"></Choice>
      <Choice value="Opossum"></Choice>
      <Choice value="Mouse"></Choice>
      <Choice value="Human"/>
    </Choices>

    <Choices name="things" toName="xxx" choice="single-radio">
      <Choice value="Chair"></Choice>
      <Choice value="Car"></Choice>
      <Choice value="Lamp"></Choice>
      <Choice value="Guitar"></Choice>
      <Choice value="None"/>
    </Choices>
    
    <Image name="xxx" value="$image"></Image>
    </View>"""
    return {'label_config': label, 'title': 'test'}


def setup_project(client, project_template, do_auth=True):
    """ Create new test@gmail.com user, login via client, create test project.
    Project configs are thrown over params and automatically grabs from functions names started with 'project_'

    :param client: fixture with http client (from pytest-django package) and simulation of http server
    :param project_template: dict with project config
    :param do_auth: make authorization for creating user
    """
    client = deepcopy(client)
    email = "test@gmail.com"
    password = "test"
    urls = URLS()
    project_config = project_template()

    # we work in empty database, so let's create business user and login
    user = User.objects.create(email=email)
    user.set_password(password)  # set password without hash
    user.save()

    create_business(user)
    org = Organization.create_organization(created_by=user, title=user.first_name)

    if do_auth:

        assert signin(client, email, password).status_code == 302
        # create project
        with requests_mock.Mocker() as m:
            m.register_uri('POST', re.compile(r'ml\.heartex\.net/\d+/validate'), text=json.dumps({'status': 'ok'}))
            m.register_uri('GET', re.compile(r'ml\.heartex\.net/\d+/health'), text=json.dumps({'status': 'UP'}))
            r = client.post(urls.project_create, data=project_config)
            print('Project create with status code:', r.status_code)
            assert r.status_code == 201, f'Create project result should be redirect to the next page'

        # get project id and prepare url
        project = Project.objects.filter(title=project_config['title']).first()
        urls.set_project(project.pk)
        print('Project id:', project.id)

        client.project = project

    client.user = user
    client.urls = urls
    client.project_config = project_config
    client.org = org
    return client


@pytest.fixture
def setup_project_dialog(client):
    return setup_project(client, project_dialog)


@pytest.fixture
def setup_project_for_token(client):
    return setup_project(client, project_dialog, do_auth=False)


@pytest.fixture
def setup_project_ranker(client):
    return setup_project(client, project_ranker)


@pytest.fixture
def setup_project_choices(client):
    return setup_project(client, project_choices)


@pytest.fixture
def business_client(client):
    # we work in empty database, so let's create business user and login
    client = deepcopy(client)
    email = 'business@pytest.net'
    password = 'pytest'
    user = User.objects.create(email=email)
    user.set_password(password)  # set password without hash
    business = create_business(user)

    user.save()
    org = Organization.create_organization(created_by=user, title=user.first_name)
    client.business = business if business else SimpleNamespace(admin=user)
    client.team = None if business else SimpleNamespace(id=1)
    client.admin = user
    client.annotator = user
    client.user = user
    client.organization = org

    assert signin(client, email, password).status_code == 302
    return client


@pytest.fixture
def annotator_client(client):
    # we work in empty database, so let's create business user and login
    client = deepcopy(client)
    email = 'annotator@pytest.net'
    password = 'pytest'
    user = User.objects.create(email=email)
    user.set_password(password)  # set password without hash
    user.save()
    business = create_business(user)
    Organization.create_organization(created_by=user, title=user.first_name)
    assert signin(client, email, password).status_code == 302
    client.user = user
    client.annotator = user
    return client


@pytest.fixture
def annotator2_client(client):
    # we work in empty database, so let's create business user and login
    client = deepcopy(client)
    email = 'annotator2@pytest.net'
    password = 'pytest'
    user = User.objects.create(email=email)
    user.set_password(password)  # set password without hash
    user.save()
    business = create_business(user)
    Organization.create_organization(created_by=user, title=user.first_name)
    assert signin(client, email, password).status_code == 302
    client.user = user
    client.annotator = user
    return client


@pytest.fixture(params=['business', 'annotator'])
def any_client(request, business_client, annotator_client):
    if request.param == 'business':
        return business_client
    elif request.param == 'annotator':
        return annotator_client


@pytest.fixture
def configured_project(business_client, annotator_client):
    _project_for_text_choices_onto_A_B_classes = dict(
        title='Test',
        label_config='''
            <View>
              <Text name="meta_info" value="$meta_info"></Text>
              <Text name="text" value="$text"></Text>
              <Choices name="text_class" toName="text" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )
    _2_tasks_with_textA_and_textB = [
        {'meta_info': 'meta info A', 'text': 'text A'},
        {'meta_info': 'meta info B', 'text': 'text B'}
    ]

    # get user to be owner
    users = User.objects.filter(email='business@pytest.net')  # TODO: @nik: how to get proper email for business here?
    project = make_project(_project_for_text_choices_onto_A_B_classes, users[0])

    assert project.ml_backends.first().url == 'http://localhost:8999'

    Task.objects.bulk_create([Task(data=task, project=project) for task in _2_tasks_with_textA_and_textB])
    return project
