"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json

import pytest
from data_import.models import FileUpload
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils.timezone import now
from projects.models import Project

from ..utils import make_annotation, make_annotator, make_prediction, make_task, project_id  # noqa


@pytest.mark.parametrize(
    'ordering, element_index, undefined',
    [
        [['tasks:id'], 0, False],  # ordered by id ascending, first element api == first created
        [['tasks:-id'], -1, False],  # ordered by id descending, first element api == last created
        [['tasks:completed_at'], 0, False],
        [['tasks:-completed_at'], 0, False],  # only one task is labeled
        [['tasks:total_annotations'], -1, False],
        [['tasks:-total_annotations'], 0, False],
        [['tasks:total_predictions'], 0, False],
        [['tasks:-total_predictions'], -1, False],
        [['tasks:cancelled_annotations'], 0, False],
        [['tasks:-cancelled_annotations'], -1, False],
        [['tasks:annotations_results'], 0, False],
        [['tasks:-annotations_results'], -1, False],
        [['tasks:predictions_results'], 0, False],
        [['tasks:-predictions_results'], -1, False],
        [['tasks:predictions_score'], 0, False],
        [['tasks:-predictions_score'], -1, False],
        [['tasks:data.text'], 0, False],
        [['tasks:-data.text'], -1, False],
        [['tasks:data.data'], 0, True],
        [['-tasks:data.data'], 1, True],
        [['tasks:file_upload'], 0, False],
        [['-tasks:file_upload'], 1, False],
    ],
)
@pytest.mark.django_db
def test_views_ordering(ordering, element_index, undefined, business_client, project_id):

    payload = dict(
        project=project_id,
        data={'test': 1, 'ordering': ordering},
    )
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(payload),
        content_type='application/json',
    )

    assert response.status_code == 201, response.content
    view_id = response.json()['id']

    project = Project.objects.get(pk=project_id)

    if undefined:
        task_field_name = settings.DATA_UNDEFINED_NAME
    else:
        task_field_name = 'text'

    file_upload1 = FileUpload.objects.create(
        user=project.created_by, project=project, file=ContentFile('', name='file_upload1')
    )

    task_id_1 = make_task({'data': {task_field_name: 1}, 'file_upload': file_upload1}, project).id
    make_annotation({'result': [{'1': True}]}, task_id_1)
    make_prediction({'result': [{'1': True}], 'score': 1}, task_id_1)

    file_upload2 = FileUpload.objects.create(
        user=project.created_by, project=project, file=ContentFile('', name='file_upload2')
    )
    task_id_2 = make_task({'data': {task_field_name: 2}, 'file_upload': file_upload2}, project).id
    for _ in range(0, 2):
        make_annotation({'result': [{'2': True}], 'was_cancelled': True}, task_id_2)
    for _ in range(0, 2):
        make_prediction({'result': [{'2': True}], 'score': 2}, task_id_2)

    task_ids = [task_id_1, task_id_2]

    response = business_client.get(f'/api/tasks?view={view_id}')
    response_data = response.json()

    assert response_data['tasks'][0]['id'] == task_ids[element_index]


