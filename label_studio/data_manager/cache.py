from django.core.cache import cache


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
