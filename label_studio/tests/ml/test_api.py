import json

import pytest
from data_manager.managers import annotate_predictions_score
from ml.models import MLBackend
from projects.models import Task
from rest_framework import status
from tasks.models import Prediction

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
def test_predictions_score_uses_backend_model_version_when_project_model_version_is_backend_title(business_client):
    project = make_project(
        config=dict(
            is_published=True,
            label_config=PROJECT_CONFIG,
            title='test_predictions_score_model_version_title_mapping',
            model_version='My ML Backend',
        ),
        user=business_client.user,
    )
    MLBackend.objects.create(
        project=project,
        title='My ML Backend',
        model_version='v1',
        url='http://127.0.0.1:9090',
    )
    task = Task.objects.create(project=project, data={'image_url': 'http://example.com/image.jpg'})
    Prediction.objects.create(
        task=task,
        project=project,
        result=[{}],
        score=0.87,
        model_version='v1',
    )

    annotated_task = annotate_predictions_score(Task.objects.filter(id=task.id)).values('predictions_score').first()

    assert annotated_task['predictions_score'] == pytest.approx(0.87)


@pytest.mark.django_db
def test_predictions_score_uses_project_model_version_from_imported_predictions_without_backend_mapping(
    business_client,
):
    project = make_project(
        config=dict(
            is_published=True,
            label_config=PROJECT_CONFIG,
            title='test_preds_score_imported_no_backend_mapping',
            model_version='',
        ),
        user=business_client.user,
    )
    task = Task.objects.create(project=project, data={'image_url': 'http://example.com/image.jpg'})

    response = business_client.post(
        f'/api/projects/{project.id}/import/predictions',
        data=[
            {
                'task': task.id,
                'result': [
                    {
                        'from_name': 'label',
                        'to_name': 'image',
                        'type': 'choices',
                        'value': {'choices': ['pos']},
                    }
                ],
                'score': 0.11,
                'model_version': 'imported-v1',
            },
            {
                'task': task.id,
                'result': [
                    {
                        'from_name': 'label',
                        'to_name': 'image',
                        'type': 'choices',
                        'value': {'choices': ['neg']},
                    }
                ],
                'score': 0.89,
                'model_version': 'imported-v2',
            },
        ],
        content_type='application/json',
    )
    assert response.status_code == 201
    assert response.json()['created'] == 2

    # Empty string means "no selected model version", so score should be null (not averaged across all predictions).
    annotated_task = annotate_predictions_score(Task.objects.filter(id=task.id)).values('predictions_score').first()
    assert annotated_task['predictions_score'] is None

    project.model_version = 'imported-v2'
    project.save(update_fields=['model_version'])

    annotated_task = annotate_predictions_score(Task.objects.filter(id=task.id)).values('predictions_score').first()

    assert annotated_task['predictions_score'] == pytest.approx(0.89)


@pytest.mark.django_db
def test_ml_backend_local_url_blocked_by_default(business_client, ml_backend_for_test_api):
    """ML_BLOCK_LOCAL_IP defaults to on, so a backend on a loopback address is rejected."""
    project = make_project(
        config=dict(
            is_published=True,
            label_config=PROJECT_CONFIG,
            title='test_ml_backend_local_url',
        ),
        user=business_client.user,
    )

    response = business_client.post(
        '/api/ml/',
        data={
            'project': project.id,
            'title': 'local_ml_backend',
            'url': 'http://127.0.0.1:9090',
        },
    )
    assert response.status_code == 403
    assert 'reserved network address' in response.json()['detail']


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
