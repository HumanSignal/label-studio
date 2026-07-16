from types import SimpleNamespace
from unittest.mock import Mock, call, patch

import pytest
from data_manager.actions.data_columns import (
    _can_stage_column_mutation,
    _json_value,
    _reconstruct_mutation_queryset,
    _serialize_mutation_scope,
    _set_data_value,
    add_data_field,
    add_data_field_form,
    add_expression,
)
from data_manager.actions.experimental import propagate_annotations
from data_manager.managers import PreparedTaskManager
from data_manager.prepare_params import PrepareParams
from django.db.models.functions import Cast, Coalesce
from django.test import override_settings
from projects.models import Project
from rest_framework.exceptions import PermissionDenied, ValidationError
from tasks.models import Annotation, Task


class RequestStub:
    def __init__(self, user, data=None):
        self.user = user
        self.data = data or {}


@pytest.mark.django_db
def test_propagate_annotations_updates_project_summary(business_client):
    project = Project.objects.create(title='Propagated annotations', created_by=business_client.user)
    source_task = Task.objects.create(project=project, data={'text': 'Source task'})
    target_task = Task.objects.create(project=project, data={'text': 'Target task'})
    source_annotation = Annotation.objects.create(
        task=source_task,
        project=project,
        completed_by=business_client.user,
        result=[
            {
                'from_name': 'label',
                'to_name': 'text',
                'type': 'choices',
                'value': {'choices': ['pos']},
            }
        ],
    )
    project.summary.created_labels = {}
    project.summary.save(update_fields=['created_labels'])

    response = propagate_annotations(
        project,
        Task.objects.filter(id__in=[source_task.id, target_task.id]),
        request=RequestStub(business_client.user, {'source_annotation_id': source_annotation.id}),
    )

    assert response['response_code'] == 200
    propagated_annotation = Annotation.objects.get(parent_annotation=source_annotation)
    assert propagated_annotation.result == source_annotation.result

    target_task.refresh_from_db()
    assert target_task.updated_by == business_client.user

    project.summary.refresh_from_db()
    assert project.summary.created_labels == {'label': {'pos': 1}}


@pytest.mark.django_db
@patch('data_manager.actions.data_columns.flag_set', return_value=True)
def test_add_column_sets_null_on_unselected_tasks(mock_flag_set, business_client):
    """Adding a column writes the selected value and initializes every other task with null."""
    project = Project.objects.create(title='Add column', created_by=business_client.user)
    selected_task = Task.objects.create(project=project, data={'text': 'Selected'})
    unselected_task = Task.objects.create(project=project, data={'text': 'Unselected'})

    response = add_data_field(
        project,
        Task.objects.filter(id=selected_task.id),
        request=RequestStub(
            business_client.user,
            {'column_mode': 'add', 'value_name': 'priority', 'value_type': 'String', 'value': 'high'},
        ),
    )

    selected_task.refresh_from_db()
    unselected_task.refresh_from_db()
    project.summary.refresh_from_db()

    assert response['column_operation'] == 'add'
    assert response['manual_refresh_required'] is True
    assert selected_task.data['priority'] == 'high'
    assert unselected_task.data['priority'] is None
    assert project.summary.all_data_columns['priority'] == 2
    assert 'priority' in project.summary.common_data_columns


@pytest.mark.django_db
@patch('data_manager.actions.data_columns.flag_set', return_value=True)
def test_update_column_leaves_unselected_tasks_unchanged(mock_flag_set, business_client):
    """Updating an existing column changes only the action selection."""
    project = Project.objects.create(title='Update column', created_by=business_client.user)
    selected_task = Task.objects.create(project=project, data={'priority': 'low'})
    unselected_task = Task.objects.create(project=project, data={'priority': 'medium'})
    project.summary.update_data_columns(project.tasks.all())

    response = add_data_field(
        project,
        Task.objects.filter(id=selected_task.id),
        request=RequestStub(
            business_client.user,
            {'column_mode': 'update', 'existing_column': 'priority', 'value_type': 'String', 'value': 'high'},
        ),
    )

    selected_task.refresh_from_db()
    unselected_task.refresh_from_db()

    assert selected_task.data['priority'] == 'high'
    assert unselected_task.data['priority'] == 'medium'
    assert response['column_operation'] == 'update'
    assert response['manual_refresh_required'] is True


