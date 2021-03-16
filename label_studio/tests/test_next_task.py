"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json
import threading
import time

from unittest import mock
from functools import partial

from django.apps import apps
from django.db.models import Q
from projects.models import Project
from tasks.models import Task, Annotation, Prediction
from .utils import (
    ml_backend_mock, make_project, make_task, make_annotator,
    invite_client_to_project, make_annotation, _client_is_annotator
)
from core.redis import redis_healthcheck

_project_for_text_choices_onto_A_B_classes = dict(
    title='Test',
    is_published=True,
    sampling=Project.UNCERTAINTY,
    label_config='''
        <View>
          <Text name="meta_info" value="$meta_info"></Text>
          <Text name="text" value=" $text "></Text>
          <Choices name="text_class" choice="single">
            <Choice value="class_A"></Choice>
            <Choice value="class_B"></Choice>
          </Choices>
        </View>'''
)


@pytest.mark.parametrize(
    'project_config, tasks, status_code, expected_response_value_set',
    [
        (
        _project_for_text_choices_onto_A_B_classes,
        [
            {'data': {'meta_info': 'meta info A', 'text': 'text A'}},
            {'data': {'meta_info': 'meta info B', 'text': 'text B'}}
        ],
        200, {'id': 'uncompleted_task_ids'}
    ),
        (
        _project_for_text_choices_onto_A_B_classes,
        [
            {'data': {'meta_info': 'meta info A', 'text': 'text A'}, 'annotations': [{'result': [{'r': 1}], 'ground_truth': False}]},
            {'data': {'meta_info': 'meta info B', 'text': 'text B'}}
        ],
        200, {'id': 'uncompleted_task_ids'}
    ),
        (
        _project_for_text_choices_onto_A_B_classes,
        [
            {'data': {'meta_info': 'meta info A', 'text': 'text A'}, 'annotations': [{'result': [{'r': 1}], 'ground_truth': False}]},
            {'data': {'meta_info': 'meta info B', 'text': 'text B'}, 'annotations': [{'result': [{'r': 2}], 'ground_truth': False}]},
        ],
        404, {'detail': {'Not found.'}}
    ),
    # ground truth task still should be sampled regardless of who is a creator
    (
        _project_for_text_choices_onto_A_B_classes,
        [
            {'data': {'meta_info': 'meta info A', 'text': 'text A'},
             'annotations': [{'result': [{'r': 1}], 'ground_truth': True}]},
            {'data': {'meta_info': 'meta info B', 'text': 'text B'},
             'annotations': [{'result': [{'r': 2}], 'ground_truth': False}]},
        ],
        200, {'id': 'uncompleted_task_ids'}
    ),
        (
        dict(
            title='Test',
            is_published=True,
            sampling=Project.UNCERTAINTY,
            label_config='''
                <View>
                  <Text name="location" value="$location"></Text>
                  <Choices name="text_class" choice="single">
                    <Choice value="class_A"></Choice>
                    <Choice value="class_B"></Choice>
                  </Choices>
                </View>'''
        ),
        [
            {'data': {'location': 'London', 'text': 'text A'}},
            {'data': {'location': 'London', 'text': 'text B'}}
        ],
        200, {'id': 'uncompleted_task_ids'}
    )
])
@pytest.mark.django_db
def test_next_task(
        business_client, any_client, project_config, tasks, status_code, expected_response_value_set
):
    project = make_project(project_config, business_client.user)
    if _client_is_annotator(any_client):
        invite_client_to_project(any_client, project)

    # upload tasks with annotations
    r = business_client.post(
        f'/api/projects/{project.id}/tasks/bulk', data=json.dumps(tasks), content_type='application/json')
    assert r.status_code == 201

    # make sure any annotation was made by current client
    Annotation.objects.all().update(completed_by=any_client.annotator)

    # collect uncompleted task ids to verify that only them are seen in the next labeling steps
    uncompleted_task_ids = set()
    for t in Task.objects.all():
        if not t.annotations.filter(ground_truth=False).exists():
            uncompleted_task_ids.add(t.id)

    r = any_client.get(f'/api/projects/{project.id}/next')
    assert r.status_code == status_code
    rdata = json.loads(r.content)
    if r.status_code == 404:
        assert rdata['detail'].startswith('There are no tasks remaining to be annotated')
    else:
        for response_key, expected_value_set in expected_response_value_set.items():
            if expected_value_set == 'uncompleted_task_ids':
                expected_value_set = uncompleted_task_ids
            assert rdata[response_key] in expected_value_set, \
                f'Failed on response {rdata}: expecting value set "{expected_value_set}" for key "{response_key}"'


