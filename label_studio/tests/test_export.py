"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json
import copy

from django.db import transaction
from tasks.models import Task, Annotation, Prediction
from tasks.serializers import AnnotationSerializer
from django.apps import apps


@pytest.mark.skip(reason='HTX-868')
@pytest.mark.parametrize('annotation_items, aggregated_class', [
    ([{'id': 1, 'review_result': None, 'ground_truth': False,
       'result': [{'id': '123', 'type': 'choices', 'value': {'choices': ['class_AA']}, 'to_name': 'text',
                  'from_name': 'text_class'}], 'created_at': 'test',
       'updated_at': 'test', 'lead_time': None, 'completed_by': 2}], 'class_AA'),

    ([{'id': 2, 'review_result': None, 'ground_truth': False,
       'result': [{'id': '123', 'type': 'choices', 'value': {'choices': ['class_AA']}, 'to_name': 'text',
                  'from_name': 'text_class'}], 'created_at': '',
       'updated_at': '', 'lead_time': None, 'completed_by': 4},
      {'id': 3, 'review_result': None, 'ground_truth': False,
       'result': [{'id': '456', 'type': 'choices', 'value': {'choices': ['class_AA']}, 'to_name': 'text',
                  'from_name': 'text_class'}], 'created_at': '',
       'updated_at': '', 'lead_time': None, 'completed_by': 4}], 'class_AA'),

    ([{'id': 4, 'review_result': None, 'ground_truth': False,
       'result': [{'id': '123', 'type': 'choices', 'value': {'choices': ['class_AA']}, 'to_name': 'text',
                  'from_name': 'text_class'}], 'created_at': '',
       'updated_at': '', 'lead_time': None, 'completed_by': 6},
      {'id': 5, 'review_result': None, 'ground_truth': False,
       'result': [{'id': '456', 'type': 'choices', 'value': {'choices': ['class_BB']}, 'to_name': 'text',
                  'from_name': 'text_class'}], 'created_at': '',
       'updated_at': '', 'lead_time': None, 'completed_by': 6},
      {'id': 6, 'review_result': None, 'ground_truth': False,
       'result': [{'id': '789', 'type': 'choices', 'value': {'choices': ['class_BB']}, 'to_name': 'text',
                  'from_name': 'text_class'}], 'created_at': '',
       'updated_at': '', 'lead_time': None, 'completed_by': 6}], 'class_BB'),

    ([{'id': 7, 'review_result': None, 'ground_truth': False,
       'result': [{'id': '123', 'type': 'choices', 'value': {'choices': ['class_AA']},
                  'to_name': 'text', 'from_name': 'text_class'}], 'created_at': '',
       'updated_at': '', 'lead_time': None, 'completed_by': 10}], 'class_AA')
])
@pytest.mark.parametrize('finished, aggregator_type, return_task, num_task_in_result', [
    ('0', 'no_aggregation', '0', 2),
    ('1', 'no_aggregation', '0', 1),
    ('0', 'majority_vote', '0', 2),
    ('0', 'majority_vote', '1', 2),
    ('1', 'majority_vote', '1', 1)
])
@pytest.mark.django_db
def test_export(
        business_client, configured_project, finished, aggregator_type, return_task, num_task_in_result,
        annotation_items, aggregated_class
):
    if aggregator_type == 'majority_vote' and not apps.is_installed('businesses'):
        pytest.skip('Not supported aggregation for open-source version')

    task_query = Task.objects.filter(project=configured_project.id)
    task = task_query.first()

    expected_annotations_for_task = set()
    for annotation in annotation_items:
        db_annotation = Annotation.objects.create(task=task, result=annotation['result'],
                                                      completed_by=business_client.admin)
        db_annotation = AnnotationSerializer(db_annotation).data
        annotation['id'] = db_annotation['id']
        annotation['created_at'] = db_annotation['created_at']
        annotation['updated_at'] = db_annotation['updated_at']
        annotation['completed_by'] = business_client.admin.id
        expected_annotations_for_task.add(json.dumps(annotation))

    r = business_client.get(f'/api/projects/{configured_project.id}/results/', data={
        'finished': finished,
        'aggregator_type': aggregator_type,
        'return_task': return_task
    })
    assert r.status_code == 200
    exports = r.json()

    # test expected number of objects returned
    assert len(exports) == num_task_in_result

    # test whether "id" or full task included in results
    if return_task == '0':
        task_with_annotation = next((t for t in exports if t['id'] == task.id))
        assert task_with_annotation['id'] == task.id
    elif return_task == '1':
        task_with_annotation = next((t for t in exports if t['id'] == task.id))
        assert task_with_annotation['data'] == task.data
    else:
        raise Exception('Incorrect return_task param in test: ' + str(return_task))

    # test how aggregation affects annotations
    if aggregator_type == 'no_aggregation':
        exported_annotations = set()
        for annotation in task_with_annotation['annotations']:
            exported_annotations.add(json.dumps(annotation))
        assert exported_annotations == expected_annotations_for_task
        if finished != '1':
            # we expect to see all tasks in exports...
            assert len(exports) == task_query.count()
            # ...as well as task without annotations (with empty results)
            assert all(len(t['annotations']) == 0 for t in exports if t['id'] != task.id)
    else:
        assert task_with_annotation['annotations'][0]['result'][0]['value']['choices'][0] == aggregated_class


@pytest.mark.skip(reason='HTX-868')
@pytest.mark.parametrize('finished', ('0', '1'))
@pytest.mark.parametrize('return_task', ('0', '1'))
@pytest.mark.parametrize('aggregator_type', ('no_aggregation', 'majority_vote'))
@pytest.mark.parametrize('annotation_results, predictions', [
    ([
         [{'id': '123', 'from_name': 'text_class', 'to_name': 'text', 'type': 'choices',
           'value': {'choices': ['class_A']}}]
     ], {
         'result': [{'id': '123', 'from_name': 'text_class', 'to_name': 'text', 'type': 'choices',
                     'value': {'choices': ['class_A']}}],
         'score': 0.5
     }),
    ([
         [{'id': '123', 'from_name': 'text_class', 'to_name': 'text', 'type': 'choices',
           'value': {'choices': ['class_A']}}]
     ], None),
])
@pytest.mark.django_db
def test_export_with_predictions(
        business_client, configured_project, finished, return_task, aggregator_type, annotation_results, predictions
):
    if aggregator_type == 'majority_vote' and not apps.is_installed('businesses'):
        pytest.skip('Not supported aggregation for open-source version')

    tasks = Task.objects.filter(project=configured_project.id)
    task = tasks.first()
    for result in annotation_results:
        for r in result:
            r['completed_by'] = [business_client.admin.id]
        Annotation.objects.create(task=task, result=result, completed_by=business_client.admin)
    if predictions:
        for task in tasks:
            Prediction.objects.create(task=task, result=predictions['result'], score=predictions['score'])

    r = business_client.get(f'/api/projects/{configured_project.id}/results/', data={
        'finished': finished,
        'aggregator_type': aggregator_type,
        'return_task': return_task,
        'return_predictions': '1'
    })
    assert r.status_code == 200
    exports = r.json()
    for task in exports:
        if predictions:
            assert task['predictions'][0]['result'] == predictions['result']
            assert task['predictions'][0]['score'] == predictions['score']
        else:
            assert task['predictions'] == []