@pytest.mark.django_db
@patch('data_manager.actions.data_columns.flag_set', return_value=True)
def test_update_column_does_not_clear_unselected_tasks_when_summary_is_stale(mock_flag_set, business_client):
    project = Project.objects.create(title='Stale column summary', created_by=business_client.user)
    selected_task = Task.objects.create(project=project, data={'priority': 'low'})
    unselected_task = Task.objects.create(project=project, data={'priority': 'medium'})
    project.summary.all_data_columns = {}
    project.summary.save(update_fields=['all_data_columns'])

    response = add_data_field(
        project,
        Task.objects.filter(id=selected_task.id),
        request=RequestStub(
            business_client.user,
            {'column_name': 'priority', 'value_type': 'String', 'value': 'high'},
        ),
    )

    selected_task.refresh_from_db()
    unselected_task.refresh_from_db()

    assert response['column_operation'] == 'update'
    assert selected_task.data['priority'] == 'high'
    assert unselected_task.data['priority'] == 'medium'


@override_settings(DJANGO_DB='postgres')
@patch('data_manager.actions.data_columns.Task.objects.filter')
@patch('data_manager.actions.data_columns.iterate_queryset')
def test_update_column_batches_jsonb_updates_in_existing_order(mock_iterate_queryset, mock_task_filter):
    """Existing-column updates retain the supplied queryset's ordering while limiting each PostgreSQL update to 100 IDs."""
    queryset = Mock()
    queryset.only.return_value = queryset
    tasks = [SimpleNamespace(id=index) for index in range(1, 202)]
    mock_iterate_queryset.return_value = tasks
    batch_queries = [
        Mock(update=Mock(return_value=100)),
        Mock(update=Mock(return_value=100)),
        Mock(update=Mock(return_value=1)),
    ]
    mock_task_filter.side_effect = batch_queries

    updated_count = _set_data_value(queryset, 'priority', 'high')

    assert updated_count == 201
    queryset.only.assert_called_once_with('id', 'project_id')
    assert isinstance(batch_queries[0].update.call_args.kwargs['data'].get_source_expressions()[0], Coalesce)
    assert mock_iterate_queryset.call_args == call(queryset, chunk_size=100)
    assert mock_task_filter.call_args_list == [
        call(id__in=list(range(1, 101))),
        call(id__in=list(range(101, 201))),
        call(id__in=[201]),
    ]


def test_null_column_value_is_encoded_as_json_null():
    """jsonb_set needs a JSON value, not a SQL NULL, to preserve the data document."""
    assert isinstance(_json_value(None), Cast)


@pytest.mark.django_db
@override_settings(ADD_OR_MODIFY_COLUMNS_ASYNC_THRESHOLD=100)
def test_column_mutation_stages_only_above_configured_task_threshold(business_client):
    project = Project.objects.create(title='Column threshold', created_by=business_client.user)
    Task.objects.bulk_create([Task(project=project, data={'text': str(index)}) for index in range(100)])

    assert _can_stage_column_mutation(project, project.tasks.all(), 'add') is False
    assert _can_stage_column_mutation(project, project.tasks.all(), 'update') is False

    Task.objects.create(project=project, data={'text': '100'})
    first_hundred = project.tasks.filter(id__in=project.tasks.order_by('id').values('id')[:100])

    # Adds always mutate every project task, while updates use the filtered/selected queryset.
    assert _can_stage_column_mutation(project, first_hundred, 'add') is True
    assert _can_stage_column_mutation(project, first_hundred, 'update') is False
    assert _can_stage_column_mutation(project, project.tasks.all(), 'update') is True


