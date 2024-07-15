import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk.client import LabelStudio
from label_studio_sdk.label_interface import LabelInterface
from label_studio_sdk.label_interface.objects import PredictionValue, TaskValue


def test_predictions_CRUD(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    li = LabelInterface(LABEL_CONFIG_AND_TASKS['label_config'])
    p = ls.projects.create(title='New Project', label_config=li.config)

    task = ls.tasks.create(project=p.id, data={'my_text': 'Test task'})

    # create a prediction
    pv = PredictionValue(
        result=[li.get_control('sentiment_class').label(['Positive'])],
        score=0.9,
        model_version='1.0.0',
    )
    prediction = ls.predictions.create(
        task=task.id,
        **pv.model_dump(),
    )

    # get a prediction
    prediction = ls.predictions.get(id=prediction.id)
    assert prediction.result[0]['value']['choices'] == ['Positive']
    assert prediction.score == 0.9
    assert prediction.model_version == '1.0.0'

    # create another prediction
    pv = PredictionValue(
        result=[
            li.get_control('sentiment_class').label(['Neutral']),
            li.get_control('sentiment_class').label(['Negative']),
        ],
        score=0.8,
        model_version='1.0.1',
    )

    another_prediction = ls.predictions.create(task=task.id, **pv.model_dump())

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
    li = LabelInterface(LABEL_CONFIG_AND_TASKS['label_config'])
    p = ls.projects.create(title='New Project', label_config=li.config)

    # import tasks with predictions
    ls.projects.import_tasks(
        id=p.id,
        request=[
            {'my_text': 'Hello world', 'my_label': 'Positive'},
            {'my_text': 'Goodbye Label Studio', 'my_label': 'Negative'},
            {'my_text': 'What a beautiful day', 'my_label': 'Positive'},
        ],
        preannotated_from_fields=['my_label'],
    )

    # check predictions for each class
    task_ids = []
    for task in ls.tasks.list(project=p.id):
        assert len(ls.predictions.list(task=task.id)) == 1
        task_ids.append(task.id)
    assert len(task_ids) == 3

    # import more tasks in extended format
    task1 = TaskValue(
        data={'my_text': 'Hello world'},
        predictions=[
            PredictionValue(
                result=[li.get_control('sentiment_class').label(['Positive'])],
                score=0.95,
                model_version='3.4.5',
            )
        ],
    )
    task2 = TaskValue(
        data={'my_text': 'Goodbye Label Studio'},
        predictions=[
            PredictionValue(
                result=[li.get_control('sentiment_class').label(['Negative'])],
                score=0.85,
                model_version='3.4.5',
            )
        ],
    )

    ls.projects.import_tasks(
        id=p.id,
        request=[task1.model_dump(), task2.model_dump()],
    )

    # check for new predictions
    for task in ls.tasks.list(project=p.id):
        predictions = ls.predictions.list(task=task.id)
        assert len(predictions) == 1
        if task.id not in task_ids:
            assert predictions[0].model_version == '3.4.5'
            task_ids.append(task.id)

    assert len(task_ids) == 5