@pytest.mark.parametrize('project_config, tasks, predictions, annotations, num_annotators, status_code, prelabeling_result', [
    # no annotations, second task is chosen due to active learning
    (
        dict(
            title='Test',
            is_published=True,
            sampling=Project.UNCERTAINTY,
            model_version='12345',
            label_config='''
    <View>
      <Text name="location" value="$location"></Text>
      <Choices name="text_class" choice="single">
        <Choice value="class_A"></Choice>
        <Choice value="class_B"></Choice>
      </Choices>
    </View>'''
        ),
        [
            {'data': {'location': 'London', 'text': 'text A'}},
            {'data': {'location': 'London', 'text': 'text B'}}
        ],
        [
            {'result': [{'some': 'prediction A'}], 'score': 0.9, 'cluster': 0},
            {'result': [{'some': 'prediction B'}], 'score': 0.5, 'cluster': 0},
        ],
        [
            None,
            None,
        ],
        1,
        200, [{'some': 'prediction B'}]
    ),

    # no annotations, first task is chosen due to active learning
    (
            dict(
                title='Test',
                is_published=True,
                sampling=Project.UNCERTAINTY,
                model_version='12345',
                label_config='''
<View>
  <Text name="location" value="$location"></Text>
  <Choices name="text_class" choice="single">
    <Choice value="class_A"></Choice>
    <Choice value="class_B"></Choice>
  </Choices>
</View>'''
            ),
            [
                {'data': {'location': 'London', 'text': 'text A'}},
                {'data': {'location': 'London', 'text': 'text B'}}
            ],
            [
                {'result': [{'some': 'prediction A'}], 'score': 0.5, 'cluster': 0},
                {'result': [{'some': 'prediction B'}], 'score': 0.9, 'cluster': 0},
            ],
            [
                None,
                None,
            ],
            1,
            200, [{'some': 'prediction A'}]
    ),

    # first task annotation, third task is chosen due to active learning
    (
            dict(
                title='Test',
                is_published=True,
                sampling=Project.UNCERTAINTY,
                maximum_annotations=1,
                model_version='12345',
                label_config='''
<View>
  <Text name="location" value="$location"></Text>
  <Choices name="text_class" choice="single">
    <Choice value="class_A"></Choice>
    <Choice value="class_B"></Choice>
  </Choices>
</View>'''
            ),
            [
                {'data': {'location': 'London', 'text': 'text A'}},
                {'data': {'location': 'London', 'text': 'text B'}},
                {'data': {'location': 'London', 'text': 'text C'}},
            ],
            [
                {'result': [{'some': 'prediction A'}], 'score': 0.5, 'cluster': 0},
                {'result': [{'some': 'prediction B'}], 'score': 0.9, 'cluster': 1},
                {'result': [{'some': 'prediction C'}], 'score': 0.8, 'cluster': 1},
            ],
            [
                {'result': [{'some': 'prediction A'}]},
                None,
                None,
            ],
            1,
            200, [{'some': 'prediction C'}]
    ),

    # first task annotation, forth task is chosen due to active learning (though task with lowest score exists but in the same cluster)  # noqa
    (
            dict(
                title='Test',
                is_published=True,
                sampling=Project.UNCERTAINTY,
                model_version='12345',
                label_config='''
<View>
  <Text name="location" value="$location"></Text>
  <Choices name="text_class" choice="single">
    <Choice value="class_A"></Choice>
    <Choice value="class_B"></Choice>
  </Choices>
</View>'''
            ),
            [
                {'data': {'location': 'London', 'text': 'text A'}},
                {'data': {'location': 'London', 'text': 'text A 2'}},
                {'data': {'location': 'London', 'text': 'text B'}},
                {'data': {'location': 'London', 'text': 'text C'}},
            ],
            [
                {'result': [{'some': 'prediction A'}], 'score': 0.5, 'cluster': 0},
                {'result': [{'some': 'prediction A'}], 'score': 0.1, 'cluster': 0},
                {'result': [{'some': 'prediction B'}], 'score': 0.9, 'cluster': 1},
                {'result': [{'some': 'prediction C'}], 'score': 0.8, 'cluster': 1},
            ],
            [
                {'result': [{'some': 'prediction A'}]},
                None,
                None,
                None,
            ],
            1,
            200, [{'some': 'prediction C'}]
    ),

    # lowest prediction is chosen from least solved cluster
    (
            dict(
                title='Test',
                is_published=True,
                sampling=Project.UNCERTAINTY,
                model_version='12345',
                label_config='''
<View>
  <Text name="location" value="$location"></Text>
  <Choices name="text_class" choice="single">
    <Choice value="class_A"></Choice>
    <Choice value="class_B"></Choice>
  </Choices>
</View>'''
            ),
            [
                {'data': {'location': 'London', 'text': 'text A'}},
                {'data': {'location': 'London', 'text': 'text A 2'}},
                {'data': {'location': 'London', 'text': 'text A 3'}},
                {'data': {'location': 'London', 'text': 'text B'}},
                {'data': {'location': 'London', 'text': 'text C'}},
                {'data': {'location': 'London', 'text': 'text C 2'}},
            ],
            [
                {'result': [{'some': 'prediction A'}], 'score': 0.5, 'cluster': 0},
                {'result': [{'some': 'prediction A'}], 'score': 0.2, 'cluster': 0},
                {'result': [{'some': 'prediction A1'}], 'score': 0.1, 'cluster': 0},
                {'result': [{'some': 'prediction B'}], 'score': 0.9, 'cluster': 1},
                {'result': [{'some': 'prediction C'}], 'score': 0.8, 'cluster': 1},
                {'result': [{'some': 'prediction C'}], 'score': 0.8, 'cluster': 1},
            ],
            [
                {'result': [{'some': 'prediction A'}]},
                None,
                None,
                None,
                {'result': [{'some': 'prediction C'}]},
                {'result': [{'some': 'prediction C'}]},
            ],
            1,
            200, [{'some': 'prediction A1'}]
    ),

    # first task annotation, labeling is continued with the same cluster
    (
            dict(
                title='Test',
                is_published=True,
                sampling=Project.UNCERTAINTY,
                model_version='12345',
                label_config='''
    <View>
      <Text name="location" value="$location"></Text>
      <Choices name="text_class" choice="single">
        <Choice value="class_A"></Choice>
        <Choice value="class_B"></Choice>
      </Choices>
    </View>'''
            ),
            [
                {'data': {'location': 'London', 'text': 'text A'}},
                {'data': {'location': 'London', 'text': 'text B'}},
                {'data': {'location': 'London', 'text': 'text C'}},
            ],
            [
                {'result': [{'some': 'prediction A'}], 'score': 0.5, 'cluster': 0},
                {'result': [{'some': 'prediction B'}], 'score': 0.9, 'cluster': 0},
                {'result': [{'some': 'prediction C'}], 'score': 0.8, 'cluster': 0},
            ],
            [
                {'result': [{'some': 'prediction A'}]},
                None,
                None,
            ],
            1,
            200, [{'some': 'prediction C'}]
    ),
    # first task annotation, third task is chosen since cluster is marked as None (no clustering)
    (
            dict(
                title='Test',
                is_published=True,
                sampling=Project.UNCERTAINTY,
                model_version='12345',
                label_config='''
<View>
  <Text name="location" value="$location"></Text>
  <Choices name="text_class" choice="single">
    <Choice value="class_A"></Choice>
    <Choice value="class_B"></Choice>
  </Choices>
</View>'''
            ),
            [
                {'data': {'location': 'London', 'text': 'text A'}},
                {'data': {'location': 'London', 'text': 'text B'}},
                {'data': {'location': 'London', 'text': 'text C'}},
            ],
            [
                {'result': [{'some': 'prediction A'}], 'score': 0.5, 'cluster': None},
                {'result': [{'some': 'prediction B'}], 'score': 0.9, 'cluster': None},
                {'result': [{'some': 'prediction C'}], 'score': 0.8, 'cluster': None},
            ],
            [
                {'result': [{'some': 'prediction A'}]},
                None,
                None,
            ],
            1,
            200, [{'some': 'prediction C'}]
    ),
    # when some of the tasks are partially labeled, regardless scores sampling operates on depth-first (try to complete all tasks asap)  # noqa
    (
            dict(
                title='Test',
                is_published=True,
                sampling=Project.UNCERTAINTY,
                model_version='12345',
                maximum_annotations=2,
                label_config='''
<View>
  <Text name="location" value="$location"></Text>
  <Choices name="text_class" choice="single">
    <Choice value="class_A"></Choice>
    <Choice value="class_B"></Choice>
  </Choices>
</View>'''
            ),
            [
                {'data': {'location': 'London', 'text': 'text A'}},
                {'data': {'location': 'London', 'text': 'text B'}},
                {'data': {'location': 'London', 'text': 'text C'}},
                {'data': {'location': 'London', 'text': 'text D'}},
                {'data': {'location': 'London', 'text': 'text E'}},
            ],
            [
                {'result': [{'some': 'prediction A'}], 'score': 0.6, 'cluster': None},
                {'result': [{'some': 'prediction B'}], 'score': 0.5, 'cluster': None},
                {'result': [{'some': 'prediction C'}], 'score': 0.8, 'cluster': None},
                {'result': [{'some': 'prediction D'}], 'score': 0.4, 'cluster': None},
                {'result': [{'some': 'prediction E'}], 'score': 0.2, 'cluster': None},
            ],
            [
                {'result': [{'some': 'prediction A'}]},
                None,
                None,
                None,
                None
            ],
            2,
            200, [{'some': 'prediction A'}]
    ),
], ids=[
    'no annotations, second task is chosen due to active learning',
    'no annotations, first task is chosen due to active learning',
    'first task annotation, third task is chosen due to active learning',
    'first task annotation, forth task is chosen due to active learning (though task with lowest score exists but in the same cluster)',
    'lowest prediction is chosen from least solved cluster',
    'first task annotation, labeling is continued with the same cluster',
    'first task annotation, third task is chosen since cluster is marked as None (no clustering)',
    'when some of the tasks are partially labeled, regardless scores sampling operates on depth-first (try to complete all tasks asap)',
])
@pytest.mark.django_db
def test_next_task_with_active_learning(mocker,
                                        business_client, any_client, annotator2_client, project_config, tasks,
                                        predictions, annotations, num_annotators,
                                        status_code, prelabeling_result
                                        ):

    project = make_project(project_config, business_client.user)
    if _client_is_annotator(any_client):
        invite_client_to_project(any_client, project)
    if _client_is_annotator(annotator2_client):
        invite_client_to_project(annotator2_client, project)

    class MockAnnotatorCount:
        def count(self):
            return num_annotators

    mocker.patch.object(Project, 'annotators', return_value=MockAnnotatorCount())

    for task, prediction, annotation in zip(tasks, predictions, annotations):
        task = make_task(task, project)
        Prediction.objects.create(task=task, model_version=project.model_version, **prediction)
        if annotation is not None:
            completed_by = any_client.annotator if num_annotators == 1 else annotator2_client.annotator
            Annotation.objects.create(task=task, completed_by=completed_by, **annotation)
    r = any_client.get(f'/api/projects/{project.id}/next')
    assert r.status_code == status_code
    rdata = json.loads(r.content)
    if r.status_code == 200:
        assert rdata['predictions'][0]['result'] == prelabeling_result
    elif r.status_code == 404:
        assert rdata['detail'].startswith('There are no tasks remaining to be annotated')


