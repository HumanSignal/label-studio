"""Add or modify Data Manager columns."""

import random

import ujson as json
from core.feature_flags import flag_set
from core.permissions import AllPermissions
from core.redis import start_job_async_or_sync
from core.utils.common import batched_iterator
from core.utils.iterators import iterate_queryset
from data_manager.actions import DataManagerAction
from data_manager.column_names import UNQUERYABLE_COLUMN_NAME_CHARACTERS, is_queryable_column_name
from data_manager.prepare_params import PrepareParams
from django.conf import settings
from django.db import transaction
from django.db.models import Case, F, Func, JSONField, Value, When
from django.db.models.functions import Cast, Coalesce
from django.utils.timezone import now
from rest_framework.exceptions import PermissionDenied, ValidationError
from tasks.models import Task

all_permissions = AllPermissions()


def add_or_modify_columns_enabled(project):
    return flag_set('fflag_utc_1012_add_or_modify_columns', organization=project.organization)


def _column_mode(project, column_name):
    """'update' when the project already has the column (summary or any task), else 'add'."""
    column_exists = column_name in project.summary.all_data_columns
    if not column_exists:
        column_exists = project.tasks.filter(data__has_key=column_name).exists()
    mode = 'update' if column_exists else 'add'
    # Existing columns (e.g. imported spreadsheet headers) stay editable, but a new column must be
    # one the Data Manager can filter and sort on.
    if mode == 'add' and not is_queryable_column_name(column_name):
        raise ValidationError(
            {'column_name': f'Column name cannot contain {UNQUERYABLE_COLUMN_NAME_CHARACTERS}.'},
        )
    return mode


