"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import pytest
import ujson as json
import requests_mock
import re
import boto3
import logging
import shutil
import tempfile

from moto import mock_s3
from copy import deepcopy
from pathlib import Path

from django.conf import settings
from projects.models import Project
from tasks.models import Task
from users.models import User
from organizations.models import Organization
from types import SimpleNamespace

# if we haven't this package, pytest.ini::env doesn't work 
try:
    import pytest_env.plugin
except ImportError:
    print('\n\n !!! Please, pip install pytest-env \n\n')
    exit(-100)

from .utils import (
    create_business, signin, gcs_client_mock, ml_backend_mock, register_ml_backend_mock, azure_client_mock,
    redis_client_mock, make_project
)

boto3.set_stream_logger('botocore.credentials', logging.DEBUG)


@pytest.fixture(autouse=False)
def enable_csrf():
    settings.USE_ENFORCE_CSRF_CHECKS = True


@pytest.fixture(autouse=True)
def disable_sentry():
    settings.SENTRY_RATE = 0
    settings.SENTRY_DSN = None


@pytest.fixture()
def debug_modal_exceptions_false(settings):
    settings.DEBUG_MODAL_EXCEPTIONS = False


@pytest.fixture(scope="function")
def enable_sentry():
    settings.SENTRY_RATE = 0
    # it's disabled key, but this is correct
    settings.SENTRY_DSN = 'https://44f7a50de5ab425ca6bc406ef69b2122@o227124.ingest.sentry.io/5820521'


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
    bucket_name = 'pytest-s3-images'
    s3.create_bucket(Bucket=bucket_name)
    s3.put_object(Bucket=bucket_name, Key='image1.jpg', Body='123')
    s3.put_object(Bucket=bucket_name, Key='subdir/image1.jpg', Body='456')
    s3.put_object(Bucket=bucket_name, Key='subdir/image2.jpg', Body='789')
    s3.put_object(Bucket=bucket_name, Key='subdir/another/image2.jpg', Body='0ab')
    yield s3


@pytest.fixture(autouse=True)
def s3_with_jsons(s3):
    bucket_name = 'pytest-s3-jsons'
    s3.create_bucket(Bucket=bucket_name)
    s3.put_object(Bucket=bucket_name, Key='test.json', Body=json.dumps({'image_url': 'http://ggg.com/image.jpg'}))
    yield s3


@pytest.fixture(autouse=True)
def s3_with_hypertext_s3_links(s3):
    bucket_name = 'pytest-s3-jsons-hypertext'
    s3.create_bucket(Bucket=bucket_name)
    s3.put_object(Bucket=bucket_name, Key='test.json', Body=json.dumps({
        'text': "<a href=\"s3://hypertext-bucket/file with /spaces and' / ' / quotes.jpg\"/>"
    }))
    yield s3


@pytest.fixture(autouse=True)
def s3_with_unexisted_links(s3):
    bucket_name = 'pytest-s3-jsons-unexisted_links'
    s3.create_bucket(Bucket=bucket_name)
    s3.put_object(Bucket=bucket_name, Key='some-existed-image.jpg', Body='qwerty')
    yield s3


@pytest.fixture(autouse=True)
def s3_export_bucket(s3):
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
def redis_client():
    with redis_client_mock():
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

    create_business(user)
    org = Organization.create_organization(created_by=user, title=user.first_name)
    user.active_organization = org
    user.save()

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

    if signin(client, email, password).status_code != 302:
        print(f'User {user} failed to login!')
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
    if signin(client, email, password).status_code != 302:
        print(f'User {user} failed to login!')
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
    if signin(client, email, password).status_code != 302:
        print(f'User {user} failed to login!')
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


@pytest.fixture(name="django_live_url")
def get_server_url(live_server):
    yield live_server.url


@pytest.fixture(name="local_files_storage")
def local_files_storage(settings):
    settings.LOCAL_FILES_SERVING_ENABLED = True
    tempdir = Path(tempfile.gettempdir()) / Path('files')
    subdir = tempdir / Path('subdir')
    os.makedirs(str(subdir), exist_ok=True)
    test_image = Path(*'tests/test_suites/samples/test_image.png'.split('/'))
    shutil.copyfile(str(test_image), str(tempdir / Path('test_image1.png')))
    shutil.copyfile(str(test_image), str(subdir / Path('test_image2.png')))


@pytest.fixture(name="local_files_document_root_tempdir")
def local_files_document_root_tempdir(settings):
    tempdir = Path(tempfile.gettempdir())
    settings.LOCAL_FILES_DOCUMENT_ROOT = tempdir.root


@pytest.fixture(name="local_files_document_root_subdir")
def local_files_document_root_subdir(settings):
    tempdir = Path(tempfile.gettempdir()) / Path('files')
    settings.LOCAL_FILES_DOCUMENT_ROOT = str(tempdir)
