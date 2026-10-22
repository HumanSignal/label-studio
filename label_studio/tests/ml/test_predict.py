import json
from types import SimpleNamespace

import pytest
from ml.api_connector import MLApiResult
from ml.models import MLBackend

from label_studio.tests.utils import make_project, make_task


@pytest.mark.django_db
def test_get_single_prediction_on_task(business_client, ml_backend_for_test_predict, mock_gethostbyname):
    project = make_project(
        config=dict(
            is_published=True,
            label_config="""
                <View>
                  <Text name="text" value="$text"></Text>
                  <Choices name="label" choice="single" toName="text">
                    <Choice value="label_A"></Choice>
                    <Choice value="label_B"></Choice>
                  </Choices>
                </View>""",
            title='test_get_single_prediction_on_task',
        ),
        user=business_client.user,
        use_ml_backend=False,
    )

    make_task({'data': {'text': 'test 1'}}, project)

    # setup ML backend with single prediction per task
    response = business_client.post(
        '/api/ml/',
        data={
            'project': project.id,
            'title': 'ModelSingle',
            'url': 'http://test.ml.backend.for.sdk.com:9092',
        },
    )
    assert response.status_code == 201

    # get next task
    response = business_client.get(f'/api/projects/{project.id}/next')
    payload = json.loads(response.content)

    # ensure task has a single prediction with the correct value
    assert len(payload['predictions']) == 1
    assert payload['predictions'][0]['result'][0]['value']['choices'][0] == 'label_A'
    assert payload['predictions'][0]['model_version'] == 'ModelSingle'


@pytest.mark.django_db
def test_get_multiple_predictions_on_task(business_client, ml_backend_for_test_predict, mock_gethostbyname):
    project = make_project(
        config=dict(
            is_published=True,
            label_config="""
                <View>
                  <Text name="text" value="$text"></Text>
                  <Choices name="label" choice="single" toName="text">
                    <Choice value="label_A"></Choice>
                    <Choice value="label_B"></Choice>
                  </Choices>
                </View>""",
            title='test_get_multiple_predictions_on_task',
        ),
        user=business_client.user,
        use_ml_backend=False,
    )

    make_task({'data': {'text': 'test 1'}}, project)

    # setup ML backend with multiple predictions per task
    response = business_client.post(
        '/api/ml/',
        data={
            'project': project.id,
            'title': 'ModelA',
            'url': 'http://test.ml.backend.for.sdk.com:9093',
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


@pytest.mark.parametrize(
    'invalid_response',
    [None, 42, 'invalid', [None], [42], ['invalid'], ['result'], [{'score': 0.5}]],
)
def test_invalid_ml_prediction_does_not_discard_other_tasks(invalid_response, caplog):
    tasks = [{'id': 1, 'project': 10}, {'id': 2, 'project': 10}]
    valid_response = {'result': [{'value': {'choices': ['label_A']}}], 'score': 0.9}
    api_result = MLApiResult(response={'results': [invalid_response, valid_response]})
    backend = SimpleNamespace(
        api=SimpleNamespace(make_predictions=lambda tasks, project: api_result),
        project=object(),
        model_version='test-version',
    )

    predictions = MLBackend._get_predictions_from_ml_backend(backend, tasks)

    assert predictions == [
        {
            'task': 2,
            'result': valid_response['result'],
            'score': 0.9,
            'model_version': 'test-version',
            'project': 10,
        }
    ]
    assert 'incorrect prediction' in caplog.text
