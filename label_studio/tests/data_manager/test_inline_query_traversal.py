"""Inline `?query=` must enforce the same FK-traversal policy as the saved-View path.

Regression tests for the incomplete fix of CVE-2023-47117 (#5012): FilterSerializer
guards persisted Views only, inline filters/ordering reached the ORM unchecked.
"""

import json
from urllib.parse import quote

import pytest
from projects.models import Project
from rest_framework.exceptions import ValidationError as DRFValidationError

from ..utils import make_task, project_id  # noqa

EXPLOIT_COLUMN = 'project__organization__created_by__password'
ALLOWLISTED_COLUMN = 'updated_by__active_organization'


def _get_tasks(business_client, project_id, query):
    return business_client.get(f'/api/tasks?project={project_id}&query={quote(json.dumps(query))}')


@pytest.mark.django_db
def test_inline_query_filter_fk_traversal_blocked(business_client, project_id):
    project = Project.objects.get(pk=project_id)
    make_task({'data': {'text': 'hello'}}, project)

    query = {
        'filters': {
            'conjunction': 'and',
            'items': [
                {
                    'filter': f'filter:tasks:{EXPLOIT_COLUMN}',
                    'operator': 'regex',
                    'type': 'String',
                    'value': '^pbkdf2',
                }
            ],
        }
    }
    response = _get_tasks(business_client, project_id, query)
    assert response.status_code == 400, response.content


@pytest.mark.django_db
def test_inline_query_child_filter_fk_traversal_blocked(business_client, project_id):
    project = Project.objects.get(pk=project_id)
    make_task({'data': {'text': 'hello'}}, project)

    query = {
        'filters': {
            'conjunction': 'and',
            'items': [
                {
                    'filter': 'filter:tasks:total_annotations',
                    'operator': 'equal',
                    'type': 'Number',
                    'value': 0,
                    'child_filters': [
                        {
                            'filter': f'filter:tasks:{EXPLOIT_COLUMN}',
                            'operator': 'regex',
                            'type': 'String',
                            'value': '^pbkdf2',
                        }
                    ],
                }
            ],
        }
    }
    response = _get_tasks(business_client, project_id, query)
    assert response.status_code == 400, response.content


@pytest.mark.django_db
def test_inline_query_ordering_fk_traversal_blocked(business_client, project_id):
    project = Project.objects.get(pk=project_id)
    make_task({'data': {'text': 'hello'}}, project)

    for ordering in ([f'tasks:{EXPLOIT_COLUMN}'], [f'-tasks:{EXPLOIT_COLUMN}'], [EXPLOIT_COLUMN]):
        response = _get_tasks(business_client, project_id, {'ordering': ordering})
        assert response.status_code == 400, (ordering, response.content)


@pytest.mark.django_db
def test_inline_query_post_body_fk_traversal_blocked(business_client, project_id):
    """Filters from the request body (POST) take the same unvalidated path."""
    project = Project.objects.get(pk=project_id)
    make_task({'data': {'text': 'hello'}}, project)

    response = business_client.post(
        f'/api/tasks?project={project_id}',
        data=json.dumps(
            {
                'filters': {
                    'conjunction': 'and',
                    'items': [
                        {
                            'filter': f'filter:tasks:{EXPLOIT_COLUMN}',
                            'operator': 'regex',
                            'type': 'String',
                            'value': '^pbkdf2',
                        }
                    ],
                }
            }
        ),
        content_type='application/json',
    )
    assert response.status_code == 400, response.content