@override_settings(UPDATE_COLUMN_BATCH_SIZE=100)
@patch('data_manager.actions.data_columns.Task.objects.bulk_update')
@patch('data_manager.actions.data_columns.iterate_queryset')
def test_expression_updates_task_data_in_batches(mock_iterate_queryset, mock_bulk_update):
    """Range expressions retain queryset order while loading and writing at most one configured batch at a time."""
    queryset = Mock()
    queryset.only.return_value = queryset
    tasks = [SimpleNamespace(id=index, data={}) for index in range(201)]
    mock_iterate_queryset.return_value = tasks

    add_expression(queryset, len(tasks), 'range(10)', 'priority')

    assert [task.data['priority'] for task in tasks] == list(range(10, 211))
    assert mock_iterate_queryset.call_args == call(queryset, chunk_size=100)
    assert [len(call.args[0]) for call in mock_bulk_update.call_args_list] == [100, 100, 1]


@patch.object(PreparedTaskManager, 'only_filtered')
def test_background_mutation_reconstructs_prepared_queryset(mock_only_filtered):
    """The background job recreates the action's filters, selection, and ordering without serializing the request."""
    prepare_params = PrepareParams(
        project=1,
        ordering=['-id'],
        selectedItems={'all': True, 'excluded': [2]},
        filters={'conjunction': 'and', 'items': []},
        data={'selectedItems': {'all': True, 'excluded': [2]}},
        request=Mock(),
    )

    _reconstruct_mutation_queryset(SimpleNamespace(id=1), _serialize_mutation_scope(prepare_params))

    rebuilt_params = mock_only_filtered.call_args.kwargs['prepare_params']
    assert rebuilt_params.project == 1
    assert rebuilt_params.ordering == ['-id']
    assert rebuilt_params.selectedItems.excluded == [2]
    assert rebuilt_params.filters.items == []
    assert rebuilt_params.request is None


@pytest.mark.django_db
@patch('data_manager.actions.data_columns.flag_set', return_value=True)
def test_add_column_form_allows_selecting_or_creating_a_column(mock_flag_set, business_client):
    """The action form offers existing columns and permits a new column name."""
    project = Project.objects.create(title='Column form', created_by=business_client.user)
    Task.objects.create(project=project, data={'priority': 'low'})
    project.summary.update_data_columns(project.tasks.all())

    fields = add_data_field_form(business_client.user, project)[0]['fields']
    fields_by_name = {field['name']: field for field in fields}

    assert fields_by_name['column_name'] == {
        'type': 'select',
        'name': 'column_name',
        'label': 'Column',
        'placeholder': 'Search or add a column',
        'searchable': True,
        'multiple': False,
        'creatable': True,
        'createOptionLabel': 'Add "{value}" column',
        'required': True,
        'options': [{'value': 'priority', 'label': 'priority'}],
    }
    assert fields_by_name['value_type']['value'] == 'String'
    assert fields_by_name['value_type']['options'] == [
        {'value': 'String', 'label': 'String', 'badge': 'Recommended'},
        {
            'value': 'Number',
            'label': 'Number',
            'badge': 'Advanced',
            'description': 'Store values as numbers to filter tasks using greater than, less than, and other numeric comparisons.',
        },
        {
            'value': 'Expression',
            'label': 'Expression',
            'badge': 'Advanced',
            'description': 'Generate different values for selected tasks using an expression.',
        },
    ]


@pytest.mark.django_db
@patch('data_manager.actions.data_columns.flag_set', return_value=False)
def test_add_column_requires_dedicated_feature_flag(mock_flag_set, business_client):
    """The action and its form reject direct requests while the rollout flag is off."""
    project = Project.objects.create(title='Flagged column', created_by=business_client.user)

    with pytest.raises(PermissionDenied):
        add_data_field(
            project,
            Task.objects.none(),
            request=RequestStub(
                business_client.user,
                {'column_mode': 'add', 'value_name': 'priority', 'value_type': 'String', 'value': 'high'},
            ),
        )

    with pytest.raises(PermissionDenied):
        add_data_field_form(business_client.user, project)