@pytest.mark.parametrize('duplicated_project', (True, False))
@pytest.mark.django_db
def test_active_learning_with_uploaded_predictions(business_client, duplicated_project):
    config = dict(
        title='Test',
        is_published=True,
        sampling=Project.UNCERTAINTY,
        label_config='''
            <View>
              <Text name="location" value="$text"></Text>
              <Choices name="text_class" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )
    project = make_project(config, business_client.user, use_ml_backend=False)
    if duplicated_project:
        r = business_client.get(f'/api/projects/{project.id}/duplicate', {'duplicate_tasks': 0, 'title': 'duplicated'})
        project = Project.objects.get(id=json.loads(r.content)['id'])
        project.is_published = True
        project.save()
    result = [{
        'from_name': 'text_class',
        'to_name': 'text',
        'type': 'choices',
        'value': {'choices': ['class_A']}
    }]
    tasks = [
        {'data': {'text': 'score = 0.5'}, 'predictions': [{'result': result, 'score': 0.5}]},
        {'data': {'text': 'score = 0.1'}, 'predictions': [{'result': result, 'score': 0.1}]},
        {'data': {'text': 'score = 0.3'}, 'predictions': [{'result': result, 'score': 0.3}]},
        {'data': {'text': 'score = 0.2'}, 'predictions': [{'result': result, 'score': 0.2}]},
        {'data': {'text': 'score = 0.4'}, 'predictions': [{'result': result, 'score': 0.4}]},
    ]
    # upload tasks with predictions
    r = business_client.post(f'/api/projects/{project.id}/tasks/bulk/', data=json.dumps(tasks), content_type="application/json")
    assert r.status_code == 201

    def get_next_task_id_and_complete_it():
        r = business_client.get(f'/api/projects/{project.id}/next')
        assert r.status_code == 200
        task = json.loads(r.content)

        # and completes it
        r = business_client.post(f'/api/tasks/{task["id"]}/annotations/',
                                 data={'task': task['id'], 'result': json.dumps(result)})
        assert r.status_code == 201
        return task['data']['text']

    assert project.model_version == ''

    # tasks will be shown according to the uploaded scores
    assert get_next_task_id_and_complete_it() == 'score = 0.1'
    assert get_next_task_id_and_complete_it() == 'score = 0.2'
    assert get_next_task_id_and_complete_it() == 'score = 0.3'
    assert get_next_task_id_and_complete_it() == 'score = 0.4'
    assert get_next_task_id_and_complete_it() == 'score = 0.5'


@pytest.mark.skipif(not redis_healthcheck(), reason='Multi user locks only supported with redis enabled')
@pytest.mark.parametrize('sampling', (Project.UNIFORM, Project.UNCERTAINTY, Project.SEQUENCE))
@pytest.mark.django_db
def test_label_races(configured_project, business_client, sampling):
    config = dict(
        title='test_label_races',
        is_published=True,
        label_config='''
            <View>
              <Text name="text" value="$text"></Text>
              <Choices name="text_class" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )
    project = make_project(config, business_client.user)
    project.sampling = sampling
    project.save()
    id1 = make_task({'data': {'text': 'aaa'}}, project).id
    id2 = make_task({'data': {'text': 'bbb'}}, project).id
    ann1 = make_annotator({'email': 'ann1@testlabelraces.com'}, project, True)
    ann2 = make_annotator({'email': 'ann2@testlabelraces.com'}, project, True)

    # ann1 takes task id1
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    selected_id = json.loads(r.content)['id']
    if project.sampling in (Project.UNIFORM, Project.UNCERTAINTY):
        assert selected_id in (id1, id2)
        id2 = list({id1, id2} - {selected_id})[0]
    else:
        assert selected_id == id1

    # ann2 takes task id2 because id1 is locked by ann1
    r = ann2.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id2


