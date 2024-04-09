import json

import pytest
from projects.models import Task
from rest_framework import status

from label_studio.tests.utils import make_project, register_ml_backend_mock

ORIG_MODEL_NAME = 'basic_ml_backend'
PROJECT_CONFIG = """<View><Image name="image" value="$image_url"/><Choices name="label"
          toName="image"><Choice value="pos"/><Choice value="neg"/></Choices></View>"""


@pytest.fixture
def ml_backend_for_test_api(ml_backend):
    register_ml_backend_mock(
        ml_backend,
        url='https://ml_backend_for_test_api',
        setup_model_version='1.0.0',
    )
    yield ml_backend


@pytest.fixture
def mock_gethostbyname(mocker):
    mocker.patch('socket.gethostbyname', return_value='321.21.21.21')


@pytest.mark.django_db
def test_ml_backend_set_for_prelabeling(business_client, ml_backend_for_test_api, mock_gethostbyname):
    project = make_project(
        config=dict(
            is_published=True,
            label_config=PROJECT_CONFIG,
            title='test_ml_backend_creation',
        ),
        user=business_client.user,
    )

    assert project.model_version == ''

    # create ML backend
    response = business_client.post(
        '/api/ml/',
        data={
            'project': project.id,
            'title': 'ml_backend_title',
            'url': 'https://ml_backend_for_test_api',
        },
    )
    assert response.status_code == 201

    project.refresh_from_db()
    assert project.model_version == 'ml_backend_title'


@pytest.mark.django_db
def test_ml_backend_not_set_for_prelabeling(business_client, ml_backend_for_test_api, mock_gethostbyname):
    """We are not setting it when its already set for another name,
    for example when predictions were uploaded before"""

    project = make_project(
        config=dict(
            is_published=True,
            label_config=PROJECT_CONFIG,
            title='test_ml_backend_creation',
        ),
        user=business_client.user,
    )

    project.model_version = ORIG_MODEL_NAME
    project.save()

    # create ML backend
    response = business_client.post(
        '/api/ml/',
        data={
            'project': project.id,
            'title': 'ml_backend_title',
            'url': 'https://ml_backend_for_test_api',
        },
    )
    assert response.status_code == 201

    project.refresh_from_db()
    assert project.model_version == ORIG_MODEL_NAME


@pytest.mark.django_db
def test_model_version_on_save(business_client, ml_backend_for_test_api, mock_gethostbyname):
    project = make_project(
        config=dict(
            is_published=True,
            label_config=PROJECT_CONFIG,
            title='test_ml_backend_creation',
        ),
        user=business_client.user,
    )

    assert project.model_version == ''

    # create ML backend
    response = business_client.post(
        '/api/ml/',
        data={
            'project': project.id,
            'title': 'test_ml_backend_creation_ML_backend',
            'url': 'https://ml_backend_for_test_api',
        },
    )
    assert response.status_code == 201
    r = response.json()
    ml_backend_id = r['id']
    response = business_client.get(f'/api/ml/{ml_backend_id}')
    assert response.status_code == 200
    assert response.json()['state'] == 'CO'

    # select model version in project
    assert (
        business_client.patch(
            f'/api/projects/{project.id}',
            data=json.dumps({'model_version': 'test_ml_backend_creation_ML_backend'}),
            content_type='application/json',
        ).status_code
        == 200
    )

    # change ML backend title --> model version should be updated
    assert (
        business_client.patch(
            f'/api/ml/{ml_backend_id}',
            data=json.dumps(
                {
                    'project': project.id,
                    'title': 'new_title',
                    'url': 'https://ml_backend_for_test_api',
                }
            ),
            content_type='application/json',
        ).status_code
        == 200
    )
    project.refresh_from_db()
    assert project.model_version == 'new_title'


