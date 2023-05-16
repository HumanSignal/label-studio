from django.core.cache import cache


def cached_projects_key(user_id):
    return f'projects_userid_{user_id}'


def cached_projects_remove(user_id):
    return cache.delete(cached_projects_key(user_id))


def cached_projects_get(user_id):
    return cache.get(cached_projects_key(user_id))


def cached_projects_set(user_id, data):
    return cache.set(cached_projects_key(user_id), data)