@pytest.mark.skipif(not redis_healthcheck(), reason='Multi user locks only supported with redis enabled')
@pytest.mark.parametrize('sampling', (Project.UNIFORM, Project.UNCERTAINTY, Project.SEQUENCE))
@pytest.mark.django_db
def test_label_races_after_all_taken(configured_project, business_client, sampling):
    config = dict(
        title='test_label_races',
        is_published=True,
        label_config='''
            <View>
              <Text name="text" value="$text"></Text>
              <Choices name="text_class" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )
    project = make_project(config, business_client.user)
    project.sampling = sampling
    project.save()
    id1 = make_task({'data': {'text': 'aaa'}}, project).id
    id2 = make_task({'data': {'text': 'bbb'}}, project).id
    ann1 = make_annotator({'email': 'ann1@testlabelracesalltaken.com'}, project, True)
    ann2 = make_annotator({'email': 'ann2@testlabelracesalltaken.com'}, project, True)

    # ann1 takes task id1
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    selected_id = json.loads(r.content)['id']
    if project.sampling in (Project.UNIFORM, Project.UNCERTAINTY):
        assert selected_id in (id1, id2)
        id2 = list({id1, id2} - {selected_id})[0]
    else:
        assert selected_id == id1
    id1 = selected_id

    # ann2 takes task id2 because id1 is locked by ann1
    r = ann2.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id2

    # then ann2 takes id2 again
    r = ann2.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id2

    # ann1 takes id1
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id1


@pytest.mark.django_db
def test_breadth_first_simple(business_client):
    config = dict(
        title='test_label_races',
        is_published=True,
        maximum_annotations=2,
        label_config='''
            <View>
              <Text name="text" value="$text"></Text>
              <Choices name="text_class" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )
    annotation_result = json.dumps([{
        'from_name': 'text_class',
        'to_name': 'text',
        'type': 'choices',
        'value': {'choices': ['class_A']}
    }])
    project = make_project(config, business_client.user)
    project.sampling = Project.SEQUENCE
    project.save()
    id1 = make_task({'data': {'text': 'aaa'}}, project).id
    id2 = make_task({'data': {'text': 'bbb'}}, project).id
    ann1 = make_annotator({'email': 'ann1@testbreadthfirst.com'}, project, True)
    ann2 = make_annotator({'email': 'ann2@testbreadthfirst.com'}, project, True)

    # ann1 takes first task
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id1

    # and completes it
    r = ann1.post(f'/api/tasks/{id1}/annotations/', data={'task': id1, 'result': annotation_result})
    assert r.status_code == 201

    # ann2 takes first task because maximum_annotations=2
    r = ann2.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id1

    # and completes it
    r = ann2.post(f'/api/tasks/{id1}/annotations/', data={'task': id1, 'result': annotation_result})
    assert r.status_code == 201
    completed_task = Task.objects.get(id=id1)
    assert completed_task.is_labeled

    if apps.is_installed('businesses'):
        assert completed_task.accuracy == 1.0

    # ann2 takes second task because only one unlabeled left
    r = ann2.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id2


