import logging
from typing import Dict, Iterable, List, Union

from django.shortcuts import get_object_or_404
from io_storages.base_models import ImportStorage
from rest_framework.exceptions import PermissionDenied, ValidationError

from .azure_blob.api import AzureBlobExportStorageListAPI, AzureBlobImportStorageListAPI
from .gcs.api import GCSExportStorageListAPI, GCSImportStorageListAPI
from .redis.api import RedisExportStorageListAPI, RedisImportStorageListAPI
from .s3.api import S3ExportStorageListAPI, S3ImportStorageListAPI

logger = logging.getLogger(__name__)


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

    # combine instance fields with request.data
    serializer = serializer_class(data=request.data)
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
    if isinstance(url, (dict, list)):
        for storage_object in storage_objects:
            if storage_object.can_resolve_url(url):
                # note: only first found storage_object will be used for link resolving
                # can_resolve_url now checks both the scheme and the bucket to ensure the correct storage is used
                return storage_object
