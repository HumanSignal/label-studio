"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json
import requests_mock
import math

from django.apps import apps
from django.urls import reverse
from tasks.models import Task, Annotation
from projects.models import Project
from .utils import invite_client_to_project, _client_is_annotator


@pytest.fixture
def configured_project_min_annotations_1(configured_project):
    p = Project.objects.get(id=configured_project.id)
    p.min_annotations_to_start_training = 1
    # p.agreement_method = p.SINGLE
    p.save()
    return p


@pytest.mark.django_db
@pytest.mark.parametrize('result, logtext, ml_upload_called', [
    (json.dumps([{'from_name': 'text_class', 'to_name': 'text', 'type': 'labels', 'value': {'labels': ['class_A'], 'start': 0, 'end': 1}}]), None, True),
    (json.dumps([]), None, True),
])
def test_create_annotation(caplog, any_client, configured_project_min_annotations_1, result, logtext, ml_upload_called):
    task = Task.objects.first()
    if _client_is_annotator(any_client):
        assert invite_client_to_project(any_client, task.project).status_code == 200
    with requests_mock.Mocker() as m:
        m.post('http://localhost:8999/train')
        annotation = {'result': result, 'task': task.id, 'lead_time': 2.54}
        r = any_client.post(f'/api/tasks/{task.id}/annotations/', data=annotation)
        # check that submitted VALID data for task_annotation
        # makes task labeled
        task.refresh_from_db()
        assert task.is_labeled is True
        assert r.status_code == 201
        annotation = Annotation.objects.all()
        assert annotation.count() == 1
        annotation = annotation.first()
        assert annotation.task.id == task.id
        # annotator client
        if hasattr(any_client, 'annotator') and any_client.annotator is not None:
            assert annotation.completed_by.id == any_client.user.id
        # business client
        else:
            assert annotation.completed_by.id == any_client.business.admin.id

        if apps.is_installed('businesses'):
            assert annotation.task.accuracy == 1.0

        if logtext:
            assert logtext in caplog.text


@pytest.mark.django_db
def test_create_annotation_with_ground_truth(caplog, any_client, configured_project_min_annotations_1):

    task = Task.objects.first()
    if _client_is_annotator(any_client):
        assert invite_client_to_project(any_client, task.project).status_code == 200

    ground_truth = {
        'task': task.id,
        'result': json.dumps([{'from_name': 'text_class', 'to_name': 'text', 'value': {'labels': ['class_A'], 'start': 0, 'end': 1}}]),
        'ground_truth': True
    }

    annotation = {
        'task': task.id,
        'result': json.dumps([{'from_name': 'text_class', 'to_name': 'text', 'value': {'labels': ['class_B'], 'start': 0, 'end': 1}}])
    }

    with requests_mock.Mocker() as m:
        m.post('http://localhost:8999/train')

        # ground_truth doesn't affect statistics & ML backend
        r = any_client.post('/api/tasks/{}/annotations/'.format(task.id), data=ground_truth)
        assert r.status_code == 201
        assert not m.called

        # real annotation triggers uploading to ML backend and recalculating accuracy
        r = any_client.post('/api/tasks/{}/annotations/'.format(task.id), data=annotation)
        assert r.status_code == 201
        task = Task.objects.get(id=task.id)
        assert task.annotations.count() == 2


@pytest.mark.django_db
def test_delete_annotation(business_client, configured_project):
    task = Task.objects.first()
    annotation = Annotation.objects.create(task=task, result=[])
    assert task.annotations.count() == 1
    r = business_client.delete('/api/annotations/{}/'.format(annotation.id))
    assert r.status_code == 204
    assert task.annotations.count() == 0


@pytest.fixture
def annotations():
    task = Task.objects.first()
    return {
        'class_A': {
            'task': task.id,
            'result': json.dumps([{'from_name': 'text_class', 'to_name': 'text', 'type': 'labels', 'value': {
                'labels': ['class_A'], 'start': 0, 'end': 10
            }}])
        },
        'class_B': {
            'task': task.id,
            'result': json.dumps([{'from_name': 'text_class', 'to_name': 'text', 'type': 'labels', 'value': {
                'labels': ['class_B'], 'start': 0, 'end': 10
            }}])
        },
        'empty': {
            'task': task.id,
            'result': json.dumps([])
        }
    }


@pytest.fixture
def project_with_max_annotations_2(configured_project):
    configured_project.maximum_annotations = 2
    # configured_project.agreement_method = Project.SINGLE
    configured_project.save()