@pytest.mark.django_db
def test_breadth_first_overlap_3(business_client):
    config = dict(
        title='test_label_races',
        is_published=True,
        maximum_annotations=3,
        label_config='''
            <View>
              <Text name="text" value="$text"></Text>
              <Choices name="text_class" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )
    annotation_result = json.dumps([{
        'from_name': 'text_class',
        'to_name': 'text',
        'type': 'choices',
        'value': {'choices': ['class_A']}
    }])
    project = make_project(config, business_client.user)
    project.sampling = Project.UNIFORM
    project.save()

    def complete_task(annotator):
        _r = annotator.get(f'/api/projects/{project.id}/next')
        assert _r.status_code == 200
        task_id = json.loads(_r.content)['id']
        annotator.post(f'/api/tasks/{task_id}/annotations/', data={'task': task_id, 'result': annotation_result})
        return task_id

    id1 = make_task({'data': {'text': 'aaa'}}, project).id
    id2 = make_task({'data': {'text': 'bbb'}}, project).id
    id3 = make_task({'data': {'text': 'ccc'}}, project).id

    ann1 = make_annotator({'email': 'ann1@testbreadthfirstoverlap3.com'}, project, True)
    ann2 = make_annotator({'email': 'ann2@testbreadthfirstoverlap3.com'}, project, True)
    ann3 = make_annotator({'email': 'ann3@testbreadthfirstoverlap3.com'}, project, True)

    # ann1, ann2, ann3 should follow breadth-first scheme: trying to complete the tasks as fast as possible
    task_id_ann1 = complete_task(ann1)
    task_id_ann2 = complete_task(ann2)
    assert task_id_ann2 == task_id_ann1
    complete_task(ann1)
    complete_task(ann1)
    task_id_ann3 = complete_task(ann3)
    assert task_id_ann2 == task_id_ann3
    task_id_ann2 = complete_task(ann2)
    task_id_ann3 = complete_task(ann3)
    assert task_id_ann2 == task_id_ann3


@pytest.mark.skipif(not redis_healthcheck(), reason='Multi user locks only supported with redis enabled')
@pytest.mark.django_db
def test_try_take_last_task_at_the_same_time(business_client):
    config = dict(
        title='test_try_take_last_task_at_the_same_time',
        is_published=True,
        maximum_annotations=2,
        label_config='''
            <View>
              <Text name="text" value="$text"></Text>
              <Choices name="text_class" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )
    annotation_result = json.dumps([{
        'from_name': 'text_class',
        'to_name': 'text',
        'type': 'choices',
        'value': {'choices': ['class_A']}
    }])
    project = make_project(config, business_client.user)
    project.sampling = Project.SEQUENCE
    project.save()

    def complete_task(annotator):
        _r = annotator.get(f'/api/projects/{project.id}/next')
        assert _r.status_code == 200
        task_id = json.loads(_r.content)['id']
        annotator.post(f'/api/tasks/{task_id}/annotations/', data={'task': task_id, 'result': annotation_result})
        return task_id

    make_task({'data': {'text': 'aaa'}}, project)
    make_task({'data': {'text': 'bbb'}}, project)

    ann1 = make_annotator({'email': 'ann1@lasttask.com'}, project, True)
    ann2 = make_annotator({'email': 'ann2@lasttask.com'}, project, True)
    ann3 = make_annotator({'email': 'ann3@lasttask.com'}, project, True)

    # ann1, ann2 complete first task, then ann3 completes last task
    complete_task(ann1)
    complete_task(ann2)
    complete_task(ann3)

    # only one annotator can take the last task
    _r = ann1.get(f'/api/projects/{project.id}/next')
    assert _r.status_code == 200

    _r = ann2.get(f'/api/projects/{project.id}/next')
    assert _r.status_code == 404

    _r = ann3.get(f'/api/projects/{project.id}/next')
    assert _r.status_code == 404


