from label_studio.utils.misc import DirectionSwitch, timestamp_to_local_datetime
from label_studio.utils.uri_resolver import resolve_task_data_uri


class DataManagerException(Exception):
    pass


def prepare_tasks(project, params):
    order, page, page_size = params.order, params.page, params.page_size
    fields = params.fields

    ascending = order[0] == '-'
    order = order[1:] if order[0] == '-' else order
    if order not in ['id', 'completed_at', 'has_cancelled_completions']:
        raise DataManagerException('Incorrect order')

    # get task ids and sort them by completed time
    task_ids = project.source_storage.ids()
    completed_at = project.get_completed_at()  # task can have multiple completions, get the last of completed
    cancelled_status = project.get_cancelled_status()

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

    paginated = ordered[(page - 1) * page_size:page * page_size]

    # get tasks with completions
    tasks = []
    for item in paginated:
        i = item['id']
        task = project.get_task_with_completions(i)

        # no completions at task, get task without completions
        if task is None:
            task = project.source_storage.get(i)
        else:
            # evaluate completed_at time
            completed_at = item['completed_at']
            if completed_at != 'undefined' and completed_at is not None:
                completed_at = timestamp_to_local_datetime(completed_at).strftime('%Y-%m-%d %H:%M:%S')
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
