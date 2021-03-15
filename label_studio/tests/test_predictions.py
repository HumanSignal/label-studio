"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import requests_mock
import json

from projects.models import Project
from ml.models import MLBackend
from tasks.models import Task, Prediction, Annotation
from tests.utils import make_project
from core.redis import redis_healthcheck

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

_2_prediction_results_for_textA_textB = [{
    'result': [{'from_name': 'text_class', 'to_name': 'text', 'type': 'labels', 'value': {'labels': ['class_A'], 'start': 0, 'end': 1}}],
    'score': 0.95
}, {
    'result': [{'from_name': 'text_class', 'to_name': 'text', 'type': 'labels', 'value': {'labels': ['class_B'], 'start': 0, 'end': 1}}],
    'score': 0.59
}]


def run_task_predictions(client, project, mocker):

    class TestJob:
        def __init__(self, job_id):
            self.id = job_id

    m = MLBackend.objects.filter(project=project.id).filter(url='http://localhost:8999').first()
    return client.post(f'/api/ml/{m.id}/predict')


@pytest.mark.skipif(not redis_healthcheck(), reason='Starting predictions requires Redis server enabled')
@pytest.mark.parametrize(
    'project_config, tasks, annotations, prediction_results, log_messages, model_version_in_request, use_ground_truth',
    [(
        # project config
        _project_for_text_choices_onto_A_B_classes,
        # tasks
        _2_tasks_with_textA_and_textB,
        # annotations
        [
            dict(
                result=[{'from_name': 'text_class', 'to_name': 'text', 'type': 'labels', 'value': {'labels': ['class_A'], 'start': 0, 'end': 1}}],
                ground_truth=True
            ),
            dict(
                result=[{'from_name': 'text_class', 'to_name': 'text', 'type': 'labels', 'value': {'labels': ['class_B'], 'start': 0, 'end': 1}}],
                ground_truth=True
            ),
        ],
        # prediction results
        _2_prediction_results_for_textA_textB,
        # log messages
        None,
        # model version in request
        '12345',
        False
    ), (
        # project config
        _project_for_text_choices_onto_A_B_classes,
        # tasks
        _2_tasks_with_textA_and_textB,
        # annotations
        [
            dict(
                result=[{'from_name': 'text_class', 'to_name': 'text', 'type': 'labels', 'value': {'labels': ['class_A'], 'start': 0, 'end': 1}}],
                ground_truth=True
            ),
            dict(
                result=[{'from_name': 'text_class', 'to_name': 'text', 'type': 'labels', 'value': {'labels': ['class_B'], 'start': 0, 'end': 1}}],
                ground_truth=True
            ),
        ],
        # prediction results
        _2_prediction_results_for_textA_textB,
        # log messages
        None,
        # model version in request
        '12345',
        True
    )])
@pytest.mark.django_db
def test_predictions(
    business_client, project_config, tasks, annotations, prediction_results, log_messages, model_version_in_request,
    use_ground_truth, mocker
):

    # create project with predefined task set
    project = make_project(project_config, business_client.user)

    for task, annotation in zip(tasks, annotations):
        t = Task.objects.create(data=task, project=project)
        if use_ground_truth:
            Annotation.objects.create(task=t, **annotation)

    # run prediction
    with requests_mock.Mocker() as m:
        m.post(
            'http://localhost:8999/setup',
            text=json.dumps({'model_version': model_version_in_request})
        )
        m.post(
            'http://localhost:8999/predict',
            text=json.dumps({
                'results': prediction_results[:1],
                'model_version': model_version_in_request
            })
        )
        r = run_task_predictions(business_client, project, mocker)
        assert r.status_code == 200
        assert m.called

    # check whether stats are created
    predictions = Prediction.objects.all()
    project = Project.objects.get(id=project.id)
    ml_backend = MLBackend.objects.get(url='http://localhost:8999')

    assert predictions.count() == len(tasks)

    for actual_prediction, expected_prediction_result in zip(predictions, prediction_results):
        assert actual_prediction.result == prediction_results[0]['result']
        assert actual_prediction.score == prediction_results[0]['score']
        assert ml_backend.model_version == actual_prediction.model_version