@pytest.mark.skipif(not redis_healthcheck(), reason='Multi user locks only supported with redis enabled')
@pytest.mark.django_db
def test_breadth_first_with_label_race(configured_project, business_client):
    config = dict(
        title='test_label_races',
        is_published=True,
        maximum_annotations=2,
        label_config='''
            <View>
              <Text name="text" value="$text"></Text>
              <Choices name="text_class" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )
    annotation_result = json.dumps([{
        'from_name': 'text_class',
        'to_name': 'text',
        'type': 'choices',
        'value': {'choices': ['class_A']}
    }])
    project = make_project(config, business_client.user)
    project.sampling = Project.SEQUENCE
    project.save()
    id1 = make_task({'data': {'text': 'aaa'}}, project).id
    id2 = make_task({'data': {'text': 'bbb'}}, project).id
    ann1 = make_annotator({'email': 'ann1@testbreadthlabelraces.com'}, project, True)
    ann2 = make_annotator({'email': 'ann2@testbreadthlabelraces.com'}, project, True)

    # ann1 takes first task
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id1

    # and completes it
    r = ann1.post(f'/api/tasks/{id1}/annotations/', data={'task': id1, 'result': annotation_result})
    assert r.status_code == 201

    # ann1 takes second task and freezes
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id2

    # ann2 takes first task because maximum_annotations=2
    r = ann2.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id1

    # and completes it
    r = ann2.post(f'/api/tasks/{id1}/annotations/', data={'task': id1, 'result': annotation_result})
    assert r.status_code == 201
    completed_task = Task.objects.get(id=id1)
    assert completed_task.is_labeled
    if apps.is_installed('businesses'):
        assert completed_task.accuracy == 1.0

    # ann2 takes 2nd task because maximum_annotations=2
    r = ann2.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id2

    # ann1 takes second task again
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == id2


@pytest.mark.skipif(not redis_healthcheck(), reason='Multi user locks only supported with redis enabled')
@pytest.mark.django_db
def test_label_race_with_overlap(configured_project, business_client):
    """
        2 annotators takes and finish annotations one by one
        depending on project settings overlap

        create project
        make annotation result
        make 2 annotators
        bulk create tasks
        change project settings
        check overlap
        next annotate tasks

        check code comments
    """
    config = dict(
        title='test_label_races',
        is_published=True,
        label_config='''
            <View>
              <Text name="text" value="$text"></Text>
              <Choices name="text_class" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )
    annotation_result = json.dumps([{
        'from_name': 'text_class',
        'to_name': 'text',
        'type': 'choices',
        'value': {'choices': ['class_A']}
    }])
    project = make_project(config, business_client.user)
    project.sampling = Project.SEQUENCE
    project.save()

    ann1 = make_annotator({'email': 'ann1@testlabelracewithoverlap.com'}, project, True)
    ann2 = make_annotator({'email': 'ann2@testlabelracewithoverlap.com'}, project, True)

    # create tasks
    tasks = []
    num_tasks = 2
    for i in range(num_tasks):
        tasks.append({'data': {'text': f'this is {str(i)}'}})
    r = business_client.post(
        f'/api/projects/{project.id}/tasks/bulk/', data=json.dumps(tasks), content_type='application/json')
    assert r.status_code == 201

    # set overlap
    r = business_client.patch(
        f'/api/projects/{project.id}/',
        data=json.dumps({'maximum_annotations': 2, 'overlap_cohort_percentage': 50, 'show_overlap_first': True}),
        content_type='application/json'
    )
    assert r.status_code == 200

    t = Task.objects.filter(project=project.id).filter(overlap=2)
    assert t.count() == 1
    t1 = Task.objects.filter(project=project.id).filter(overlap=1)
    assert t1.count() == 1
    overlap_id = t.first().id
    other_id = t1.first().id

    # ann1 takes first task
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == overlap_id

    # ann2 takes the same task, since overlap = 2
    r = ann2.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == overlap_id
    assert Task.objects.get(id=overlap_id).has_lock()

    # ann1 takes next task, it is also overlapped because we force show_overlapped_first=True
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == overlap_id

    # ann2 completes overlapped task
    r = ann2.post(f'/api/tasks/{overlap_id}/annotations/', data={'task': overlap_id, 'result': annotation_result})
    assert r.status_code == 201

    # ann1 takes next task, and now it is overlapped, since lock was released by ann2 annotation
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == overlap_id

    # ann1 completes overlapped task
    r = ann1.post(f'/api/tasks/{overlap_id}/annotations/', data={'task': overlap_id, 'result': annotation_result})
    assert r.status_code == 201

    # ann1 takes next task, now it is another one since overlapped is labeled
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == other_id


