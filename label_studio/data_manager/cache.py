from django.core.cache import cache

# XXX:
# * investigate: is do we need to cache by every param combo?

# api/tasks?page=1&page_size=30&view=1&project=1
# api/tasks?page=2&page_size=30&view=2&interaction=scroll&project=1
# api/tasks?page=3&page_size=30&view=2&interaction=filter&project=1

def cached_dm_tasks_key(project_id, page_id):
    key = f'dm_tasks_id_{project_id}'
    if page_id:
        key = f'dm_tasks_id_{project_id}_{page_id}'
    return key


def cached_dm_tasks_remove(project_id, page_id):
    return cache.delete(cached_dm_tasks_key(project_id, page_id))


def cached_dm_tasks_get(project_id, page_id):
    return cache.get(cached_dm_tasks_key(project_id, page_id))


def cached_dm_tasks_set(project_id, page_id, data):
    # redis_time_cache = 300  # 5 minutes (in seconds)
    redis_time_cache = 1200  # 20 minutes
    return cache.set(
            cached_dm_tasks_key(project_id, page_id),
            data,
            redis_time_cache
    )


# XXX: Not sure that these will work correctly re: filtering params...

def cached_dm_tasks_view_get(org_id):
    key = f'dm_tasks_org_id_{org_id}'
    return cache.get(key)

def cached_dm_tasks_view_set(org_id, data):
    # return cache.get_or_set(f'dm_tasks_org_id_{project_id}' data)
    key = f'dm_tasks_org_id_{org_id}'
    cache.set(key, data)
