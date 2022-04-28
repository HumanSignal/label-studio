from django.core.cache import cache


def cached_ml_backend_key(project_id):
    return f'ml_backends_project_id{project_id}'


def cached_ml_backend_remove(project_id):
    return cache.delete(cached_ml_backend_key(project_id))


def cached_ml_backend_get(project_id):
    return cache.get(cached_ml_backend_key(project_id))


def cached_ml_backend_set(project_id, data):
    return cache.set(cached_ml_backend_key(project_id), data)