@pytest.mark.skipif(not redis_healthcheck(), reason='Multi user locks only supported with redis enabled')
@pytest.mark.django_db
def test_label_w_drafts_race_with_overlap(configured_project, business_client):
    """
        2 annotators takes and leaves with draft annotations one by one
        depending on project settings overlap

        create project
        make annotation result
        make 2 annotators
        bulk create tasks
        change project settings
        check overlap
        next annotate tasks

        check code comments
    """
    config = dict(
        title='test_label_races',
        is_published=True,
        label_config='''
            <View>
              <Text name="text" value="$text"></Text>
              <Choices name="text_class" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )
    annotation_result = json.dumps([{
        'from_name': 'text_class',
        'to_name': 'text',
        'type': 'choices',
        'value': {'choices': ['class_A']}
    }])

    project = make_project(config, business_client.user)
    project.sampling = Project.SEQUENCE
    project.save()

    ann1 = make_annotator({'email': 'ann1@testlabelracewdrafts.com'}, project, True)
    ann2 = make_annotator({'email': 'ann2@testlabelracewdrafts.com'}, project, True)

    # create tasks
    tasks = []
    num_tasks = 2
    for i in range(num_tasks):
        tasks.append({'data': {'text': f'this is {str(i)}'}})
    r = business_client.post(
        f'/api/projects/{project.id}/tasks/bulk/', data=json.dumps(tasks), content_type='application/json')
    assert r.status_code == 201

    # set overlap
    r = business_client.patch(
        f'/api/projects/{project.id}/',
        data=json.dumps({'maximum_annotations': 2, 'overlap_cohort_percentage': 50, 'show_overlap_first': True}),
        content_type='application/json'
    )
    assert r.status_code == 200

    t = Task.objects.filter(project=project.id).filter(overlap=2)
    assert t.count() == 1
    t1 = Task.objects.filter(project=project.id).filter(overlap=1)
    assert t1.count() == 1
    overlap_id = t.first().id
    other_id = t1.first().id

    annotation_draft_result = {
        'task': overlap_id,
        'lead_time': 640.279,
        'draft': json.dumps([{
            'from_name': 'text_class',
            'to_name': 'text',
            'type': 'choices',
            'value': {'choices': ['class_A']}
        }]),
        'result': json.dumps([])
    }

    # ann1 takes first task
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == overlap_id

    # ann2 takes the same task, since overlap = 2
    r = ann2.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == overlap_id
    assert Task.objects.get(id=overlap_id).has_lock()

    # ann1 takes next task, it is also overlapped because we force show_overlapped_first=True
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == overlap_id

    # ann2 send draft for overlapped task
    r = ann2.post(f'/api/tasks/{overlap_id}/annotations/', data=annotation_draft_result)
    assert r.status_code == 201

    # ann1 takes next task, and now it is overlapped, since lock was released by ann2 annotation
    #TODO was?
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    assert json.loads(r.content)['id'] == overlap_id

    # ann1 completes overlapped task
    r = ann1.post(f'/api/tasks/{overlap_id}/annotations/', data={'task': overlap_id, 'result': annotation_result})
    assert r.status_code == 201

    # ann1 takes next task, now it is another one since overlapped is labeled
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200
    print(overlap_id, other_id)
    assert json.loads(r.content)['id'] == other_id

    # try again
    r = ann1.get(f'/api/projects/{project.id}/next')
    assert r.status_code == 200


@pytest.mark.django_db
def test_fetch_final_taken_task(business_client):
    config = dict(
        title='test_label_races',
        is_published=True,
        label_config='''
            <View>
              <Text name="text" value="$text"></Text>
              <Choices name="text_class" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )
    annotation_result = json.dumps([{
        'from_name': 'text_class',
        'to_name': 'text',
        'type': 'choices',
        'value': {'choices': ['class_A']}
    }])
    project = make_project(config, business_client.user)
    project.sampling = Project.SEQUENCE
    project.save()

    ann1 = make_annotator({'email': 'ann1@testfetchfinal.com'}, project, True)
    ann2 = make_annotator({'email': 'ann2@testfetchfinal.com'}, project, True)

    # create tasks
    tasks = []
    num_tasks = 2
    for i in range(num_tasks):
        tasks.append({'data': {'text': f'this is {str(i)}'}})
    r = business_client.post(
        f'/api/projects/{project.id}/tasks/bulk/', data=json.dumps(tasks), content_type='application/json')
    assert r.status_code == 201

    # set max annotations
    r = business_client.patch(
        f'/api/projects/{project.id}/',
        data=json.dumps({'maximum_annotations': 2}),
        content_type='application/json'
    )
    assert r.status_code == 200

    print('ann1 takes any task and complete it')
    r = ann1.get(f'/api/projects/{project.id}/next')
    task_id = json.loads(r.content)['id']
    ann1.post(f'/api/tasks/{task_id}/annotations/', data={'task': task_id, 'result': annotation_result})

    print('ann2 takes the same task (because of depth-first) but just lock it - don\'t complete')
    r = ann2.get(f'/api/projects/{project.id}/next')
    assert json.loads(r.content)['id'] == task_id

    print('ann1 takes another task')
    r = ann1.get(f'/api/projects/{project.id}/next')
    another_task_id = json.loads(r.content)['id']
    assert another_task_id != task_id

    print('ann1 should never take task_id since he has completed it')
    for i in range(3):
        r = ann1.get(f'/api/projects/{project.id}/next')
        assert json.loads(r.content)['id'] == another_task_id


@pytest.mark.skipif(not redis_healthcheck(), reason='Multi user locks only supported with redis enabled')
@pytest.mark.django_db
def test_with_bad_annotation_result(business_client):
    config = dict(
        title='test_with_failed_matching_score',
        is_published=True,
        sampling=Project.SEQUENCE,
        maximum_annotations=1,
        label_config='''
            <View style="display: flex">
              <View style="width: 275px">
                <Header value="Pick tooth label" />
                <PolygonLabels name="tag" toName="img" strokewidth="2" pointstyle="circle" pointsize="small" showInline="true">
                  <Label value="t11" background="#8ffe09"></Label>
                  <Label value="t12" background="#2000b1"></Label>
                </PolygonLabels>
              </View>
              <View>
                <Image name="img" value="$image" showMousePos="true" zoom="true" />
              </View>
            </View>''',
    )
    project = make_project(config, business_client.user, use_ml_backend=False)

    bad_result = {
        'id': 'Yv_lLEp_8I', 'type': 'polygonlabels', 'value': {'points': [[65.99824119670821, 73.11598603746282]], 'polygonlabels': ['t11']}, 'source': '$image', 'to_name': 'img', 'from_name': 'tag', 'parent_id': None, 'image_rotation': 0, 'original_width': 4032, 'original_height': 3024}
    good_result = {
        "id": "NsccF-AYMT",
        "from_name": "tag",
        "to_name": "img",
        "source": "$image",
        "type": "polygonlabels",
        "parent_id": None,
        "value": {
            "points": [
                [
                    35.48487164486663,
                    15.14455036952532
                ],
                [
                    34.47935635946919,
                    13.997479425768038
                ],
                [
                    33.617486114842826,
                    13.997479425768038
                ],
                [
                    31.462810503276884,
                    15.20827653306739
                ],
                [
                    30.170005136337327,
                    16.865156785161243
                ],
                [
                    29.308134891710946,
                    18.64948936433924
                ],
                [
                    29.02084481016883,
                    20.943631251853805
                ],
                [
                    28.781436408883717,
                    23.174046975826304
                ],
                [
                    29.403898252224984,
                    25.022105718546374
                ],
                [
                    30.409413537622427,
                    25.65936735396709
                ],
                [
                    31.893745625590064,
                    25.27701037271466
                ],
                [
                    32.755615870216445,
                    24.958379555004303
                ],
                [
                    34.28782963844111,
                    24.12993942895737
                ],
                [
                    35.43698996460961,
                    23.110320812284233
                ],
                [
                    36.442505250007045,
                    22.53678534040559
                ],
                [
                    37.112848773605336,
                    21.32598823310624
                ],
                [
                    36.873440372320225,
                    19.22302483621788
                ],
                [
                    36.63403197103513,
                    17.69359691120817
                ],
                [
                    36.25097852897896,
                    16.737704458077104
                ]
            ],
            "polygonlabels": [
                "t11"
            ]
        },
        "original_width": 4032,
        "original_height": 3024,
        "image_rotation": 0
    }

    num_annotators = 30
    anns = []
    for i in range(num_annotators):
        anns.append(make_annotator({'email': f'ann{i}@testwithbadannotationresult.com'}, project, True))

    # create one heavy task with many annotations - it's statistic recalculation should not be done after completing another task  # noqa
    # turn off statistics calculations for now
    with mock.patch('tasks.models.update_project_summary_annotations_and_is_labeled'):
        for i in range(10):
            task = make_task({'data': {'image': f'https://data.s3.amazonaws.com/image/{i}.jpg'}}, project)
            for i in range(num_annotators):
                make_annotation({'result': [bad_result] * 10 + [good_result] * 10, 'completed_by': anns[i].annotator}, task.id)

    # create uncompleted task
    uncompleted_task = make_task({'data': {'image': f'https://data.s3.amazonaws.com/image/uncompleted.jpg'}}, project)

    print('ann1 takes any task with bad annotation and complete it')
    r = anns[0].get(f'/api/projects/{project.id}/next')
    task_id = json.loads(r.content)['id']
    assert task_id == uncompleted_task.id

    def make_async_annotation_submit(new_ann=None):
        print('Async annotation submit')
        if new_ann is None:
            new_ann = make_annotator({'email': f'new_ann@testwithbadannotationresult.com'}, project, True)
        new_ann.post(
            f'/api/tasks/{task_id}/annotations/',
            data={'task': task_id, 'result': json.dumps([good_result])},
        )

    assert uncompleted_task.has_lock()
    # we are checking here that if we submit annotation for the current task,
    # there is no any additional computational costs implied by statistics
    # recalculation over the entire project
    t = time.time()
    make_async_annotation_submit(anns[0])
    # TODO: measuring response time is not a good way to do that,
    #  but dunno how to emulate async requests or timeouts for Django test client
    assert (time.time() - t) < 1, 'Time of annotation.submit() increases - that might be caused by redundant computations over the rest of the tasks - check that only a single task is affected by /api/tasks/<task_id>/annotations'  # noqa

    assert uncompleted_task.has_lock()  # Task has lock since it has annotation


