"""Tests for data_import API (FileUploadListAPI)."""

import json

import pytest
from data_import.models import FileUpload
from django.core.files.base import ContentFile
from projects.models import Project


@pytest.mark.django_db
def test_file_upload_list_empty_ids_returns_empty_for_non_draft_project(business_client):
    """GET file-uploads with ids=[] and non-draft project returns empty list (reopened import modal)."""
    # Create project and ensure it is not draft
    r = business_client.post(
        '/api/projects/',
        data=json.dumps({'title': 'Test', 'label_config': '<View></View>'}),
        content_type='application/json',
    )
    assert r.status_code == 201
    project_id = r.json()['id']
    project = Project.objects.get(id=project_id)
    project.is_draft = False
    project.save(update_fields=['is_draft'])

    # Create a file upload that would appear if we returned "all"
    FileUpload.objects.create(
        user=business_client.admin,
        project=project,
        file=ContentFile(b'x', name='upload/test.txt'),
    )

    # Request with explicit empty ids: must return empty list (no previously imported files)
    r = business_client.get(
        f'/api/projects/{project_id}/file-uploads',
        data={'ids': '[]'},
    )
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.django_db
def test_file_upload_list_get_sends_cache_control_no_store(business_client):
    """GET file-uploads response includes Cache-Control: no-store so list is not cached."""
    r = business_client.post(
        '/api/projects/',
        data=json.dumps({'title': 'Test', 'label_config': '<View></View>'}),
        content_type='application/json',
    )
    assert r.status_code == 201
    project_id = r.json()['id']
    project = Project.objects.get(id=project_id)
    project.is_draft = False
    project.save(update_fields=['is_draft'])

    r = business_client.get(
        f'/api/projects/{project_id}/file-uploads',
        data={'ids': '[]'},
    )
    assert r.status_code == 200
    assert r.get('Cache-Control') == 'no-store'
