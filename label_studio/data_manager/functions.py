from flask import session
from label_studio.utils.misc import DirectionSwitch, timestamp_to_local_datetime
from label_studio.utils.uri_resolver import resolve_task_data_uri

DATETIME_FORMAT = '%Y-%m-%d %H:%M:%S'
DEFAULT_TABS = {
    'tabs': [
        {
            'id': 1,
            'title': 'Tab 1',
            'hiddenColumns': None
        }
    ]
}
TASKS = 'tasks:'


class DataManagerException(Exception):
    pass


def column_type(key):
    if key == 'image':
        return 'Image'
    elif key == 'audio':
        return 'Audio'
    elif key == 'audioplus':
        return 'AudioPlus'
    else:
        return 'String'


def make_columns(project):
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
            'parent': 'data',
            'orderable': False
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
            'id': 'has_cancelled_completions',
            'title': "Cancelled",
            'type': "Number",
            'target': 'tasks',
            'help': 'Number of cancelled completions'
        },
        {
            'id': 'data',
            'title': "data",
            'type': "List",
            'target': 'tasks',
            'children': task_data_children
        },
        # --- Completions ---
        {
            'id': 'id',
            'title': 'Annotation ID',
            'type': 'Number',
            'target': 'annotations',
            'orderable': False
        },
        {
            'id': 'task_id',
            'title': 'Task ID',
            'type': 'Number',
            'target': 'annotations',
            'orderable': False
        },
        {
            'id': 'created_at',
            'title': "Completed at",
            'type': "Datetime",
            'target': 'annotations',
            'orderable': False
        },
        {
            'id': 'was_cancelled',
            'title': "Cancelled",
            'type': "Boolean",
            'target': 'annotations',
            'orderable': False
        },
        {
            'id': 'lead_time',
            'title': "Lead time",
            'type': "Number",
            'target': 'annotations',
            'orderable': False
        }
    ]
    return result


def load_tab(tab_id, raise_if_not_exists=False):
    """ Load tab info from DB
    """
    # load tab data
    data = DEFAULT_TABS if 'tab_data' not in session else session['tab_data']

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


def save_tab(tab_id, tab_data):
    """ Save tab info to DB
    """
    # load tab data
    data = DEFAULT_TABS if 'tab_data' not in session else session['tab_data']
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

    session['tab_data'] = data


def order_tasks(params, task_ids, completed_at, cancelled_status):
    """ Apply ordering to tasks
    """
    ordering = params.tab.get('ordering', [])  # ordering = ['id', 'completed_at', ...]
    ordering = [o.replace(TASKS, '') for o in ordering if o.startswith(TASKS) or o.startswith('-' + TASKS)]
    order = 'id' if not ordering else ordering[0]  # we support only one column ordering right now

    # ascending or descending
    ascending = order[0] == '-'
    order = order[1:] if order[0] == '-' else order

    if order not in ['id', 'completed_at', 'has_cancelled_completions']:
        raise DataManagerException('Incorrect order: ' + order)

    # ordering
    pre_order = ({
        'id': i,
        'completed_at': completed_at[i] if i in completed_at else None,
        'has_cancelled_completions': cancelled_status[i] if i in completed_at else None,
    } for i in task_ids)

    if order == 'id':
        ordered = sorted(pre_order, key=lambda x: x['id'], reverse=ascending)

    else:
        # for has_cancelled_completions use two keys ordering
        if order == 'has_cancelled_completions':
            ordered = sorted(pre_order,
                             key=lambda x: (DirectionSwitch(x['has_cancelled_completions'], not ascending),
                                            DirectionSwitch(x['completed_at'], False)))
        # another orderings
        else:
            ordered = sorted(pre_order, key=lambda x: (DirectionSwitch(x[order], not ascending)))

    return ordered


def post_process_tasks(project, fields, input_tasks):
    """ Resolve tasks: evaluate pre-signed urls for storages,
        aggregate over completion data, etc
    """
    # get tasks with completions
    tasks = []
    for item in input_tasks:
        i = item['id']
        task = project.get_task_with_completions(i)

        # no completions at task, get task without completions
        if task is None:
            task = project.source_storage.get(i)
        else:
            # evaluate completed_at time
            completed_at = item['completed_at']
            if completed_at != 0 and completed_at is not None:
                completed_at = timestamp_to_local_datetime(completed_at).strftime(DATETIME_FORMAT)
            task['completed_at'] = completed_at
            task['has_cancelled_completions'] = item['has_cancelled_completions']

        # don't resolve data (s3/gcs is slow) if it's not in fields
        if 'all' in fields or 'data' in fields:
            task = resolve_task_data_uri(task, project=project)

        # leave only chosen fields
        if 'all' not in fields:
            task = {field: task[field] for field in fields}

        tasks.append(task)

    return tasks


def operator(op, a, b):
    """ Filter operators
    """
    if op == 'equal':
        return a == b
    if op == 'not_equal':
        return a != b
    if op == 'contains':
        return a in b
    if op == 'not_contains':
        return a not in b
    if op == 'empty' and a:  # TODO: check it
        return b is None or not b
    if op == 'not_empty' and not a:  # TODO: check it
        return b is not None or not b

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


def prepare_tasks(project, params):
    """ Main function to get tasks
    """
    page, page_size = params.page, params.page_size
    fields = ['all']

    # get task ids and sort them by completed time
    task_ids = project.source_storage.ids()
    completed_at = project.get_completed_at()  # task can have multiple completions, get the last of completed
    cancelled_status = project.get_cancelled_status()

    # order
    tasks = order_tasks(params, task_ids, completed_at, cancelled_status)
    total = len(tasks)

    tasks = post_process_tasks(project, fields, tasks)

    tasks = filter_tasks(tasks, params)

    # pagination
    if page > 0 and page_size > 0:
        tasks = tasks[(page - 1) * page_size:page * page_size]

    return {'tasks': tasks, 'total': total}


def prepare_annotations(tasks, params):
    """ Main function to get annotations
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