@pytest.mark.django_db
def test_model_version_on_delete(business_client, ml_backend_for_test_api, mock_gethostbyname):
    project = make_project(
        config=dict(
            is_published=True,
            label_config=PROJECT_CONFIG,
            title='test_ml_backend_creation',
        ),
        user=business_client.user,
    )

    assert project.model_version == ''

    # create ML backend
    response = business_client.post(
        '/api/ml/',
        data={
            'project': project.id,
            'title': 'test_ml_backend_creation_ML_backend',
            'url': 'https://ml_backend_for_test_api',
        },
    )
    assert response.status_code == 201
    r = response.json()
    ml_backend_id = r['id']
    response = business_client.get(f'/api/ml/{ml_backend_id}')
    assert response.status_code == 200
    assert response.json()['state'] == 'CO'

    # select model version in project
    assert (
        business_client.patch(
            f'/api/projects/{project.id}',
            data=json.dumps({'model_version': 'test_ml_backend_creation_ML_backend'}),
            content_type='application/json',
        ).status_code
        == 200
    )

    project.refresh_from_db()
    assert project.model_version == 'test_ml_backend_creation_ML_backend'

    # delete ML backend --> project's model version should be reset
    assert business_client.delete(f'/api/ml/{ml_backend_id}').status_code == 204
    project.refresh_from_db()
    assert project.model_version == ''


@pytest.mark.django_db
def test_security_write_only_payload(business_client, ml_backend_for_test_api, mock_gethostbyname):
    project = make_project(
        config=dict(
            is_published=True,
            label_config=PROJECT_CONFIG,
            title='test_ml_backend_creation',
        ),
        user=business_client.user,
    )

    # create ML backend - fails without password
    response = business_client.post(
        '/api/ml/',
        data={
            'project': project.id,
            'title': 'test_ml_backend_creation_ML_backend',
            'url': 'https://ml_backend_for_test_api',
            'auth_method': 'BASIC_AUTH',
            # 'basic_auth_user': 'user',
            # 'basic_auth_pass': '<SECRET>',
        },
    )
    assert response.status_code == 400
    r = response.json()
    assert (
        r['validation_errors']['non_field_errors'][0]
        == 'Authentication username and password is required for Basic Authentication.'
    )

    # create ML backend with username and password
    response = business_client.post(
        '/api/ml/',
        data={
            'project': project.id,
            'title': 'test_ml_backend_creation_ML_backend',
            'url': 'https://ml_backend_for_test_api',
            'auth_method': 'BASIC_AUTH',
            'basic_auth_user': 'user',
            'basic_auth_pass': '<SECRET>',
        },
    )
    assert response.status_code == 201
    r = response.json()
    # security check that password is not returned in POST response
    assert 'basic_auth_pass' not in r
    ml_backend_id = r['id']
    response = business_client.get(f'/api/ml/{ml_backend_id}')
    assert response.status_code == 200
    # check that password is not returned in GET response
    assert 'basic_auth_pass' not in response.json()

    # patch ML backend without password - must pass since it uses write_only field for previous password
    response = business_client.patch(
        f'/api/ml/{ml_backend_id}',
        data=json.dumps(
            {
                'project': project.id,
                'title': 'new_title_1',
                'url': 'https://ml_backend_for_test_api',
            }
        ),
        content_type='application/json',
    )
    assert response.status_code == 200
    # check that password is not returned in PATCH response
    assert 'basic_auth_pass' not in response.json()

    # patch ML backend with password
    response = business_client.patch(
        f'/api/ml/{ml_backend_id}',
        data=json.dumps(
            {
                'project': project.id,
                'title': 'new_title',
                'url': 'https://ml_backend_for_test_api',
                'basic_auth_pass': '<ANOTHER_SECRET>',
            }
        ),
        content_type='application/json',
    )
    # check that password is not returned in PATCH response
    assert 'basic_auth_pass' not in response.json()

    from ml.models import MLBackend

    ml_backend = MLBackend.objects.get(id=ml_backend_id)
    assert ml_backend.basic_auth_pass == '<ANOTHER_SECRET>'


@pytest.mark.django_db
def test_ml_backend_predict_test_api_post_random_true(business_client):
    project = make_project(
        config=dict(
            is_published=True,
            label_config=PROJECT_CONFIG,
            title='test_ml_backend_creation',
        ),
        user=business_client.user,
        use_ml_backend=True,
    )
    Task.objects.create(project=project, data={'image': 'http://example.com/image.jpg'})

    # get ML backend id from project
    project.refresh_from_db()
    ml_backend = project.get_ml_backends().first()

    response = business_client.post(f'/api/ml/{ml_backend.id}/predict/test?random=true')

    assert response.status_code == status.HTTP_200_OK
    r = response.json()
    assert r['url'] == 'http://localhost:8999/predict'
    assert r['status'] == 200