@pytest.mark.parametrize(
    'filters, ids',
    [
        [
            {
                'conjunction': 'or',
                'items': [{'filter': 'filter:tasks:id', 'operator': 'equal', 'value': 1, 'type': 'Number'}],
            },
            [1],
        ],
        [
            {
                'conjunction': 'or',
                'items': [
                    {'filter': 'filter:tasks:id', 'operator': 'equal', 'value': 1, 'type': 'Number'},
                    {'filter': 'filter:tasks:id', 'operator': 'equal', 'value': 2, 'type': 'Number'},
                ],
            },
            [1, 2],
        ],
        [
            {
                'conjunction': 'or',
                'items': [
                    {'filter': 'filter:tasks:id', 'operator': 'not_equal', 'value': 1, 'type': 'Number'},
                    {'filter': 'filter:tasks:id', 'operator': 'greater', 'value': 3, 'type': 'Number'},
                ],
            },
            [2, 3, 4],
        ],
        [
            {
                'conjunction': 'or',
                'items': [{'filter': 'filter:tasks:id', 'operator': 'not_equal', 'value': 1, 'type': 'Number'}],
            },
            [2, 3, 4],
        ],
        [
            {
                'conjunction': 'or',
                'items': [{'filter': 'filter:tasks:id', 'operator': 'less', 'value': 3, 'type': 'Number'}],
            },
            [1, 2],
        ],
        [
            {
                'conjunction': 'or',
                'items': [{'filter': 'filter:tasks:id', 'operator': 'greater', 'value': 2, 'type': 'Number'}],
            },
            [3, 4],
        ],
        [
            {
                'conjunction': 'or',
                'items': [{'filter': 'filter:tasks:id', 'operator': 'less_or_equal', 'value': 3, 'type': 'Number'}],
            },
            [1, 2, 3],
        ],
        [
            {
                'conjunction': 'or',
                'items': [{'filter': 'filter:tasks:id', 'operator': 'greater_or_equal', 'value': 2, 'type': 'Number'}],
            },
            [2, 3, 4],
        ],
        [
            {
                'conjunction': 'or',
                'items': [
                    {'filter': 'filter:tasks:id', 'operator': 'in', 'value': {'min': 2, 'max': 3}, 'type': 'Number'}
                ],
            },
            [2, 3],
        ],
        [
            {
                'conjunction': 'or',
                'items': [
                    {
                        'filter': 'filter:tasks:id',
                        'operator': 'not_in',
                        'value': {'min': 2, 'max': 3},
                        'type': 'Number',
                    }
                ],
            },
            [1, 4],
        ],
        [
            {
                'conjunction': 'or',
                'items': [
                    {
                        'filter': 'filter:tasks:completed_at',
                        'operator': 'less',
                        'type': 'Datetime',
                        'value': now().strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
                    }
                ],
            },
            [],
        ],
        [
            {
                'conjunction': 'or',
                'items': [
                    {
                        'filter': 'filter:tasks:completed_at',
                        'operator': 'greater',
                        'type': 'Datetime',
                        'value': now().strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
                    }
                ],
            },
            [1],  # only first task is labeled, second one is skipped
        ],
        [
            {
                'conjunction': 'or',
                'items': [
                    {
                        'filter': 'filter:tasks:completed_at',
                        'operator': 'empty',
                        'type': 'Datetime',
                        'value': 'True',
                    }
                ],
            },
            [2, 3, 4],
        ],
        [
            {
                'conjunction': 'or',
                'items': [
                    {
                        'filter': 'filter:tasks:completed_at',
                        'operator': 'empty',
                        'type': 'Datetime',
                        'value': 'False',
                    }
                ],
            },
            [1],
        ],
        [
            {
                'conjunction': 'or',
                'items': [
                    {
                        'filter': 'filter:tasks:annotations_results',
                        'operator': 'contains',
                        'type': 'String',
                        'value': 'first',
                    }
                ],
            },
            [
                1,
            ],
        ],
        [
            {
                'conjunction': 'or',
                'items': [
                    {
                        'filter': 'filter:tasks:data.data',
                        'operator': 'contains',
                        'type': 'String',
                        'value': 'text1',
                    }
                ],
            },
            [
                1,
            ],
        ],
        [
            {
                'conjunction': 'and',
                'items': [
                    {
                        'filter': 'filter:tasks:data.data',  # undefined column test
                        'operator': 'contains',
                        'type': 'String',
                        'value': 'text',
                    },
                    {'filter': 'filter:tasks:id', 'operator': 'equal', 'value': 1, 'type': 'Number'},
                ],
            },
            [
                1,
            ],
        ],
        [
            {
                'conjunction': 'or',
                'items': [
                    {
                        'filter': 'filter:tasks:annotations_results',
                        'operator': 'not_contains',
                        'type': 'String',
                        'value': 'first',
                    }
                ],
            },
            [2, 3, 4],
        ],
        [
            {
                'conjunction': 'and',
                'items': [
                    {'filter': 'filter:tasks:annotators', 'operator': 'contains', 'value': '$ANN1_ID', 'type': 'List'},
                    {'filter': 'filter:tasks:annotators', 'operator': 'contains', 'value': '$ANN2_ID', 'type': 'List'},
                ],
            },
            [2],
        ],
    ],
)
@pytest.mark.django_db
def test_views_filters(filters, ids, business_client, project_id):
    project = Project.objects.get(pk=project_id)
    ann1 = make_annotator({'email': 'ann1@testheartex.com'}, project)
    ann2 = make_annotator({'email': 'ann2@testheartex.com'}, project)

    ann_ids = {
        '$ANN1_ID': ann1.id,
        '$ANN2_ID': ann2.id,
    }
    for item in filters['items']:
        for ann_id_key, ann_id_value in ann_ids.items():
            if isinstance(item['value'], str) and ann_id_key in item['value']:
                item['value'] = ann_id_value

    payload = dict(
        project=project_id,
        data={'test': 1, 'filters': filters},
    )
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(payload),
        content_type='application/json',
    )

    assert response.status_code == 201, response.content
    view_id = response.json()['id']

    task_data_field_name = settings.DATA_UNDEFINED_NAME

    task_id_1 = make_task({'data': {task_data_field_name: 'some text1'}}, project).id
    make_annotation(
        {'result': [{'from_name': '1_first', 'to_name': '', 'value': {}}], 'completed_by': ann1}, task_id_1
    )
    make_prediction({'result': [{'from_name': '1_first', 'to_name': '', 'value': {}}], 'score': 1}, task_id_1)

    task_id_2 = make_task({'data': {task_data_field_name: 'some text2'}}, project).id
    for ann in (ann1, ann2):
        make_annotation(
            {
                'result': [{'from_name': '2_second', 'to_name': '', 'value': {}}],
                'was_cancelled': True,
                'completed_by': ann,
            },
            task_id_2,
        )
    for _ in range(0, 2):
        make_prediction({'result': [{'from_name': '2_second', 'to_name': '', 'value': {}}], 'score': 2}, task_id_2)

    task_ids = [0, task_id_1, task_id_2]

    for _ in range(0, 2):
        task_id = make_task({'data': {task_data_field_name: 'some text_'}}, project).id
        task_ids.append(task_id)

    for item in filters['items']:
        if item['type'] == 'Number':
            if isinstance(item['value'], dict):
                item['value']['min'] = task_ids[int(item['value']['min'])]
                item['value']['max'] = task_ids[int(item['value']['max'])]
            else:
                item['value'] = task_ids[int(item['value'])]

    dict(
        data={'filters': filters},
    )
    response = business_client.patch(
        f'/api/dm/views/{view_id}',
        data=json.dumps(payload),
        content_type='application/json',
    )

    response = business_client.get(f'/api/tasks/?view={view_id}')
    response_data = response.json()

    assert 'tasks' in response_data, response_data

    response_ids = [task['id'] for task in response_data['tasks']]
    correct_ids = [task_ids[i] for i in ids]
    assert response_ids == correct_ids, (response_ids, correct_ids, filters)
