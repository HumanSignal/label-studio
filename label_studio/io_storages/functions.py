import logging
from typing import Dict, Iterable, List, Union

from django.conf import settings
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from io_storages.base_models import ImportStorage
from projects.action_permissions import ensure_project_manage
from projects.models import Project
from rest_framework.exceptions import ValidationError

from .azure_blob.api import AzureBlobExportStorageListAPI, AzureBlobImportStorageListAPI
from .gcs.api import GCSExportStorageListAPI, GCSImportStorageListAPI
from .redis.api import RedisExportStorageListAPI, RedisImportStorageListAPI
from .s3.api import S3ExportStorageListAPI, S3ImportStorageListAPI

logger = logging.getLogger(__name__)


def _project_reassigned(data, current_project_id) -> bool:
    """Return whether the payload moves a storage onto a different project.

    Responsibility: detect a project change before validation opens a connection
    or listing walks objects.

    Boundary: an omitted project field is not a change. A different id, an empty
    value on a project-bound row, or a non-numeric id is a change, including when
    the caller can manage both projects. This does not persist the row.
    """
    if not hasattr(data, '__contains__') or 'project' not in data:
        return False
    raw = data.get('project')
    if raw in (None, ''):
        return current_project_id is not None
    try:
        submitted = int(raw)
    except (TypeError, ValueError):
        return True
    return submitted != current_project_id


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
    project = None

    if storage_id:
        instance = get_object_or_404(serializer_class.Meta.model.objects.all(), pk=storage_id)
        project = instance.project
    else:
        project_id = request.data.get('project')
        if project_id not in (None, ''):
            try:
                project = Project.objects.filter(pk=project_id).first()
            except (TypeError, ValueError):
                project = None
    if project is not None:
        ensure_project_manage(request.user, project)
        request.user.project = project

    # S3 validation opens a client inside is_valid(), and update() would persist
    # a new project. Reject the move before either of those.
    if instance is not None and _project_reassigned(request.data, instance.project_id):
        raise ValidationError('The project cannot be changed.')

    data = request.data.copy()
    if instance is not None:
        # Validation forms submit blank values for redacted credentials. Keep
        # reusing those credentials while passing the authorized row to validation.
        for field in getattr(serializer_class, 'secure_fields', ()):
            if field in data and not data[field]:
                data[field] = getattr(instance, field)

    serializer = serializer_class(instance=instance, data=data)
    serializer.is_valid(raise_exception=True)

    # if storage exists, we have to use instance from DB,
    # because instance from serializer won't have credentials, they were popped intentionally
    if instance:
        instance = serializer.update(instance, serializer.validated_data)
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


def resolve_own_collection_export_storage(url, project):
    """An export target that may serve this URI, or None.

    Export connections resolve only the project's own collection folder. They
    match on bucket name alone and are commonly shared across an organization,
    so accepting any key in the bucket would let a client-supplied URI read
    every other project's exported data through a task it happens to can view.

    Prefer a connection whose configured prefix contains the key. If none fits,
    retain the first own-collection match so the API boundary check can preserve
    its separate responses for unsafe keys (400) and unmatched prefixes (404).
    """
    from io_storages.localfiles.functions import key_within_prefix
    from io_storages.utils import is_own_collection_key, parse_bucket_uri

    if not isinstance(url, str):
        return None
    storage_objects = iter(project.get_all_export_storage_objects)
    storage = get_storage_by_url(url, storage_objects)
    fallback = None
    while storage is not None:
        uri = parse_bucket_uri(url, storage)
        if uri is None or not is_own_collection_key(uri.path, project.organization_id, project.id):
            logger.warning(f'Refusing export-storage resolution outside project {project.id} own collection folder')
            return None
        if fallback is None:
            fallback = storage
        prefix = getattr(storage, 'prefix', None)
        if not isinstance(prefix, str) or prefix == '' or key_within_prefix(uri.path, prefix):
            return storage
        storage = get_storage_by_url(url, storage_objects)
    return fallback


def get_import_storage_link_prefetches() -> list[Prefetch]:
    from tasks.models import Task

    prefetches = []
    for link_name in settings.IO_STORAGES_IMPORT_LINK_NAMES:
        relation = Task._meta.get_field(link_name)
        prefetches.append(Prefetch(link_name, queryset=relation.related_model.objects.select_related('storage')))
    return prefetches