@pytest.mark.parametrize('annotations_sequence, accuracy, is_labeled', [
    ([], None, False),
    ([('class_A', 'business')], 1, False),
    ([('class_A', 'annotator')], 1, False),
    ([('class_A', 'business'), ('class_A', 'business')], 1, True),
    ([('class_A', 'business'), ('class_A', 'annotator')], 1, True),
    ([('class_A', 'annotator'), ('class_A', 'business')], 1, True),
    ([('class_A', 'business'), ('class_B', 'business')], 0.5, True),
    ([('class_A', 'business'), ('class_B', 'annotator')], 0.5, True),
    ([('class_A', 'annotator'), ('class_B', 'business')], 0.5, True),
    ([('empty', 'annotator'), ('empty', 'business')], 1, True),
    ([('class_A', 'annotator'), ('empty', 'business')], 0.5, True)
])
@pytest.mark.django_db
def test_accuracy(
        business_client, annotator_client, project_with_max_annotations_2, annotations, annotations_sequence,
        accuracy, is_labeled
):
    client = {
        'business': business_client,
        'annotator': annotator_client
    }
    task_id = next(iter(annotations.values()))['task']
    task = Task.objects.get(id=task_id)
    invite_client_to_project(annotator_client, task.project)

    for annotation_key, client_key in annotations_sequence:
        r = client[client_key].post(
            reverse('tasks:api:task-annotations', kwargs={'pk': task_id}), data=annotations[annotation_key])
        assert r.status_code == 201
    task = Task.objects.get(id=task_id)
    assert task.is_labeled == is_labeled


@pytest.mark.django_db
def test_accuracy_on_delete(business_client, project_with_max_annotations_2, annotations):
    task_id = next(iter(annotations.values()))['task']
    for annotation in annotations.values():
        business_client.post(reverse('tasks:api:task-annotations', kwargs={'pk': task_id}), data=annotation)

    task = Task.objects.get(id=task_id)
    assert task.annotations.count() == len(annotations)
    assert task.is_labeled
    annotation_ids = [c.id for c in task.annotations.all()]
    r = business_client.delete(reverse('tasks:api-annotations:annotation-detail', kwargs={'pk': annotation_ids[0]}))
    assert r.status_code == 204
    task = Task.objects.get(id=task_id)
    assert task.is_labeled  # project.max_annotations = 2

    r = business_client.delete(reverse('tasks:api-annotations:annotation-detail', kwargs={'pk': annotation_ids[1]}))
    assert r.status_code == 204
    task = Task.objects.get(id=task_id)
    assert not task.is_labeled

    r = business_client.delete(reverse('tasks:api-annotations:annotation-detail', kwargs={'pk': annotation_ids[2]}))
    assert r.status_code == 204
    task = Task.objects.get(id=task_id)
    assert not task.is_labeled


# @pytest.mark.django_db
# def test_accuracy_on_delete(business_client, project_with_max_annotations_2, annotations):
#     task_id = next(iter(annotations.values()))['task']
#     for annotation in annotations.values():
#         business_client.post(reverse('tasks:api:task-annotations', kwargs={'pk': task_id}), data=annotation)
#
#     task = Task.objects.get(id=task_id)
#     assert task.annotations.count() == len(annotations)
#     if apps.is_installed('businesses'):
#         assert math.fabs(task.accuracy - 1 / 3) < 0.00001
#     assert task.is_labeled
#     annotation_ids = [c.id for c in task.annotations.all()]
#     r = business_client.delete(reverse('tasks:api-annotations:annotation-detail', kwargs={'pk': annotation_ids[0]}))
#     assert r.status_code == 204
#     task = Task.objects.get(id=task_id)
#     if apps.is_installed('businesses'):
#         assert task.accuracy == 0.5
#     assert task.is_labeled  # project.max_annotations = 2
#
#     r = business_client.delete(reverse('tasks:api-annotations:annotation-detail', kwargs={'pk': annotation_ids[1]}))
#     assert r.status_code == 204
#     task = Task.objects.get(id=task_id)
#     if apps.is_installed('businesses'):
#         assert task.accuracy == 1.0
#     assert not task.is_labeled
#
#     r = business_client.delete(reverse('tasks:api-annotations:annotation-detail', kwargs={'pk': annotation_ids[2]}))
#     assert r.status_code == 204
#     task = Task.objects.get(id=task_id)
#     if apps.is_installed('businesses'):
#         assert task.accuracy is None
#     assert not task.is_labeled
