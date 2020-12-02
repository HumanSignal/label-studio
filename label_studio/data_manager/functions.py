import os
import ujson as json
from flask import session
from operator import itemgetter
from label_studio.utils.misc import DirectionSwitch, timestamp_to_local_datetime
from label_studio.utils.uri_resolver import resolve_task_data_uri

DATETIME_FORMAT = '%Y-%m-%dT%H:%M:%SZ'
TASKS = 'tasks:'


class DataManagerException(Exception):
    pass


def create_default_tabs():
    """ Create default state for all tabs as initialization
    """
    return {
        'tabs': [
            {
                'id': 1,
                'title': 'Tab 1',
                'hiddenColumns': None
            }
        ]
    }


def column_type(key):
    if key == 'image':
        return 'Image'
    elif key == 'audio':
        return 'Audio'
    elif key == 'audioplus':
        return 'AudioPlus'
    else:
        return 'String'


def get_all_columns(project):
    """ Make columns info for the frontend data manager
    """
    result = {'columns': []}

    # frontend uses MST data model, so we need two directional referencing parent <-> child
    task_data_children = []
    for key, data_type in project.data_types.items():
        column = {
            'id': key,
            'title': key,
            'type': column_type(key),  # data_type,
            'target': 'tasks',
            'parent': 'data'
        }
        result['columns'].append(column)
        task_data_children.append(column['id'])

    result['columns'] += [
        # --- Tasks ---
        {
            'id': 'id',
            'title': "Task ID",
            'type': "Number",
            'target': 'tasks'
        },
        {
            'id': 'completed_at',
            'title': "Completed at",
            'type': "Datetime",
            'target': 'tasks',
            'help': 'Last completion date'
        },
        {
            'id': 'total_completions',
            'title': "Completions",
            'type': "Number",
            'target': 'tasks',
            'help': 'Total completions per task'
        },
        {
            'id': 'has_cancelled_completions',
            'title': "Cancelled",
            'type': "Number",
            'target': 'tasks',
            'help': 'Number of cancelled (skipped) completions'
        },
        {
            'id': 'data',
            'title': "data",
            'type': "List",
            'target': 'tasks',
            'children': task_data_children
        }
    ]
    return result


def load_all_tabs(project) -> dict:
    """ Load all tabs from disk
    """
    tab_path = os.path.join(project.path, 'tabs.json')
    return json.load(open(tab_path, encoding='utf-8')) if os.path.exists(tab_path) else create_default_tabs()


def save_all_tabs(project, data: dict):
    """ Save all tabs to disk
    """
    tab_path = os.path.join(project.path, 'tabs.json')
    json.dump(data, open(tab_path, 'w', encoding='utf-8'))


def load_tab(tab_id, project=None, raise_if_not_exists=False):
    """ Load tab info from DB
    """
    data = load_all_tabs(project)

    # select by tab id
    for tab in data['tabs']:
        if tab['id'] == tab_id:
            break
    else:
        if raise_if_not_exists:
            raise DataManagerException('No tab with id: ' + str(tab_id))

        # create a new tab
        tab = {'id': tab_id}
    return tab


def save_tab(tab_id, tab_data, project):
    """ Save tab info to DB
    """
    # load tab data
    data = load_all_tabs(project)
    tab_data['id'] = tab_id

    # select by tab id
    for i, tab in enumerate(data['tabs']):
        if tab['id'] == tab_id:
            data['tabs'][i] = tab_data
            break
    else:
        # create a new tab
        tab_data['id'] = tab_id
        data['tabs'].append(tab_data)

    save_all_tabs(project, data)


def delete_tab(tab_id, project):
    """ Delete tab from DB
    """
    data = load_all_tabs(project)

    # select by tab id
    for i, tab in enumerate(data['tabs']):
        if tab['id'] == tab_id:
            del data['tabs'][i]
            break
    else:
        return False

    save_all_tabs(project, data)
    return True


def get_completed_at(task):
    """ Get completed time for task
    """
    # check for empty array []
    if len(task.get('completions', [])) == 0:
        return None

    # aggregate completion created_at by max
    try:
        return max(task['completions'], key=itemgetter('created_at'))['created_at']
    except Exception as exc:
        return 0


def get_cancelled_number(task):
    """ Get was_cancelled (skipped) status for task: returns cancelled completion number for task
    """
    try:
        # note: skipped will be deprecated
        return sum([completion.get('skipped', False) or completion.get('was_cancelled', False)
                    for completion in task['completions']])
    except Exception as exc:
        return None


def preload_task(project, task_id, resolve_uri=False):
    task = project.get_task_with_completions(task_id)

    # no completions at task, get task without completions
    if task is None:
        task = project.source_storage.get(task_id)

    # with completions
    else:
        # completed_at
        completed_at = get_completed_at(task)
        if completed_at != 0 and isinstance(completed_at, int):
            completed_at = timestamp_to_local_datetime(completed_at).strftime(DATETIME_FORMAT)
        task['completed_at'] = completed_at

        # cancelled completions number
        task['has_cancelled_completions'] = get_cancelled_number(task)

        # total completions
        task['total_completions'] = len(task['completions'])

    # don't resolve data (s3/gcs is slow) if it's not necessary (it's very slow)
    if resolve_uri:
        task = resolve_task_data_uri(task, project=project)

    return task


def preload_tasks(project, resolve_uri=False):
    """ Preload tasks: get completed_at, has_cancelled_completions,
        evaluate pre-signed urls for storages, aggregate over completion data, etc.
    """
    task_ids = project.source_storage.ids()  # get task ids for all tasks in DB

    # get tasks with completions
    tasks = []
    for i in task_ids:
        task = preload_task(project, i, resolve_uri)
        tasks.append(task)

    return tasks