def _validate_column_request(request_data, project):
    value_name = (
        request_data.get('column_name') or request_data.get('value_name') or request_data.get('existing_column')
    )
    value_type = request_data.get('value_type', 'String')
    value = request_data.get('value', '')

    if value_type not in {'String', 'Number', 'Expression'}:
        raise ValidationError({'value_type': 'Choose a supported column type.'})

    if not isinstance(value_name, str) or not value_name.strip():
        raise ValidationError({'column_name': 'Select an existing column or enter a new column name.'})

    value_name = value_name.strip()
    mode = _column_mode(project, value_name)
    try:
        value = {'String': str, 'Number': float, 'Expression': str}[value_type](value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({'value': f'Enter a valid {value_type.lower()} value.'}) from exc

    return mode, value_name, value_type, value


def _set_data_value_in_batches(queryset, value_name, postgres_value, sqlite_value):
    """Set task.data[value_name] on every task of `queryset`, one key per task, in batches.

    `postgres_value` is the jsonb expression to store, or a function of a batch's task ids returning one (for
    per-task values); `sqlite_value(task)` returns the Python value on SQLite.
    """
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        updated_count = 0
        task_iterator = iterate_queryset(queryset.only('id', 'data'), chunk_size=settings.UPDATE_COLUMN_BATCH_SIZE)
        for task_batch in batched_iterator(task_iterator, settings.UPDATE_COLUMN_BATCH_SIZE):
            touched_at = now()
            for task in task_batch:
                task.data = task.data or {}
                task.data[value_name] = sqlite_value(task)
                # QuerySet/bulk_update skip auto_now; incremental export keys off Task.updated_at.
                task.updated_at = touched_at
            Task.objects.bulk_update(
                task_batch, fields=['data', 'updated_at'], batch_size=settings.UPDATE_COLUMN_BATCH_SIZE
            )
            updated_count += len(task_batch)
        return updated_count

    updated_count = 0
    task_iterator = iterate_queryset(queryset.only('id', 'project_id'), chunk_size=settings.UPDATE_COLUMN_BATCH_SIZE)
    for task_batch in batched_iterator(task_iterator, settings.UPDATE_COLUMN_BATCH_SIZE):
        task_ids = [task.id for task in task_batch]
        updated_count += Task.objects.filter(id__in=task_ids).update(
            data=Func(
                Coalesce(F('data'), Value({}, JSONField()), output_field=JSONField()),
                Value([value_name]),
                postgres_value(task_ids) if callable(postgres_value) else postgres_value,
                function='jsonb_set',
            ),
            # Explicit updated_at: QuerySet.update() does not honor auto_now (FIT-3092).
            updated_at=now(),
        )
    return updated_count


def _json_value(value):
    if value is None:
        return Cast(Value('null'), JSONField())
    return Value(value, JSONField())


def _set_data_value(queryset, value_name, value):
    return _set_data_value_in_batches(
        queryset,
        value_name,
        _json_value(value),
        sqlite_value=lambda _task: value,
    )


def _set_selected_or_empty_data_value(task_queryset, selected_queryset, value_name, value):
    selected_ids = selected_queryset.order_by().values('id')
    sqlite_selected_ids = (
        set(selected_queryset.values_list('id', flat=True))
        if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE
        else set()
    )
    return _set_data_value_in_batches(
        task_queryset,
        value_name,
        Case(
            When(id__in=selected_ids, then=_json_value(value)),
            default=_json_value(None),
            output_field=JSONField(),
        ),
        sqlite_value=lambda task: value if task.id in sqlite_selected_ids else None,
    )


def _add_column_to_project(project, selected_queryset, value_name, value):
    return _set_selected_or_empty_data_value(project.tasks, selected_queryset, value_name, value)


def _update_summary_for_new_column(project, value_name, task_count):
    summary = project.summary
    all_data_columns = dict(summary.all_data_columns)
    all_data_columns[value_name] = task_count
    summary.all_data_columns = all_data_columns
    summary.common_data_columns = sorted(set(summary.common_data_columns) | {value_name})
    summary.save(update_fields=['all_data_columns', 'common_data_columns'])


def _record_data_column_in_summary(project, column_name, newly_keyed, updated_count, mode):
    """List the column in the project summary after a per-task write, so the Data Manager shows it.

    Runs after the task write has committed, in its own transaction: deleting or saving a task locks the summary
    before the task row, so holding task rows while waiting for the summary could deadlock.
    """
    from projects.models import ProjectSummary

    cached = project.summary
    # Count for a summary without an entry: a new column is on exactly the updated tasks; a column the tasks
    # already had but the summary lost (stale summary) is counted exactly.
    if mode == 'update' and column_name not in cached.all_data_columns:
        missing_entry_count = project.tasks.filter(data__has_key=column_name).count()
    else:
        missing_entry_count = updated_count
    project_task_count = None if column_name in cached.common_data_columns else project.tasks.count()

    with transaction.atomic():
        summary = ProjectSummary.objects.select_for_update().get(pk=cached.pk)
        all_data_columns = dict(summary.all_data_columns)
        if column_name in all_data_columns:
            all_data_columns[column_name] += newly_keyed
        else:
            all_data_columns[column_name] = missing_entry_count
        update_fields = []
        if all_data_columns != summary.all_data_columns:
            summary.all_data_columns = all_data_columns
            update_fields.append('all_data_columns')
        # Common columns are on every task (custom-interface prompts read them). The locked count includes
        # concurrent writers' increments and is a cheap gate; the exact check runs only when it passes.
        if (
            project_task_count is not None
            and column_name not in summary.common_data_columns
            and all_data_columns[column_name] >= project_task_count
            and not project.tasks.exclude(data__has_key=column_name).exists()
        ):
            summary.common_data_columns = sorted(set(summary.common_data_columns) | {column_name})
            update_fields.append('common_data_columns')
        if update_fields:
            summary.save(update_fields=update_fields)


def set_task_data_column_values(project, column_name, values):
    """Set `task.data[column_name]` to its own value for each listed task of the project.

    `values` maps task id to an already validated value. One JSON key per task (jsonb_set), only the listed tasks,
    synchronously and in one transaction. Unlike the Add or Update Columns action, a new column is not written into
    the other tasks of the project. Returns the updated ids and the requested ids that are not tasks of the project.
    """
    mode = _column_mode(project, column_name)
    newly_keyed = 0
    with transaction.atomic():
        # Lock the listed tasks in id order (overlapping requests then wait instead of deadlocking) before deciding
        # what was updated: a task deleted concurrently is either kept until commit or reported as not found.
        updated_ids = list(
            project.tasks.filter(id__in=list(values)).order_by('id').select_for_update().values_list('id', flat=True)
        )
        if updated_ids:
            tasks = Task.objects.filter(id__in=updated_ids)
            newly_keyed = tasks.exclude(data__has_key=column_name).count()
            _set_data_value_in_batches(
                tasks,
                column_name,
                lambda task_ids: Case(
                    *[When(id=task_id, then=_json_value(values[task_id])) for task_id in task_ids],
                    output_field=JSONField(),
                ),
                sqlite_value=lambda task: values[task.id],
            )
    if updated_ids:
        _record_data_column_in_summary(project, column_name, newly_keyed, len(updated_ids), mode)
    return {
        'updated_task_ids': updated_ids,
        'not_found_task_ids': sorted(set(values) - set(updated_ids)),
    }


def _serialize_mutation_scope(prepare_params):
    if prepare_params is None:
        return None
    return prepare_params.model_dump(mode='json', exclude={'request'})


def _reconstruct_mutation_queryset(project, mutation_scope):
    # The background job has no HTTP request, so the selection is rebuilt with request=None. This is
    # result-set-equivalent to the interactive call: `request` only powers a performance-only agreement
    # prefilter (a no-op when request is None) and downstream annotator hints — it never changes which
    # tasks match the filters/selection.
    prepare_params = PrepareParams(**{**mutation_scope, 'project': project.id, 'request': None})
    return Task.prepared.only_filtered(prepare_params=prepare_params)


def _apply_column_mutation(project, queryset, size, mode, value_name, value, value_type, update_summary=False):
    if mode == 'add':
        task_count = _add_column_to_project(
            project, queryset, value_name, None if value_type == 'Expression' else value
        )
        if update_summary:
            _update_summary_for_new_column(project, value_name, task_count)

    if value_type == 'Expression':
        add_expression(queryset, size, value, value_name)
    elif mode == 'update':
        _set_data_value(queryset, value_name, value)


def _complete_column_mutation_job(project_id, mode, value_name, value, value_type, mutation_scope):
    from projects.models import Project

    project = Project.objects.get(id=project_id)
    selected_queryset = _reconstruct_mutation_queryset(project, mutation_scope)
    _apply_column_mutation(
        project,
        selected_queryset,
        selected_queryset.count(),
        mode,
        value_name,
        value,
        value_type,
    )


def _can_stage_column_mutation(project, queryset, mode):
    threshold = settings.ADD_OR_MODIFY_COLUMNS_ASYNC_THRESHOLD
    target_queryset = project.tasks if mode == 'add' else queryset
    return threshold > 0 and target_queryset.order_by().values('id')[threshold : threshold + 1].exists()


def _stage_column_mutation(project, queryset, mutation_scope, request_data, mode, value_name, value, value_type):
    # visibleTaskIds is an optional optimization: the Data Manager sends the current page so those
    # rows update synchronously before the background job runs. Direct API callers may omit it (or
    # send an unexpected shape), so coerce leniently — a missing/invalid page just stages nothing and
    # lets the background job do all the work, rather than failing the whole action.
    raw_visible_task_ids = request_data.get('visibleTaskIds')
    visible_task_ids = (
        [task_id for task_id in raw_visible_task_ids if isinstance(task_id, int)]
        if isinstance(raw_visible_task_ids, list)
        else []
    )

    visible_tasks = project.tasks.filter(id__in=visible_task_ids)
    visible_selected_queryset = queryset.filter(id__in=visible_task_ids)
    if mode == 'add' and value_type == 'Expression':
        _set_data_value(visible_tasks, value_name, None)
        add_expression(visible_selected_queryset, visible_selected_queryset.count(), value, value_name)
    elif mode == 'add':
        _set_selected_or_empty_data_value(visible_tasks, visible_selected_queryset, value_name, value)
    elif value_type == 'Expression':
        add_expression(visible_selected_queryset, visible_selected_queryset.count(), value, value_name)
    else:
        _set_data_value(visible_selected_queryset, value_name, value)
    if mode == 'add':
        _update_summary_for_new_column(project, value_name, project.tasks.count())

    job = start_job_async_or_sync(
        _complete_column_mutation_job,
        project.id,
        mode,
        value_name,
        value,
        value_type,
        mutation_scope,
        queue_name='low',
        job_timeout=60 * 60,
    )
    return hasattr(job, 'id')


def add_data_field(project, queryset, **kwargs):
    request = kwargs['request']
    if not add_or_modify_columns_enabled(project):
        raise PermissionDenied('Add or Update Columns is not enabled for this organization.')

    mode, value_name, value_type, value = _validate_column_request(request.data, project)
    selected_size = queryset.count()

    if _can_stage_column_mutation(project, queryset, mode):
        mutation_scope = _serialize_mutation_scope(kwargs.get('prepare_params'))
        is_async = _stage_column_mutation(
            project, queryset, mutation_scope, request.data, mode, value_name, value, value_type
        )
        return {
            'response_code': 200,
            'async': is_async,
            'reload': False,
            'column_operation': mode,
            'manual_refresh_required': True,
            'detail': 'Updated the current page. The remaining tasks are being updated in the background.',
        }

    _apply_column_mutation(project, queryset, selected_size, mode, value_name, value, value_type, update_summary=True)

    return {
        'response_code': 200,
        'detail': f'Updated {selected_size} tasks',
        'column_operation': mode,
        'manual_refresh_required': True,
    }


def process_arrays(params):
    start, end = params.find('['), -1
    while start != end:
        end = start + params[start:].find(']') + 1
        params = params[0:start] + params[start:end].replace(',', ';') + params[end:]
        start = end + params[end:].find('[') + 1
    return params


add_data_field_examples = (
    'range(2) or '
    'sample() or '
    'random(<min_int>, <max_int>) or '
    'choices(["<value1>", "<value2>", ...], [<weight1>, <weight2>, ...]) or '
    'replace("old-string", "new-string")'
)


def add_expression(queryset, size, value, value_name):
    if '(' not in value or not value.endswith(')'):
        raise ValidationError({'value': 'Expression must use the form command(arguments).'})
    command, args = value.split('(', 1)
    if not command:
        raise ValidationError({'value': 'Expression command is required.'})
    args = process_arrays(args)
    args = args.replace(')', '').split(',')
    args = [] if len(args) == 1 and args[0] == '' else args
    for i, arg in enumerate(args):
        args[i] = arg.replace(';', ',').replace("'", '"')

    sample_values = None

    if command == 'range':
        if len(args) != 1:
            raise ValidationError({'value': 'range(start:int) requires one start argument.'})
        start = int(args[0])

    elif command == 'sample':
        if args:
            raise ValidationError({'value': 'sample() does not accept arguments.'})
        sample_values = iter(random.sample(range(0, size), size))

    elif command == 'random':
        if len(args) != 2:
            raise ValidationError({'value': 'random(min, max) requires two arguments.'})
        minimum, maximum = int(args[0]), int(args[1])

    elif command == 'choices':
        if not 0 < len(args) < 3:
            raise ValidationError({'value': 'choices(values:list, weights:list) requires one or two arguments.'})
        weights = json.loads(args[1]) if len(args) == 2 else None
        choices = json.loads(args[0])

    elif command == 'replace':
        if len(args) != 2:
            raise ValidationError({'value': 'replace(old_value, new_value) requires two arguments.'})
        old_value, new_value = json.loads(args[0]), json.loads(args[1])

    else:
        raise ValidationError('Undefined expression, you can use: ' + add_data_field_examples)

    offset = 0
    task_iterator = iterate_queryset(queryset.only('id', 'data'), chunk_size=settings.UPDATE_COLUMN_BATCH_SIZE)
    for task_batch in batched_iterator(task_iterator, settings.UPDATE_COLUMN_BATCH_SIZE):
        touched_at = now()
        if command == 'range':
            for index, task in enumerate(task_batch):
                task.data[value_name] = start + offset + index
                task.updated_at = touched_at
        elif command == 'sample':
            for task in task_batch:
                task.data[value_name] = next(sample_values)
                task.updated_at = touched_at
        elif command == 'random':
            for task in task_batch:
                task.data[value_name] = random.randint(minimum, maximum)
                task.updated_at = touched_at
        elif command == 'choices':
            for task, selected_value in zip(
                task_batch, random.choices(population=choices, weights=weights, k=len(task_batch))
            ):
                task.data[value_name] = selected_value
                task.updated_at = touched_at
        elif command == 'replace':
            changed = []
            for task in task_batch:
                if value_name in task.data:
                    task.data[value_name] = task.data[value_name].replace(old_value, new_value)
                    task.updated_at = touched_at
                    changed.append(task)
            if changed:
                Task.objects.bulk_update(
                    changed, fields=['data', 'updated_at'], batch_size=settings.UPDATE_COLUMN_BATCH_SIZE
                )
            offset += len(task_batch)
            continue

        Task.objects.bulk_update(
            task_batch, fields=['data', 'updated_at'], batch_size=settings.UPDATE_COLUMN_BATCH_SIZE
        )
        offset += len(task_batch)


def add_data_field_form(user, project):
    if not add_or_modify_columns_enabled(project):
        raise PermissionDenied('Add or Update Columns is not enabled for this organization.')

    existing_columns = sorted(project.summary.all_data_columns)
    return [
        {
            'columnCount': 1,
            'fields': [
                {
                    'type': 'select',
                    'name': 'column_name',
                    'label': 'Column',
                    'placeholder': 'Search or add a column',
                    'searchable': True,
                    'multiple': False,
                    'creatable': True,
                    'createOptionLabel': 'Add "{value}" column',
                    'required': True,
                    'options': [{'value': column, 'label': column} for column in existing_columns],
                },
                {
                    'type': 'select',
                    'name': 'value_type',
                    'label': 'Type',
                    'options': [
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
                    ],
                    'value': 'String',
                },
                {'type': 'input', 'name': 'value', 'label': 'Value'},
            ],
        }
    ]


actions: list[DataManagerAction] = [
    {
        'entry_point': add_data_field,
        'permission': all_permissions.projects_change,
        'title': 'Add or Update Columns',
        'order': 1,
        'hidden': lambda user, project: not add_or_modify_columns_enabled(project),
        'dialog': {
            'text': 'Select an existing column to update it, or enter a new name to add a column to every task.',
            'ok_text': 'Add Column',
            'type': 'confirm',
            'form': add_data_field_form,
        },
    }
]