@pytest.mark.django_db
def test_background_reconstruction_applies_filters_without_a_request(business_client):
    """The background job rebuilds the exact filtered selection with request=None (no HTTP request)."""
    project = Project.objects.create(title='Filtered reconstruction', created_by=business_client.user)
    keep = Task.objects.create(project=project, data={'text': 'keep me'})
    Task.objects.create(project=project, data={'text': 'drop me'})

    prepare_params = PrepareParams(
        project=project.id,
        selectedItems={'all': True, 'excluded': []},
        filters={
            'conjunction': 'and',
            'items': [{'filter': 'filter:tasks:data.text', 'operator': 'contains', 'type': 'String', 'value': 'keep'}],
        },
        request=None,
    )
    mutation_scope = _serialize_mutation_scope(prepare_params)

    reconstructed = _reconstruct_mutation_queryset(project, mutation_scope)

    assert list(reconstructed.values_list('id', flat=True)) == [keep.id]


@pytest.mark.django_db
@override_settings(ADD_OR_MODIFY_COLUMNS_ASYNC_THRESHOLD=1)
@patch('data_manager.actions.data_columns.start_job_async_or_sync', return_value=SimpleNamespace(id='job-id'))
@patch('data_manager.actions.data_columns.flag_set', return_value=True)
def test_large_add_column_without_visible_task_ids_still_stages(
    mock_flag_set, mock_start_job_async_or_sync, business_client
):
    """Direct API callers may omit visibleTaskIds; the action stages nothing but still queues the job."""
    project = Project.objects.create(title='No visible ids', created_by=business_client.user)
    first_task = Task.objects.create(project=project, data={'text': 'first'})
    second_task = Task.objects.create(project=project, data={'text': 'second'})

    response = add_data_field(
        project,
        project.tasks.all(),
        request=RequestStub(
            business_client.user,
            {
                'column_name': 'priority',
                'value_type': 'String',
                'value': 'high',
                'selectedItems': {'all': True, 'excluded': []},
                'filters': {'items': []},
            },
        ),
    )

    first_task.refresh_from_db()
    second_task.refresh_from_db()

    assert response['async'] is True
    # Nothing was pre-staged synchronously, but the summary still reflects the new column.
    assert first_task.data.get('priority') is None
    assert second_task.data.get('priority') is None
    assert project.summary.all_data_columns.get('priority') == 2
    mock_start_job_async_or_sync.assert_called_once()


@pytest.mark.django_db
@patch('data_manager.actions.data_columns.flag_set', return_value=True)
def test_add_column_rejects_invalid_request(mock_flag_set, business_client):
    """Invalid modes and missing names return validation errors instead of server errors."""
    project = Project.objects.create(title='Invalid column', created_by=business_client.user)

    with pytest.raises(ValidationError, match='Select an existing column or enter a new column name'):
        add_data_field(
            project,
            Task.objects.none(),
            request=RequestStub(business_client.user, {'column_mode': 'invalid'}),
        )

    with pytest.raises(ValidationError, match='Select an existing column or enter a new column name'):
        add_data_field(
            project,
            Task.objects.none(),
            request=RequestStub(business_client.user, {'column_mode': 'add', 'value_type': 'String'}),
        )


