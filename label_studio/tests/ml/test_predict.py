import pytest
import json
from label_studio.tests.utils import make_project, make_task, register_ml_backend_mock


@pytest.fixture
def ml_backend_for_test_predict(ml_backend):
    # ML backend with single prediction per task
    register_ml_backend_mock(ml_backend, url='http://localhost:9092', predictions={'results': [
        {'model_version': 'ModelSingle', 'score': 0.1, 'result': [{'from_name': 'label', 'to_name': 'text', 'type': 'choices', 'value': {'choices': ['Single']}}]},
    ]})
    # ML backend with multiple predictions per task
    register_ml_backend_mock(ml_backend, url='http://localhost:9093', predictions={'results': [
        [
            {'model_version': 'ModelA', 'score': 0.2, 'result': [{'from_name': 'label', 'to_name': 'text', 'type': 'choices', 'value': {'choices': ['label_A']}}]},
            {'model_version': 'ModelB', 'score': 0.3, 'result': [{'from_name': 'label', 'to_name': 'text', 'type': 'choices', 'value': {'choices': ['label_B']}}]},
        ]
    ]})
    yield ml_backend


@pytest.mark.django_db
def test_get_single_prediction_on_task(business_client, ml_backend_for_test_predict):
    project = make_project(
        config=dict(
            is_published=True,
            label_config="""
                <View>
                  <Text name="text" value="$text"></Text>
                  <Choices name="label" choice="single">
                    <Choice value="label_A"></Choice>
                    <Choice value="label_B"></Choice>
                  </Choices>
                </View>""",
            title='test_get_single_prediction_on_task',
        ),
        user=business_client.user,
        use_ml_backend=False
    )

    make_task({'data': {'text': 'test 1'}}, project)
    make_task({'data': {'text': 'test 2'}}, project)
    make_task({'data': {'text': 'test 3'}}, project)

    # setup ML backend with single prediction per task
    response = business_client.post(
        '/api/ml/',
        data={
            'project': project.id,
            'title': 'ModelSingle',
            'url': 'http://localhost:9092',
        },
    )
    assert response.status_code == 201

    # get next task
    response = business_client.get(f'/api/projects/{project.id}/next')
    payload = json.loads(response.content)

    # ensure task has a single prediction with the correct value
    assert len(payload['predictions']) == 1
    assert payload['predictions'][0]['result'][0]['value']['choices'][0] == 'Single'
    assert payload['predictions'][0]['model_version'] == 'ModelSingle'


@pytest.mark.django_db
def test_get_multiple_predictions_on_task(business_client, ml_backend_for_test_predict):
    project = make_project(
        config=dict(
            is_published=True,
            label_config="""
                <View>
                  <Text name="text" value="$text"></Text>
                  <Choices name="label" choice="single">
                    <Choice value="label_A"></Choice>
                    <Choice value="label_B"></Choice>
                  </Choices>
                </View>""",
            title='test_get_multiple_predictions_on_task',
        ),
        user=business_client.user,
        use_ml_backend=False
    )

    make_task({'data': {'text': 'test 1'}}, project)
    make_task({'data': {'text': 'test 2'}}, project)
    make_task({'data': {'text': 'test 3'}}, project)

    # setup ML backend with multiple predictions per task
    response = business_client.post(
        '/api/ml/',
        data={
            'project': project.id,
            'title': 'ModelA',
            'url': 'http://localhost:9093',
        },
    )
    assert response.status_code == 201

    # get next task
    response = business_client.get(f'/api/projects/{project.id}/next')
    payload = json.loads(response.content)

    # ensure task has multiple predictions with the correct values
    assert len(payload['predictions']) == 2
    assert payload['predictions'][0]['result'][0]['value']['choices'][0] == 'label_A'
    assert payload['predictions'][0]['model_version'] == 'ModelA'
    assert payload['predictions'][1]['result'][0]['value']['choices'][0] == 'label_B'
    assert payload['predictions'][1]['model_version'] == 'ModelB'
