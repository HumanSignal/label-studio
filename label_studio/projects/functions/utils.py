from tasks.models import Task


def make_queryset_from_iterable(tasks_list):
    """
    Make queryset from list/set of int/Tasks
    :param tasks_list: Iterable of Tasks or IDs
    :return: Tasks queryset
    """
    if isinstance(tasks_list, set):
        tasks_list = list(tasks_list)
    # Make query set from list of IDs
    if isinstance(tasks_list, list):
        # Extract task IDs from Tasks list
        if isinstance(tasks_list[0], Task):
            tasks_list = [task.id for task in tasks_list]
        queryset = Task.objects.filter(id__in=tasks_list)
    else:
        ids = []
        for task in tasks_list:
            if isinstance(task, Task):
                ids.append(task.id)
            elif isinstance(task, int):
                ids.append(task)
            else:
                raise ValueError(f"Unknown object type: {str(task)}")
        queryset = Task.objects.filter(id__in=ids)
    return queryset
