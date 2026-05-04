import json

import pytest
import requests_mock
from tasks.models import Task

pytestmark = pytest.mark.django_db


def _hf_rows_payload(rows):
    return {
        'features': [
            {'feature_idx': 0, 'name': 'meta_info', 'type': {'dtype': 'string', '_type': 'Value'}},
            {'feature_idx': 1, 'name': 'text', 'type': {'dtype': 'string', '_type': 'Value'}},
        ],
        'rows': rows,
        'num_rows_total': len(rows),
        'num_rows_per_page': len(rows),
        'partial': False,
    }


def _set_hf_token(user, token):
    user.huggingface_token = token
    user.save(update_fields=['huggingface_token'])


def test_huggingface_import_preview_does_not_create_tasks(configured_project, business_client):
    initial_count = Task.objects.filter(project=configured_project).count()
    _set_hf_token(business_client.user, 'hf_test_token')

    with requests_mock.Mocker() as m:
        m.get(
            'https://datasets-server.huggingface.co/rows',
            json=_hf_rows_payload(
                [
                    {'row_idx': 10, 'row': {'meta_info': 'hf meta A', 'text': 'hf text A'}, 'truncated_cells': []},
                    {'row_idx': 11, 'row': {'meta_info': 'hf meta B', 'text': 'hf text B'}, 'truncated_cells': []},
                ]
            ),
        )
        response = business_client.post(
            f'/api/projects/{configured_project.id}/import/huggingface?commit_to_project=false',
            data=json.dumps(
                {
                    'dataset': 'org/private-dataset',
                    'config': 'default',
                    'split': 'train',
                    'offset': 10,
                    'limit': 2,
                }
            ),
            content_type='application/json',
        )

    assert response.status_code == 201
    assert response.json()['task_count'] == 2
    assert response.json()['data_columns'] == ['meta_info', 'text']
    assert Task.objects.filter(project=configured_project).count() == initial_count
    assert m.request_history[0].headers['Authorization'] == 'Bearer hf_test_token'
    assert 'hf_test_token' not in response.content.decode()


def test_huggingface_import_creates_tasks(configured_project, business_client, monkeypatch):
    monkeypatch.setattr('data_import.api.validate_task_import', lambda organization, task_count: None)
    monkeypatch.setattr('data_import.api.emit_webhooks_for_instance', lambda *args, **kwargs: None)
    _set_hf_token(business_client.user, 'hf_test_token')

    with requests_mock.Mocker() as m:
        m.get(
            'https://datasets-server.huggingface.co/rows',
            json=_hf_rows_payload(
                [
                    {'row_idx': 0, 'row': {'meta_info': 'hf meta A', 'text': 'hf text A'}, 'truncated_cells': []},
                    {'row_idx': 1, 'row': {'meta_info': 'hf meta B', 'text': 'hf text B'}, 'truncated_cells': []},
                ]
            ),
        )
        response = business_client.post(
            f'/api/projects/{configured_project.id}/import/huggingface?return_task_ids=true',
            data=json.dumps(
                {
                    'dataset': 'org/private-dataset',
                    'config': 'default',
                    'split': 'train',
                    'limit': 2,
                }
            ),
            content_type='application/json',
        )

    assert response.status_code == 201
    payload = response.json()
    assert payload['task_count'] == 2
    assert len(payload['task_ids']) == 2

    imported_tasks = Task.objects.filter(id__in=payload['task_ids']).order_by('inner_id')
    assert [task.data['text'] for task in imported_tasks] == ['hf text A', 'hf text B']
    assert imported_tasks[0].meta['huggingface']['dataset'] == 'org/private-dataset'
    assert imported_tasks[0].import_source == 'huggingface'
    assert imported_tasks[0].import_tags == ['hf:org/private-dataset', 'hf:default:train']


def test_huggingface_import_normalizes_media_cells(configured_project, business_client, monkeypatch):
    monkeypatch.setattr('data_import.api.validate_task_import', lambda organization, task_count: None)
    monkeypatch.setattr('data_import.api.emit_webhooks_for_instance', lambda *args, **kwargs: None)
    _set_hf_token(business_client.user, 'hf_test_token')

    with requests_mock.Mocker() as m:
        m.get(
            'https://datasets-server.huggingface.co/rows',
            json={
                'features': [{'feature_idx': 0, 'name': 'image', 'type': {'_type': 'Image'}}],
                'rows': [
                    {
                        'row_idx': 0,
                        'row': {
                            'meta_info': 'hf meta',
                            'text': 'hf text',
                            'image': {'src': 'https://example.com/image.jpg', 'height': 32, 'width': 32},
                        },
                        'truncated_cells': [],
                    }
                ],
                'num_rows_total': 1,
                'num_rows_per_page': 1,
                'partial': False,
            },
        )
        response = business_client.post(
            f'/api/projects/{configured_project.id}/import/huggingface?return_task_ids=true',
            data=json.dumps(
                {
                    'dataset': 'org/images',
                    'config': 'default',
                    'split': 'train',
                    'limit': 1,
                }
            ),
            content_type='application/json',
        )

    assert response.status_code == 201
    task = Task.objects.get(id=response.json()['task_ids'][0])
    assert task.data['image'] == 'https://example.com/image.jpg'


def test_huggingface_import_requires_account_token(configured_project, business_client):
    _set_hf_token(business_client.user, '')

    response = business_client.post(
        f'/api/projects/{configured_project.id}/import/huggingface?commit_to_project=false',
        data=json.dumps(
            {
                'dataset': 'org/private-dataset',
                'config': 'default',
                'split': 'train',
                'offset': 0,
                'limit': 1,
            }
        ),
        content_type='application/json',
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload['code'] == 'huggingface_token_not_configured'
    assert payload['settings_url'] == '/user/account#huggingface-token'
