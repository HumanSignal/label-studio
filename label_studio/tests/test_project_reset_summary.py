import json

import pytest
from tasks.models import Task
from tests.conftest import project_choices
from tests.utils import make_project

pytestmark = pytest.mark.django_db


def test_reset_summary_empty_project(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    s = project.summary

    for field in ['created_labels', 'created_labels_drafts', 'created_annotations']:
        setattr(s, field, {'garbled': field})
    s.save()

    r = business_client.post(f'/api/projects/{project.id}/summary/reset')
    assert r.status_code == 200

    s.refresh_from_db()
    for field in ['created_labels', 'created_labels_drafts', 'created_annotations']:
        assert getattr(s, field) == {}


def test_reset_summary_project_has_drafts(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)

    r = business_client.post(
        f'/api/projects/{project.id}/import',
        data=json.dumps({'data': {'image': 'kittens.jpg'}}),
        content_type='application/json',
    )
    assert r.status_code == 201
    task = Task.objects.filter(project=project).first()
    assert task

    s = project.summary
    r = business_client.post(
        f'/api/tasks/{task.id}/drafts',
        data=json.dumps(
            {'result': [{'from_name': 'some', 'to_name': 'x', 'type': 'none', 'value': {'none': ['Opossum']}}]}
        ),
        content_type='application/json',
    )
    assert r.status_code == 201

    for field in ['created_labels', 'created_labels_drafts', 'created_annotations']:
        setattr(s, field, {'garbled': field})
    s.save()

    r = business_client.post(f'/api/projects/{project.id}/summary/reset')
    assert r.status_code == 200

    s.refresh_from_db()
    for field in ['created_labels', 'created_annotations']:
        assert getattr(s, field) == {}

    assert s.created_labels_drafts == {'some': {'Opossum': 1}}


def test_reset_summary_project_has_annotations(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)

    r = business_client.post(
        f'/api/projects/{project.id}/import',
        data=json.dumps({'data': {'image': 'kittens.jpg'}}),
        content_type='application/json',
    )
    assert r.status_code == 201
    task = Task.objects.filter(project=project).first()
    assert task

    s = project.summary
    r = business_client.post(
        f'/api/tasks/{task.id}/annotations',
        data=json.dumps(
            {'result': [{'from_name': 'some', 'to_name': 'x', 'type': 'none', 'value': {'none': ['Opossum']}}]}
        ),
        content_type='application/json',
    )
    assert r.status_code == 201

    for field in ['created_labels', 'created_labels_drafts', 'created_annotations']:
        setattr(s, field, {'garbled': field})
    s.save()

    r = business_client.post(f'/api/projects/{project.id}/summary/reset')
    assert r.status_code == 200

    s.refresh_from_db()
    assert s.created_labels_drafts == {}
    assert s.created_annotations == {'some|x|none': 1}
    assert s.created_labels == {'some': {'Opossum': 1}}


def test_delete_tasks_and_annotations_clears_created_drafts_annotations_and_labels(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)

    r = business_client.post(
        f'/api/projects/{project.id}/import',
        data=json.dumps({'data': {'image': 'kittens.jpg'}}),
        content_type='application/json',
    )
    assert r.status_code == 201
    task = Task.objects.filter(project=project).first()
    assert task

    s = project.summary

    r = business_client.post(
        f'/api/tasks/{task.id}/drafts',
        data=json.dumps(
            {'result': [{'from_name': 'some', 'to_name': 'x', 'type': 'none', 'value': {'none': ['Mouse']}}]}
        ),
        content_type='application/json',
    )
    assert r.status_code == 201
    r = business_client.post(
        f'/api/tasks/{task.id}/annotations',
        data=json.dumps(
            {'result': [{'from_name': 'some', 'to_name': 'x', 'type': 'none', 'value': {'none': ['Opossum']}}]}
        ),
        content_type='application/json',
    )
    assert r.status_code == 201

    for field in ['created_labels', 'created_labels_drafts', 'created_annotations']:
        setattr(s, field, {'garbled': field})
    s.save()

    r = business_client.post(f'/api/dm/actions?id=delete_tasks_annotations&project={project.id}')
    assert r.status_code == 200

    s.refresh_from_db()
    for field in ['created_labels', 'created_labels_drafts', 'created_annotations']:
        assert getattr(s, field) == {}


def test_logged_out_user_cannot_reset_summary(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    r = business_client.get('/logout')
    assert r.status_code == 302
    r = business_client.post(f'/api/projects/{project.id}/summary/reset')
    assert r.status_code == 401
    assert 'detail' in (r_json := r.json())
    assert r_json['detail'] == 'Authentication credentials were not provided.'
