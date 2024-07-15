import pytest
from label_studio_sdk.client import LabelStudio
from label_studio_sdk.label_interface import LabelInterface


@pytest.mark.django_db
def test_batch_predictions_single_prediction_per_task(django_live_url, business_client, ml_backend_for_test_predict):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    label_config = LabelInterface.create(
        {
            'text': ('Text', {'name': 'text', 'value': '$text'}, ()),
            'label': (
                'Choices',
                {'name': 'label', 'toName': 'text', 'choice': 'single'},
                (
                    ('Choice', {'value': 'label_A'}, ()),
                    ('Choice', {'value': 'label_B'}, ()),
                ),
            ),
        }
    )
    p = ls.projects.create(
        title='New Project',
        label_config=label_config,
    )
    ls.projects.import_tasks(
        p.id,
        request=[
            {'data': {'text': 'test 1'}},
            {'data': {'text': 'test 2'}},
            {'data': {'text': 'test 3'}},
        ],
    )

    tasks = [task for task in ls.tasks.list(project=p.id)]
    assert len(tasks) == 3

    # setup ML backend with single prediction per task
    ls.ml.create(url='http://test.ml.backend.for.sdk.com:9092', project=p.id, title='ModelSingle')

    # batch predict tasks via actions
    ls.actions.create(
        id='retrieve_tasks_predictions',
        project=p.id,
        selected_items={'all': True, 'excluded': [tasks[1].id]},
    )

    # get all predictions in project
    predictions = ls.predictions.list(project=p.id)

    # check that only 2 predictions were created
    assert len(predictions) == 2

    # check that the first prediction has the correct value
    assert predictions[0].result[0]['value']['choices'][0] == 'Single'
    assert predictions[0].model_version == 'ModelSingle'

    # check that the second prediction has the correct value
    assert predictions[1].result[0]['value']['choices'][0] == 'Single'
    assert predictions[1].model_version == 'ModelSingle'

    # additionally let's test actions: convert predictions to annotations
    ls.actions.create(
        id='predictions_to_annotations',
        project=p.id,
        selected_items={
            'all': False,
            'included': [
                predictions[0].task,
                predictions[1].task,
                # also emulate user error when trying to convert task with no predictions
                tasks[1].id,
            ],
        },
    )

    # get all annotations in project
    for task in ls.tasks.list(project=p.id, fields='all'):
        if task.id == tasks[1].id:
            assert not task.annotations
            assert not task.predictions
        else:
            assert len(task.annotations) == 1
            assert task.annotations[0]['result'][0]['value']['choices'][0] == 'Single'

            assert len(task.predictions) == 1
            assert task.predictions[0]['result'][0]['value']['choices'][0] == 'Single'
            assert task.predictions[0]['model_version'] == 'ModelSingle'
            assert task.predictions[0]['score'] == 0.1


@pytest.mark.django_db
def test_batch_predictions_multiple_predictions_per_task(
    django_live_url, business_client, ml_backend_for_test_predict
):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    li = LabelInterface(
        """
            <View>
              <Text name="text" value="$text"/>
              <Choices name="label" toName="text" choice="single">
                <Choice value="label_A"></Choice>
                <Choice value="label_B"></Choice>
              </Choices>
            </View>"""
    )
    p = ls.projects.create(
        title='New Project',
        label_config=li._config,
    )
    ls.projects.import_tasks(
        p.id,
        request=[
            {'data': {'text': 'test 1'}},
            {'data': {'text': 'test 2'}},
            {'data': {'text': 'test 3'}},
        ],
    )

    tasks = [task for task in ls.tasks.list(project=p.id)]
    assert len(tasks) == 3

    # setup ML backend with multiple predictions per task
    ls.ml.create(url='http://test.ml.backend.for.sdk.com:9093', project=p.id, title='ModelMultiple')

    # batch predict tasks via actions
    ls.actions.create(
        id='retrieve_tasks_predictions',
        project=p.id,
        selected_items={'all': False, 'included': [tasks[0].id, tasks[2].id]},
    )

    # get all predictions in project
    predictions = ls.predictions.list(project=p.id)

    # check that there are 4 predictions as 2 tasks were predicted
    assert len(predictions) == 4

    for task in ls.tasks.list(project=p.id, fields='all'):
        if task.id == tasks[1].id:
            assert not task.predictions
        else:
            assert len(task.predictions) == 2

            for i, prediction in enumerate(task.predictions):
                assert prediction['result'][0]['value']['choices'][0] == f'label_{["A", "B"][i]}'
                assert prediction['model_version'] == f'Model{"AB"[i]}'
                assert prediction['score'] == 0.2 if i == 0 else 0.3
