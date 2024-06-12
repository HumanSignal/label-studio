import json

import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk.client import LabelStudio
from label_studio_sdk.data_manager import Column, Filters, Operator, Type


def test_predictions_CRUD(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    task = ls.tasks.create(project=p.id, data={'my_text': 'Test task'})

    # create a prediction
    prediction = ls.predictions.create(
        task=task.id,
        result=[{'from_name': 'label', 'to_name': 'my_text', 'type': 'choices', 'value': {'choices': ['Positive']}}],
        score=0.9,
        model_version='1.0.0',
    )

    # get a prediction
    prediction = ls.predictions.get(id=prediction.id)
    assert prediction.result[0]['value']['choices'] == ['Positive']
    assert prediction.score == 0.9
    assert prediction.model_version == '1.0.0'

    # create another prediction
    another_prediction = ls.predictions.create(
        task=task.id,
        result=[{'from_name': 'label', 'to_name': 'my_text', 'type': 'choices', 'value': {'choices': ['Neutral']}},
                {'from_name': 'label', 'to_name': 'my_text', 'type': 'choices', 'value': {'choices': ['Negative']}}],
        score=0.8,
        model_version='1.0.1',
    )

    # check that there are two predictions
    predictions = ls.predictions.list(task=task.id)
    assert len(predictions) == 2

    # delete one prediction
    ls.predictions.delete(id=prediction.id)
    predictions = ls.predictions.list(task=task.id)
    assert len(predictions) == 1
    assert predictions[0].id == another_prediction.id


def test_create_predictions_with_import(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    # import tasks with predictions
    ls.projects.import_tasks(
        id=p.id,
        request=[
            {"my_text": "Hello world", "my_label": "Positive"},
            {"my_text": "Goodbye Label Studio", "my_label": "Negative"},
            {"my_text": "What a beautiful day", "my_label": "Positive"},
        ],
        preannotated_from_fields=['my_label']
    )

    # check predictions for each class
    task_ids = []
    for task in ls.tasks.list(project=p.id):
        assert len(ls.predictions.list(task=task.id)) == 1
        task_ids.append(task.id)
    assert len(task_ids) == 3

    # import more tasks in extended format
    ls.projects.import_tasks(
        id=p.id,
        request=[
            {
                'data': {'my_text': 'Hello world'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'label',
                                'to_name': 'my_text',
                                'type': 'choices',
                                'value': {'choices': ['Positive']},
                            }
                        ],
                        'score': 0.95,
                        'model_version': '3.4.5',
                    }
                ],
            },
            {
                'data': {'my_text': 'Goodbye Label Studio'},
                'predictions': [
                    {
                        'result': [
                            {
                                'from_name': 'label',
                                'to_name': 'my_text',
                                'type': 'choices',
                                'value': {'choices': ['Negative']},
                            }
                        ],
                        'score': 0.85,
                        'model_version': '3.4.5',
                    }
                ],
            },
        ]
    )

    # check for new predictions
    for task in ls.tasks.list(project=p.id):
        predictions = ls.predictions.list(task=task.id)
        assert len(predictions) == 1
        if task.id not in task_ids:
            assert predictions[0].model_version == '3.4.5'
            task_ids.append(task.id)

    assert len(task_ids) == 5