@pytest.mark.parametrize('setup_before_upload', (False, True))
@pytest.mark.parametrize('show_overlap_first', (False, True))
@pytest.mark.django_db
def test_overlap_first(business_client, setup_before_upload, show_overlap_first):
    c = business_client
    config = dict(
        title='test_overlap_first',
        is_published=True,
        maximum_annotations=1,
        show_overlap_first=show_overlap_first,
        label_config='''
            <View>
              <Text name="text" value="$text"></Text>
              <Choices name="text_class" choice="single">
                <Choice value="class_A"></Choice>
                <Choice value="class_B"></Choice>
              </Choices>
            </View>'''
    )

    project = make_project(config, business_client.user)

    annotation_result = json.dumps([{
        'from_name': 'text_class',
        'to_name': 'text',
        'type': 'choices',
        'value': {'choices': ['class_A']}
    }])

    num_tasks = 1000
    overlap_cohort_percentage = 1

    # set up tasks overlap
    setup_after_upload = True
    if setup_before_upload:
        r = c.patch(
            f'/api/projects/{project.id}/',
            data=json.dumps({'maximum_annotations': 2, 'overlap_cohort_percentage': overlap_cohort_percentage}),
            content_type='application/json'
        )
        assert r.status_code == 200
        setup_after_upload = False

    # create tasks
    tasks = []
    for i in range(num_tasks):
        tasks.append({'data': {'text': f'this is {str(i)}'}})
    r = business_client.post(
        f'/api/projects/{project.id}/tasks/bulk/', data=json.dumps(tasks), content_type='application/json')
    assert r.status_code == 201

    if setup_after_upload:
        r = c.patch(
            f'/api/projects/{project.id}/',
            data=json.dumps({'maximum_annotations': 2, 'overlap_cohort_percentage': overlap_cohort_percentage}),
            content_type='application/json'
        )
        assert r.status_code == 200

    expected_tasks_with_overlap = int(overlap_cohort_percentage / 100. * num_tasks)

    assert Task.objects.filter(Q(project_id=project.id) & Q(overlap__gt=1)).count() == expected_tasks_with_overlap

    def complete_task(annotator):
        _r = annotator.get(f'/api/projects/{project.id}/next')
        assert _r.status_code == 200
        task_id = json.loads(_r.content)['id']
        annotator.post(f'/api/tasks/{task_id}/annotations/', data={'task': task_id, 'result': annotation_result})

    ann1 = make_annotator({'email': 'ann1@testoverlapfirst.com'}, project, True)
    ann2 = make_annotator({'email': 'ann2@testoverlapfirst.com'}, project, True)

    for i in range(expected_tasks_with_overlap):
        complete_task(ann1), complete_task(ann2)

    all_tasks_with_overlap_are_labeled = all(t.is_labeled for t in Task.objects.filter(Q(project_id=project.id) & Q(overlap__gt=1)))  # noqa
    all_tasks_without_overlap_are_not_labeled = all(not t.is_labeled for t in Task.objects.filter(Q(project_id=project.id) & Q(overlap=1)))  # noqa

    if show_overlap_first:
        assert all_tasks_with_overlap_are_labeled
        assert all_tasks_without_overlap_are_not_labeled
    else:
        assert not all_tasks_with_overlap_are_labeled
        assert not all_tasks_without_overlap_are_not_labeled
