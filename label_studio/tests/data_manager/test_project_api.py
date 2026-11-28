"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import json

import pytest
from rest_framework import status

from ..utils import project_id  # noqa

pytestmark = pytest.mark.django_db


def test_dm_project_returns_200(business_client, project_id):
    """
    Regression: GET /api/dm/project?project={id} must return 200.

    Previously, ProjectSerializer was instantiated without context in
    data_manager/api.py, causing KeyError in the user_id property when
    queue_total / queue_done SerializerMethodFields were evaluated
    during serialization.
    """
    response = business_client.get(f'/api/dm/project?project={project_id}')

    assert response.status_code == status.HTTP_200_OK, response.content


def test_dm_project_includes_queue_fields(business_client, project_id):
    """Response must include queue_total and queue_done computed against the request user."""
    response = business_client.get(f'/api/dm/project?project={project_id}')

    assert response.status_code == status.HTTP_200_OK, response.content
    data = response.json()
    assert 'queue_total' in data
    assert 'queue_done' in data
    assert isinstance(data['queue_total'], int)
    assert isinstance(data['queue_done'], int)


def test_dm_project_on_freshly_created_project(business_client):
    """
    Same regression, but exercised against a freshly created empty project
    to ensure the fix holds regardless of pre-existing tasks/annotations.
    """
    r = business_client.post(
        '/api/projects/',
        data=json.dumps(dict(title='test_dm_project_regression')),
        content_type='application/json',
    )
    assert r.status_code == 201, r.content
    new_project_id = r.json()['id']

    response = business_client.get(f'/api/dm/project?project={new_project_id}')

    assert response.status_code == status.HTTP_200_OK, response.content
    data = response.json()
    assert data['queue_total'] == 0
    assert data['queue_done'] == 0


def test_dm_project_returns_404_for_missing_project(business_client):
    """Unknown project id should return 404, not 500."""
    response = business_client.get('/api/dm/project?project=999999')

    assert response.status_code == status.HTTP_404_NOT_FOUND, response.content


def test_dm_project_null_creator_returns_200(business_client):
    """
    Regression: GET /api/dm/project returns HTTP 500 when project.created_by is None.

    Root cause: ProjectSerializer was called without context. The user_id property
    fell back to context['user_cache'], which is populated as a side-effect of
    serializing the created_by field via UserSimpleSerializer. When created_by is
    None, DRF skips UserSimpleSerializer entirely, user_cache is never set, and
    user_id raises KeyError: 'user_cache'.

    Fix: pass context={'request': request} so user_id resolves from the request directly.
    """
    from projects.models import Project

    r = business_client.post(
        '/api/projects/',
        data=json.dumps(dict(title='test_null_creator')),
        content_type='application/json',
    )
    assert r.status_code == 201, r.content
    project_id = r.json()['id']

    Project.objects.filter(pk=project_id).update(created_by=None)

    response = business_client.get(f'/api/dm/project?project={project_id}')

    assert response.status_code == status.HTTP_200_OK, response.content
    data = response.json()
    assert isinstance(data['queue_total'], int)
    assert isinstance(data['queue_done'], int)