@pytest.mark.django_db
@override_settings(ADD_OR_MODIFY_COLUMNS_ASYNC_THRESHOLD=1)
@patch('data_manager.actions.data_columns.start_job_async_or_sync', return_value=SimpleNamespace(id='job-id'))
@patch('data_manager.actions.data_columns.flag_set', return_value=True)
def test_large_add_column_updates_current_page_before_background_job(
    mock_flag_set, mock_start_job_async_or_sync, business_client
):
    """Large unfiltered projects update visible rows synchronously before queuing the complete update."""
    project = Project.objects.create(title='Staged column', created_by=business_client.user)
    selected_task = Task.objects.create(project=project, data={'text': 'Selected'})
    unselected_task = Task.objects.create(project=project, data={'text': 'Unselected'})

    response = add_data_field(
        project,
        Task.objects.filter(id=selected_task.id),
        request=RequestStub(
            business_client.user,
            {
                'column_mode': 'add',
                'value_name': 'priority',
                'value_type': 'String',
                'value': 'high',
                'selectedItems': {'all': False, 'included': [selected_task.id]},
                'visibleTaskIds': [selected_task.id, unselected_task.id],
                'filters': {'items': []},
            },
        ),
    )

    selected_task.refresh_from_db()
    unselected_task.refresh_from_db()

    assert response == {
        'response_code': 200,
        'async': True,
        'reload': False,
        'column_operation': 'add',
        'manual_refresh_required': True,
        'detail': 'Updated the current page. The remaining tasks are being updated in the background.',
    }
    assert selected_task.data['priority'] == 'high'
    assert unselected_task.data['priority'] is None
    mock_start_job_async_or_sync.assert_called_once()


@pytest.mark.django_db
@override_settings(ADD_OR_MODIFY_COLUMNS_ASYNC_THRESHOLD=1)
@patch('data_manager.actions.data_columns.start_job_async_or_sync', return_value=SimpleNamespace(id='job-id'))
@patch('data_manager.actions.data_columns.flag_set', return_value=True)
def test_large_expression_column_updates_current_page_before_background_job(
    mock_flag_set, mock_start_job_async_or_sync, business_client
):
    """Expression columns stage the visible page and enqueue the remaining tasks just like other column types."""
    project = Project.objects.create(title='Staged expression column', created_by=business_client.user)
    selected_task = Task.objects.create(project=project, data={'text': 'Selected'})
    unselected_task = Task.objects.create(project=project, data={'text': 'Unselected'})

    response = add_data_field(
        project,
        Task.objects.filter(id=selected_task.id),
        request=RequestStub(
            business_client.user,
            {
                'column_name': 'priority',
                'value_type': 'Expression',
                'value': 'range(10)',
                'selectedItems': {'all': False, 'included': [selected_task.id]},
                'visibleTaskIds': [selected_task.id, unselected_task.id],
                'filters': {'items': []},
            },
        ),
    )

    selected_task.refresh_from_db()
    unselected_task.refresh_from_db()

    assert response['async'] is True
    assert selected_task.data['priority'] == 10
    assert unselected_task.data['priority'] is None
    mock_start_job_async_or_sync.assert_called_once()


@pytest.mark.django_db
@override_settings(ADD_OR_MODIFY_COLUMNS_ASYNC_THRESHOLD=1)
@patch('data_manager.actions.data_columns.start_job_async_or_sync', return_value=SimpleNamespace(id='job-id'))
@patch('data_manager.actions.data_columns.flag_set', return_value=True)
def test_large_column_update_updates_current_page_before_background_job(
    mock_flag_set, mock_start_job_async_or_sync, business_client
):
    """Large unfiltered updates stage visible selected tasks before queueing the remaining selected tasks."""
    project = Project.objects.create(title='Staged column update', created_by=business_client.user)
    first_task = Task.objects.create(project=project, data={'priority': 'low'})
    second_task = Task.objects.create(project=project, data={'priority': 'medium'})
    project.summary.update_data_columns(project.tasks.all())

    response = add_data_field(
        project,
        project.tasks.all(),
        request=RequestStub(
            business_client.user,
            {
                'column_name': 'priority',
                'value_type': 'String',
                'value': 'high',
                'selectedItems': {'all': True, 'excluded': []},
                'visibleTaskIds': [first_task.id, second_task.id],
                'filters': {'items': []},
            },
        ),
    )

    first_task.refresh_from_db()
    second_task.refresh_from_db()

    assert response['async'] is True
    assert first_task.data['priority'] == 'high'
    assert second_task.data['priority'] == 'high'
    mock_start_job_async_or_sync.assert_called_once()