@pytest.mark.skipif(not redis_healthcheck(), reason='Starting predictions requires Redis server enabled')
@pytest.mark.parametrize('test_name, project_config, setup_returns_model_version, tasks, annotations, '
                         'input_predictions, prediction_call_count, num_project_stats, num_ground_truth_in_stats, '
                         'num_ground_truth_fit_predictions', [
    (
        # test name just for reference
        'All predictions are outdated, project.model_version is outdated too',
        # project config: contains old model version
        dict(
            title='Test',
            model_version='12345_old',
            label_config='''
                <View>
                  <Text name="txt" value="$text"></Text>
                  <Choices name="cls" toName="txt" choice="single">
                    <Choice value="class_A"></Choice>
                    <Choice value="class_B"></Choice>
                  </Choices>
                </View>'''
        ),

        # setup API returns this model version
        '12345',

        # task data
        [
            {'text': 'text A'},
            {'text': 'text B'}
        ],

        # annotations: there is no any annotations
        [None, None],

        # predictions: 2 predictions are from old model version
        [{
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}], 'score': 0.95,
            'model_version': '12345_old'
        }, {
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_B']}}], 'score': 0.59,
            'model_version': '12345_old'
        }],

        # prediction call count is 2 for both tasks with old predictions
        2,

        # ground_truth stats
        0, 0, 0
    ),

    (
        # test name just for reference
        'All predictions are up-to-date',
        # project config: contains actual model version
        dict(
            title='Test',
            model_version='12345_old',
            label_config='''
        <View>
          <Text name="txt" value="$text"></Text>
          <Choices name="cls" toName="txt" choice="single">
            <Choice value="class_A"></Choice>
            <Choice value="class_B"></Choice>
          </Choices>
        </View>'''
        ),

        # setup API returns this model version
        '12345',

        # task data
        [
            {'text': 'text A'},
            {'text': 'text B'}
        ],

        # annotations: there is no any annotations
        [None, None],

        # predictions: 2 predictions are from old model version
        [{
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}], 'score': 0.95,
            'model_version': '12345'
        }, {
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_B']}}], 'score': 0.59,
            'model_version': '12345'
        }],

        # prediction call count is 0 since predictions are up to date
        0,
        # ground_truth stats
        0, 0, 0
    ),
    (
        # test name just for reference
        'Some predictions are outdated, other are up-to-date. project.model_version is up-to-date',
        # project config: contains actual model version
        dict(
            title='Test',
            model_version='12345',
            label_config='''
        <View>
          <Text name="txt" value="$text"></Text>
          <Choices name="cls" toName="txt" choice="single">
            <Choice value="class_A"></Choice>
            <Choice value="class_B"></Choice>
          </Choices>
        </View>'''
        ),

        # setup API returns this model version
        '12345',

        # task data
        [
            {'text': 'text A'},
            {'text': 'text B'}
        ],

        # annotations: there is no any annotations
        [None, None],

        # predictions: 2 predictions, one from the new model version, second from old
        [{
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}], 'score': 0.95,
            'model_version': '12345'
        }, {
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_B']}}], 'score': 0.59,
            'model_version': '12345_old'
        }],

        # prediction call count is 1 only for the task with old predictions
        1,
        # ground_truth stats
        0, 0, 0
    ),

    (
        # test name just for reference
        'Some predictions are outdated, other are up-to-date. project.model_version is outdated',
        # project config: contains actual model version
        dict(
            title='Test',
            model_version='12345_old',
            label_config='''
<View>
  <Text name="txt" value="$text"></Text>
  <Choices name="cls" toName="txt" choice="single">
    <Choice value="class_A"></Choice>
    <Choice value="class_B"></Choice>
  </Choices>
</View>'''
        ),

        # setup API returns this model version
        '12345',

        # task data
        [
            {'text': 'text A'},
            {'text': 'text B'}
        ],

        # annotations: there is no any annotations
        [None, None],

        # predictions: 2 predictions, one from the new model version, second from old
        [{
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}], 'score': 0.95,
            'model_version': '12345'
        }, {
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_B']}}], 'score': 0.59,
            'model_version': '12345_old'
        }],

        # prediction call count is 1 only for the task with old predictions
        1,
        # ground_truth stats
        0, 0, 0
    ),

    (
        # test name just for reference
        'All tasks has no predictions',
        # project config: contains actual model version
        dict(
            title='Test',
            model_version='12345',
            label_config='''
<View>
  <Text name="txt" value="$text"></Text>
  <Choices name="cls" toName="txt" choice="single">
    <Choice value="class_A"></Choice>
    <Choice value="class_B"></Choice>
  </Choices>
</View>'''
        ),

        # setup API returns this model version
        '12345',

        # task data
        [
            {'text': 'text A'},
            {'text': 'text B'}
        ],

        # annotations: there is no any annotations
        [None, None],

        # there is no any predictions yet
        [None, None],

        # prediction call count for all tasks without predictions
        2,
        # ground_truth stats
        0, 0, 0
    ),
    (
        # test name just for reference
        'Some tasks has no predictions, others are up-to-date',
        # project config: contains actual model version
        dict(
            title='Test',
            model_version='12345',
            label_config='''
                <View>
                <Text name="txt" value="$text"></Text>
                <Choices name="cls" toName="txt" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
                </Choices>
                </View>'''
        ),

        # setup API returns this model version
        '12345',

        # task data
        [
            {'text': 'text A'},
            {'text': 'text B'}
        ],

        # annotations: there is no any annotations
        [None, None],

        # there is only one prediction (since job has finished before processing all tasks)
        [{
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}], 'score': 0.95,
            'model_version': '12345'
        }, None],

        # prediction call count for all tasks without predictions
        1,
        # ground_truth stats
        0, 0, 0
    ),

    (
        # test name just for reference
        'Some tasks has no predictions, others are up-to-date, labeled task contains ground_truth',
        # project config: contains actual model version
        dict(
            title='Test',
            model_version='12345',
            label_config='''
        <View>
        <Text name="txt" value="$text"></Text>
        <Choices name="cls" toName="txt" choice="single">
        <Choice value="class_A"></Choice>
        <Choice value="class_B"></Choice>
        </Choices>
        </View>'''
        ),

        # setup API returns this model version
        '12345',

        # task data
        [
            {'text': 'text A'},
            {'text': 'text B'}
        ],

        # annotations: first task has fitted ground_truth
        [None, {
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}],
            'ground_truth': True
        }],

        # there is only one prediction (since job has finished before processing all tasks)
        [{
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}], 'score': 0.95,
            'model_version': '12345'
        }, None],

        # prediction call count for all tasks without predictions
        1,
        # ground_truth stats
        1, 1, 1
    ),

    (
        # test name just for reference
        'Some tasks has no predictions, others are outdated',
        # project config: contains actual model version
        dict(
            title='Test',
            model_version='12345',
            label_config='''
        <View>
        <Text name="txt" value="$text"></Text>
        <Choices name="cls" toName="txt" choice="single">
        <Choice value="class_A"></Choice>
        <Choice value="class_B"></Choice>
        </Choices>
        </View>'''
        ),

        # setup API returns this model version
        '12345',

        # task data
        [
            {'text': 'text A'},
            {'text': 'text B'}
        ],

        # annotations: there is no any annotations
        [None, None],

        # there is only one prediction (since job has finished before processing all tasks)
        [{
            'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}], 'score': 0.95,
            'model_version': '12345_old'
        }, None],

        # prediction call count for all tasks without up-to-date predictions
        2,
        # ground_truth stats
        0, 0, 0
    ),

    (
            # test name just for reference
            'Some tasks has no predictions, others are outdated, project.model_version is outdated',
            # project config: contains actual model version
            dict(
                title='Test',
                model_version='12345_old',
                label_config='''
    <View>
    <Text name="txt" value="$text"></Text>
    <Choices name="cls" toName="txt" choice="single">
    <Choice value="class_A"></Choice>
    <Choice value="class_B"></Choice>
    </Choices>
    </View>'''
            ),

            # setup API returns this model version
            '12345',

            # task data
            [
                {'text': 'text A'},
                {'text': 'text B'}
            ],

            # annotations: there is no any annotations
            [None, None],

            # there is only one prediction (since job has finished before processing all tasks)
            [{
                'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}], 'score': 0.95,
                'model_version': '12345_old'
            }, None],

            # prediction call count for all tasks without up-to-date predictions
            2,
            # ground_truth stats
            0, 0, 0
    ),

    (
            # test name just for reference
            'Some tasks has no predictions, others are outdated, others are up-to-date',
            # project config: contains actual model version
            dict(
                title='Test',
                model_version='12345_old',
                label_config='''
<View>
<Text name="txt" value="$text"></Text>
<Choices name="cls" toName="txt" choice="single">
<Choice value="class_A"></Choice>
<Choice value="class_B"></Choice>
</Choices>
</View>'''
            ),

            # setup API returns this model version
            '12345',

            # task data
            [
                {'text': 'text A'},
                {'text': 'text A'},
                {'text': 'text B'}
            ],

            # annotations: there is no any annotations
            [None, None, None],

            # there is only one prediction (since job has finished before processing all tasks)
            [{
                'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}], 'score': 0.95,
                'model_version': '12345_old'
            },
            {
                'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}],
                'score': 0.95,
                'model_version': '12345'
            },
            None],

            # prediction call count for all tasks without up-to-date predictions
            2,
            # ground_truth stats
            0, 0, 0
    ),
])
@pytest.mark.django_db
def test_predictions_with_partially_predicted_tasks(
        business_client, test_name, setup_returns_model_version, project_config, tasks, annotations, input_predictions,
        prediction_call_count, num_project_stats, num_ground_truth_in_stats, num_ground_truth_fit_predictions, mocker
):
    project = make_project(project_config, business_client.user)
    ml_backend = MLBackend.objects.get(url='http://localhost:8999')
    ml_backend.model_version = project_config['model_version']
    ml_backend.save()
    for task, annotation, prediction in zip(tasks, annotations, input_predictions):
        task_obj = Task.objects.create(project=project, data=task)
        if annotation is not None:
            Annotation.objects.create(task=task_obj, **annotation)
        if prediction is not None:
            Prediction.objects.create(task=task_obj, **prediction)

    # run prediction
    with requests_mock.Mocker() as m:
        m.register_uri('POST', 'http://localhost:8999/setup', text=json.dumps({'model_version': setup_returns_model_version}))  # noqa
        m.register_uri('POST', 'http://localhost:8999/predict', text=json.dumps({
            'results': [{
                'result': [{'from_name': 'cls', 'to_name': 'txt', 'type': 'choices', 'value': {'choices': ['class_A']}}],
                'score': 1
            }],
            'model_version': setup_returns_model_version
        }))

        r = run_task_predictions(business_client, project, mocker)
        assert r.status_code == 200
        assert len(list(filter(lambda h: h.url.endswith('predict'), m.request_history))) == prediction_call_count

        assert Prediction.objects.filter(task__project=project.id, model_version=setup_returns_model_version).count() == len(tasks)
        assert MLBackend.objects.get(url='http://localhost:8999').model_version == setup_returns_model_version