@pytest.mark.django_db
def test_inline_query_allowlisted_and_data_field_still_work(business_client, project_id):
    project = Project.objects.get(pk=project_id)
    make_task({'data': {'text': 'hello'}}, project)

    # allowlisted FK filter (DATA_MANAGER_FILTER_ALLOWLIST default)
    query = {
        'filters': {
            'conjunction': 'and',
            'items': [
                {
                    'filter': f'filter:tasks:{ALLOWLISTED_COLUMN}',
                    'operator': 'empty',
                    'type': 'String',
                    'value': 'false',
                }
            ],
        }
    }
    response = _get_tasks(business_client, project_id, query)
    assert response.status_code == 200, response.content

    # data.* JSON field with dunder suffixes stays allowed
    query = {
        'filters': {
            'conjunction': 'and',
            'items': [
                {'filter': 'filter:tasks:data.text', 'operator': 'contains', 'type': 'String', 'value': 'hello'}
            ],
        },
        'ordering': ['-tasks:data.text'],
    }
    response = _get_tasks(business_client, project_id, query)
    assert response.status_code == 200, response.content
    assert response.json()['total'] == 1


@pytest.mark.django_db
def test_inline_query_normal_filter_and_ordering_still_work(business_client, project_id):
    project = Project.objects.get(pk=project_id)
    make_task({'data': {'text': 'hello'}}, project)

    query = {
        'filters': {
            'conjunction': 'and',
            'items': [{'filter': 'filter:tasks:id', 'operator': 'greater', 'type': 'Number', 'value': 0}],
        },
        'ordering': ['-tasks:id'],
    }
    response = _get_tasks(business_client, project_id, query)
    assert response.status_code == 200, response.content
    assert response.json()['total'] == 1


@pytest.mark.django_db
def test_legacy_stored_view_with_traversal_blocked(business_client, project_id):
    """Views persisted before CVE-2023-47117 may hold `__` columns; execution must fail closed."""
    from data_manager.models import Filter, FilterGroup, View

    project = Project.objects.get(pk=project_id)
    make_task({'data': {'text': 'hello'}}, project)

    filter_obj = Filter.objects.create(
        column=f'filter:tasks:{EXPLOIT_COLUMN}',
        operator='regex',
        type='String',
        value='^pbkdf2',
    )
    group = FilterGroup.objects.create(conjunction='and')
    group.filters.add(filter_obj)
    view = View.objects.create(project=project, filter_group=group)

    response = business_client.get(f'/api/tasks?view={view.id}')
    assert response.status_code == 400, response.content


@pytest.mark.django_db
def test_prepare_params_pydantic_level_validation(settings):
    from data_manager.prepare_params import Filter, PrepareParams

    with pytest.raises(DRFValidationError):
        Filter(filter=f'filter:tasks:{EXPLOIT_COLUMN}', operator='regex', type='String', value='^a')

    with pytest.raises(DRFValidationError):
        PrepareParams(project=1, ordering=[f'-tasks:{EXPLOIT_COLUMN}'])

    ok_filter = Filter(filter='filter:tasks:id', operator='equal', type='Number', value=1)
    ok_filter.child_filters = [
        Filter(filter=f'filter:tasks:{ALLOWLISTED_COLUMN}', operator='empty', type='String', value='true')
    ]
    PrepareParams(project=1, ordering=['tasks:id'], filters=None)
    assert ok_filter.filter == 'filter:tasks:id'


@pytest.mark.django_db
@pytest.mark.parametrize(
    'ignored_column',
    [
        'ignored__relation',
        'filter:annotations:foo__bar',
        # descending marker in front of the prefix: apply_filters() drops this too
        f'-filter:tasks:{EXPLOIT_COLUMN}',
    ],
)
def test_inline_query_filter_not_reaching_orm_stays_ignored(business_client, project_id, ignored_column):
    """Names apply_filters() drops before the ORM must stay ignored, not 400'd."""
    project = Project.objects.get(pk=project_id)
    make_task({'data': {'text': 'hello'}}, project)

    query = {
        'filters': {
            'conjunction': 'and',
            'items': [{'filter': ignored_column, 'operator': 'regex', 'type': 'String', 'value': '^pbkdf2'}],
        }
    }
    response = _get_tasks(business_client, project_id, query)
    assert response.status_code == 200, response.content
    # the ignored filter must not narrow the selection either
    assert response.json()['total'] == 1
