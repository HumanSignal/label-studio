import logging
from typing import Dict, Iterable, List, Optional, Union

from django.conf import settings
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from io_storages.base_models import ImportStorage
from projects.models import Project
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied, ValidationError
from tasks.models import Task

from .azure_blob.api import AzureBlobExportStorageListAPI, AzureBlobImportStorageListAPI
from .gcs.api import GCSExportStorageListAPI, GCSImportStorageListAPI
from .redis.api import RedisExportStorageListAPI, RedisImportStorageListAPI
from .s3.api import S3ExportStorageListAPI, S3ImportStorageListAPI

logger = logging.getLogger(__name__)


def check_storage_project_permission(user, project_id):
    """Deny before serializer/connection work if the caller cannot use this project."""
    if project_id is None:
        return
    # DRF's get_object_or_404 turns a malformed pk ("abc", an object) into a 404 instead of a 500
    project = generics.get_object_or_404(Project, pk=project_id)
    if not project.has_permission(user):
        raise PermissionDenied('You do not have permission to use storages for this project.')


def validate_storage_instance(request, serializer_class):
    """
    Preload and prepare a storage instance from request data.

    This function handles the common logic for loading existing storage instances
    or creating new ones from request data, including permission checks and
    serializer validation.

    Args:
        request: The HTTP request containing storage data
        serializer_class: The serializer class to use for validation

    Returns:
        The prepared storage instance

    Raises:
        PermissionDenied: If user doesn't have permission to access the storage
        ValidationError: If serializer validation fails
    """
    if not serializer_class or not hasattr(serializer_class, 'Meta'):
        raise ValidationError('Invalid or missing serializer class')

    storage_id = request.data.get('id')
    instance = None

    if storage_id:
        instance = get_object_or_404(serializer_class.Meta.model.objects.all(), pk=storage_id)
        if not instance.has_permission(request.user):
            raise PermissionDenied()

    # Before is_valid(): concrete serializers often call validate_connection() inside validate().
    check_storage_project_permission(request.user, request.data.get('project'))

    # combine instance fields with request.data
    serializer = serializer_class(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)

    # if storage exists, we have to use instance from DB,
    # because instance from serializer won't have credentials, they were popped intentionally.
    # Apply the request data in memory only: validating a connection must never save the storage.
    if instance:
        for attr, value in serializer.validated_data.items():
            setattr(instance, attr, value)
    else:
        instance = serializer_class.Meta.model(**serializer.validated_data)

    # double check: not all storages validate connection in serializer, just make another explicit check here
    try:
        instance.validate_connection()
    except Exception as exc:
        logger.error(f'Error validating storage connection: {exc}')
        raise ValidationError('Error validating storage connection')

    return instance


def get_storage_list():
    return [
        {
            'name': 's3',
            'title': 'AWS S3',
            'import_list_api': S3ImportStorageListAPI,
            'export_list_api': S3ExportStorageListAPI,
        },
        {
            'name': 'gcs',
            'title': 'Google Cloud Storage',
            'import_list_api': GCSImportStorageListAPI,
            'export_list_api': GCSExportStorageListAPI,
        },
        {
            'name': 'azure',
            'title': 'Microsoft Azure',
            'import_list_api': AzureBlobImportStorageListAPI,
            'export_list_api': AzureBlobExportStorageListAPI,
        },
        {
            'name': 'redis',
            'title': 'Redis',
            'import_list_api': RedisImportStorageListAPI,
            'export_list_api': RedisExportStorageListAPI,
        },
    ]


def get_storage_by_url(url: Union[str, List, Dict], storage_objects: Iterable[ImportStorage]) -> ImportStorage:
    """Find the first compatible storage and returns storage that can emit pre-signed URL"""

    for storage_object in storage_objects:
        # check url is string because task can have int, float, dict, list
        # and 'can_resolve_url' will fail
        if isinstance(url, str) and storage_object.can_resolve_url(url):
            return storage_object

    # url is list or dict
    if isinstance(url, dict) or isinstance(url, list):
        for storage_object in storage_objects:
            if storage_object.can_resolve_url(url):
                # note: only first found storage_object will be used for link resolving
                # can_resolve_url now checks both the scheme and the bucket to ensure the correct storage is used
                return storage_object


