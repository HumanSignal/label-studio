"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from io_storages.api import (
    ExportStorageDetailAPI,
    ExportStorageFormLayoutAPI,
    ExportStorageListAPI,
    ExportStorageSyncAPI,
    ExportStorageValidateAPI,
    ImportStorageDetailAPI,
    ImportStorageFormLayoutAPI,
    ImportStorageListAPI,
    ImportStorageSyncAPI,
    ImportStorageValidateAPI,
)
from io_storages.b2.models import B2ExportStorage, B2ImportStorage
from io_storages.b2.serializers import B2ExportStorageSerializer, B2ImportStorageSerializer

from .openapi_schema import (
    _b2_export_storage_schema,
    _b2_export_storage_schema_with_id,
    _b2_import_storage_schema,
    _b2_import_storage_schema_with_id,
)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='List B2 import storage',
        description='Get a list of all Backblaze B2 import storage connections.',
        parameters=[
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Project ID',
            ),
        ],
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'b2'],
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Create new B2 import storage',
        description='Create new Backblaze B2 import storage connection',
        request={
            'application/json': _b2_import_storage_schema,
        },
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'b2'],
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
class B2ImportStorageListAPI(ImportStorageListAPI):
    """API for listing and creating B2 import storage connections."""
    
    queryset = B2ImportStorage.objects.all()
    serializer_class = B2ImportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Get B2 import storage',
        description='Get a specific Backblaze B2 import storage connection.',
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'b2'],
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Update B2 import storage',
        description='Update a specific Backblaze B2 import storage connection.',
        request={
            'application/json': _b2_import_storage_schema,
        },
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'b2'],
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Delete B2 import storage',
        description='Delete a specific Backblaze B2 import storage connection.',
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'b2'],
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class B2ImportStorageDetailAPI(ImportStorageDetailAPI):
    """API for retrieving, updating, and deleting a specific B2 import storage."""
    
    queryset = B2ImportStorage.objects.all()
    serializer_class = B2ImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Sync B2 import storage',
        description='Sync tasks from a Backblaze B2 import storage connection.',
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='Storage ID',
            ),
        ],
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'b2'],
            'x-fern-sdk-method-name': 'sync',
            'x-fern-audiences': ['public'],
        },
    ),
)
class B2ImportStorageSyncAPI(ImportStorageSyncAPI):
    """API for syncing a B2 import storage."""
    
    serializer_class = B2ImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Validate B2 import storage',
        description='Validate a specific Backblaze B2 import storage connection.',
        request={
            'application/json': _b2_import_storage_schema_with_id,
        },
        responses={200: OpenApiResponse(description='Validation successful')},
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'b2'],
            'x-fern-sdk-method-name': 'validate',
            'x-fern-audiences': ['public'],
        },
    ),
)
class B2ImportStorageValidateAPI(ImportStorageValidateAPI):
    """API for validating a B2 import storage connection."""
    
    serializer_class = B2ImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Validate B2 export storage',
        description='Validate a specific Backblaze B2 export storage connection.',
        request={
            'application/json': _b2_export_storage_schema_with_id,
        },
        responses={200: OpenApiResponse(description='Validation successful')},
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'b2'],
            'x-fern-sdk-method-name': 'validate',
            'x-fern-audiences': ['public'],
        },
    ),
)
class B2ExportStorageValidateAPI(ExportStorageValidateAPI):
    """API for validating a B2 export storage connection."""
    
    serializer_class = B2ExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Get all B2 export storage',
        description='Get a list of all Backblaze B2 export storage connections.',
        parameters=[
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Project ID',
            ),
        ],
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'b2'],
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Create B2 export storage',
        description='Create a new Backblaze B2 export storage connection to store annotations.',
        request={
            'application/json': _b2_export_storage_schema,
        },
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'b2'],
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
class B2ExportStorageListAPI(ExportStorageListAPI):
    """API for listing and creating B2 export storage connections."""
    
    queryset = B2ExportStorage.objects.all()
    serializer_class = B2ExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Get B2 export storage',
        description='Get a specific Backblaze B2 export storage connection.',
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'b2'],
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Update B2 export storage',
        description='Update a specific Backblaze B2 export storage connection.',
        request={
            'application/json': _b2_export_storage_schema,
        },
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'b2'],
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Delete B2 export storage',
        description='Delete a specific Backblaze B2 export storage connection.',
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'b2'],
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class B2ExportStorageDetailAPI(ExportStorageDetailAPI):
    """API for retrieving, updating, and deleting a specific B2 export storage."""
    
    queryset = B2ExportStorage.objects.all()
    serializer_class = B2ExportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: B2'],
        summary='Sync B2 export storage',
        description='Sync annotations to a Backblaze B2 export storage connection.',
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'b2'],
            'x-fern-sdk-method-name': 'sync',
            'x-fern-audiences': ['public'],
        },
    ),
)
class B2ExportStorageSyncAPI(ExportStorageSyncAPI):
    """API for syncing a B2 export storage."""
    
    serializer_class = B2ExportStorageSerializer


class B2ImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    """API for getting the form layout for B2 import storage."""
    pass


class B2ExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    """API for getting the form layout for B2 export storage."""
    pass