def operator(op, a, b):
    """ Filter operators
    """
    if op == 'empty':  # TODO: check it
        return (b is None or not b) and a
    if op == 'not_empty':  # TODO: check it
        return (b is not None or not b) and a

    if a is None:
        return False
    if b is None:
        return False

    if op == 'equal':
        return a == b
    if op == 'not_equal':
        return a != b
    if op == 'contains':
        return a in b
    if op == 'not_contains':
        return a not in b

    if op == 'less':
        return b < a
    if op == 'greater':
        return b > a
    if op == 'less_or_equal':
        return b <= a
    if op == 'greater_or_equal':
        return b >= a

    if op == 'in':
        a, c = a['min'], a['max']
        return a <= b <= c
    if op == 'not_in':
        a, c = a['min'], a['max']
        return not (a <= b <= c)


def resolve_task_field(task, field):
    """ Get task field from root or 'data' sub-dict
    """
    if field.startswith('data.'):
        result = task['data'].get(field[5:], None)
    else:
        result = task.get(field, None)
    return result


def order_tasks(params, tasks):
    """ Apply ordering to tasks
    """
    ordering = params.tab.get('ordering', [])  # ordering = ['id', 'completed_at', ...]
    if ordering is None:
        return tasks

    # remove 'tasks:' prefix for tasks api, for annotations it will be 'annotations:'
    ordering = [o.replace(TASKS, '') for o in ordering if o.startswith(TASKS) or o.startswith('-' + TASKS)]
    order = 'id' if not ordering else ordering[0]  # we support only one column ordering right now

    # ascending or descending
    ascending = order[0] == '-'
    order = order[1:] if order[0] == '-' else order

    # id
    if order == 'id':
        ordered = sorted(tasks, key=lambda x: x['id'], reverse=ascending)

    # cancelled: for has_cancelled_completions use two keys ordering
    elif order == 'has_cancelled_completions':
        ordered = sorted(tasks,
                         key=lambda x: (DirectionSwitch(x.get('has_cancelled_completions', None), not ascending),
                                        DirectionSwitch(x.get('completed_at', None), False)))
    # another orderings
    else:
        ordered = sorted(tasks, key=lambda x: (DirectionSwitch(resolve_task_field(x, order), not ascending)))

    return ordered


def filter_tasks(tasks, params):
    """ Filter tasks using
    """
    # check for filtering params
    tab = params.tab
    if tab is None:
        return tasks
    filters = tab.get('filters', None)
    if not filters:
        return tasks
    conjunction = tab['conjunction']

    new_tasks = tasks if conjunction == 'and' else []

    # go over all the filters
    for f in filters:
        parts = f['filter'].split(':')  # filters:<tasks|annotations>:field_name
        target = parts[1]  # 'tasks | annotations'
        field = parts[2]  # field name
        op, value = f['operator'], f['value']

        if target != 'tasks':
            raise DataManagerException('Filtering target ' + target + ' is not yet supported')

        if conjunction == 'and':
            new_tasks = [task for task in new_tasks if operator(op, value, resolve_task_field(task, field))]

        elif conjunction == 'or':
            new_tasks += [task for task in tasks if operator(op, value, resolve_task_field(task, field))]

        else:
            raise DataManagerException('Filtering conjunction ' + op + ' is not supported')

    return new_tasks


def get_used_fields(params):
    """ Get all used fields from filter and order params
    """
    fields = []
    filters = params.tab.get('filters', None) or []
    for item in filters:
        fields.append(item['filter'])

    ordering = params.tab.get('ordering', None) or []
    ordering = [o.replace(TASKS, '') for o in ordering if o.startswith(TASKS) or o.startswith('-' + TASKS)]
    order = 'id' if not ordering else ordering[0]  # we support only one column ordering right now
    fields.append(order)
    return list(set(fields))


def prepare_tasks(project, params):
    """ Main function to get tasks
    """
    # load all tasks from db with some aggregations over completions
    tasks = preload_tasks(project, resolve_uri=False)

    # filter
    tasks = filter_tasks(tasks, params)

    # order
    tasks = order_tasks(params, tasks)
    total = len(tasks)

    # pagination
    page, page_size = params.page, params.page_size
    if page > 0 and page_size > 0:
        tasks = tasks[(page - 1) * page_size:page * page_size]

    # use only necessary fields to avoid storage (s3/gcs/etc) overloading
    need_uri_resolving = True
    if hasattr(params, 'fields'):  # TODO: or tab.hiddenColumns
        need_uri_resolving = any(['data.' in field for field in params.fields])

    # resolve all task fields
    if need_uri_resolving:
        for i, task in enumerate(tasks):
            tasks[i] = resolve_task_data_uri(task, project=project)

    return {'tasks': tasks, 'total': total}


def prepare_annotations(tasks, params):
    """ Main function to get annotations
        TODO: it's a draft only
    """
    page, page_size = params.page, params.page_size

    # unpack completions from tasks
    items = []
    for task in tasks:
        completions = task.get('completions', [])

        # assign task ids to have link between completion and task in the data manager
        for completion in completions:
            completion['task_id'] = task['id']
            # convert created_at
            created_at = completion.get('created_at', None)
            if created_at:
                completion['created_at'] = timestamp_to_local_datetime(created_at).strftime(DATETIME_FORMAT)

        items += completions

    total = len(items)

    # skip pagination if page<0 and page_size<=0
    if page > 0 and page_size > 0:
        items = items[(page - 1) * page_size: page * page_size]

    return {'annotations': items, 'total': total}