# Characters that can sit right before/after a URI embedded in task data or a label config
# (bare value, HTML attribute, JSON-ish text). A match bounded by anything else is a
# different, longer URI that merely contains the requested one.
_URI_LEFT_BOUNDARY = frozenset('"\'=([,>\t\n\r ')
_URI_RIGHT_BOUNDARY = frozenset('"\')],<>\t\n\r ')
# Cap on candidate tasks inspected when a project-level URI is not under any storage prefix.
_REFERENCED_TASK_CANDIDATES = 20


def _text_references(text: str, uri: str) -> bool:
    start = text.find(uri)
    while start != -1:
        end = start + len(uri)
        left_ok = start == 0 or text[start - 1] in _URI_LEFT_BOUNDARY
        right_ok = end == len(text) or text[end] in _URI_RIGHT_BOUNDARY
        if left_ok and right_ok:
            return True
        start = text.find(uri, start + 1)
    return False


def _data_references(data, uri: str) -> bool:
    if isinstance(data, str):
        return _text_references(data, uri)
    if isinstance(data, dict):
        return any(_data_references(value, uri) for value in data.values())
    if isinstance(data, (list, tuple)):
        return any(_data_references(item, uri) for item in data)
    return False


def _project_tasks_reference(project, uri: str) -> bool:
    from django.db.models import TextField
    from django.db.models.functions import Cast
    from tasks.models import Task

    candidates = (
        Task.objects.filter(project_id=project.id)
        .annotate(data_text=Cast('data', output_field=TextField()))
        .filter(data_text__contains=uri)
        .values_list('data', flat=True)[:_REFERENCED_TASK_CANDIDATES]
    )
    return any(_data_references(data, uri) for data in candidates)


def uri_is_referenced(url: str, instance) -> bool:
    """True when the task's data (Task) or the project's config or tasks (Project) reference `url`."""
    from projects.models import Project

    if isinstance(instance, Project):
        if _text_references(instance.label_config or '', url):
            return True
        return _project_tasks_reference(instance, url)
    return _data_references(getattr(instance, 'data', None), url)


def resolve_import_storage_for_request(url, instance) -> Optional[ImportStorage]:
    """The import storage that may serve a client-supplied URI for this task or project, or None.

    Storage matching is bucket-wide and buckets are often shared between projects under
    per-project prefixes, so naming the bucket is not enough. A storage serves the URI only
    when the object key is under its prefix, or when the URI is referenced by the task
    (task endpoint) or the project's config or tasks (project endpoint): JSON-task storages
    sync task files from their prefix but point at media anywhere in the bucket.
    `regex_filter` only selects files to sync and is deliberately not applied here.

    URIs that appear only inside fetched content, such as assets that HyperText
    `valueType="url"` rewrites from the loaded HTML, are not referenced by the task. They
    resolve only when they are under the storage prefix, and are refused otherwise. To use
    assets outside the prefix, store the HTML itself in the task data: URIs embedded there
    are referenced by the task and keep resolving.
    """
    if not isinstance(url, str):
        return None

    project = instance.project if isinstance(instance, Task) else instance
    candidates = [storage for storage in project.get_all_import_storage_objects if storage.can_resolve_url(url)]
    if not candidates:
        return None

    for storage in candidates:
        if storage.prefix_allows_url(url):
            return storage

    if uri_is_referenced(url, instance):
        return candidates[0]

    logger.warning(
        f'Refusing import-storage resolution outside storage prefix for {type(instance).__name__} {instance.id}'
    )
    return None


def resolve_own_collection_export_storage(url, project):
    """An export target that may serve this URI, or None.

    Export connections resolve only the project's own collection folder. They
    match on bucket name alone and are commonly shared across an organization,
    so accepting any key in the bucket would let a client-supplied URI read
    every other project's exported data through a task it happens to can view.
    """
    from io_storages.utils import is_own_collection_key, parse_bucket_uri

    if not isinstance(url, str):
        return None
    storage = get_storage_by_url(url, project.get_all_export_storage_objects)
    if storage is None:
        return None
    uri = parse_bucket_uri(url, storage)
    if uri is None or not is_own_collection_key(uri.path, project.organization_id, project.id):
        logger.warning(f'Refusing export-storage resolution outside project {project.id} own collection folder')
        return None
    return storage


def get_import_storage_link_prefetches() -> list[Prefetch]:
    from tasks.models import Task

    prefetches = []
    for link_name in settings.IO_STORAGES_IMPORT_LINK_NAMES:
        relation = Task._meta.get_field(link_name)
        prefetches.append(Prefetch(link_name, queryset=relation.related_model.objects.select_related('storage')))
    return prefetches
