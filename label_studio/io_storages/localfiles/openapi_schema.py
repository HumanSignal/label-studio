from drf_yasg import openapi

_common_storage_schema_properties = {
    'title': openapi.Schema(type=openapi.TYPE_STRING, description='Storage title'),
    'description': openapi.Schema(type=openapi.TYPE_STRING, description='Storage description'),
    'project': openapi.Schema(type=openapi.TYPE_INTEGER, description='Project ID'),
    'path': openapi.Schema(type=openapi.TYPE_STRING, description='Path to local directory'),
    'regex_filter': openapi.Schema(type=openapi.TYPE_STRING, description='Regex for filtering objects'),
    'use_blob_urls': openapi.Schema(
        type=openapi.TYPE_BOOLEAN,
        description='Interpret objects as BLOBs and generate URLs. For example, if your directory contains images, '
        'you can use this option to generate URLs for these images. '
        'If set to False, it will read the content of the file and load it into Label Studio.',
        default=False,
    ),
}

_local_files_import_storage_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=_common_storage_schema_properties,
    required=[],
)

_local_files_import_storage_schema_with_id = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        id=openapi.Schema(
            type=openapi.TYPE_INTEGER, description='Storage ID. If set, storage with specified ID will be updated'
        ),
        **_local_files_import_storage_schema.properties,
    ),
    required=[],
)

_local_files_export_storage_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT, properties=_common_storage_schema_properties, required=[]
)

_local_files_export_storage_schema_with_id = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        id=openapi.Schema(
            type=openapi.TYPE_INTEGER, description='Storage ID. If set, storage with specified ID will be updated'
        ),
        **_local_files_export_storage_schema.properties,
    ),
    required=[],
)
