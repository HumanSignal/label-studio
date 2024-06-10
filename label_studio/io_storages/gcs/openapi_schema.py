from drf_yasg import openapi

_common_gcs_storage_schema_properties = {
    'title': openapi.Schema(type=openapi.TYPE_STRING, description='Storage title'),
    'description': openapi.Schema(type=openapi.TYPE_STRING, description='Storage description'),
    'project': openapi.Schema(type=openapi.TYPE_INTEGER, description='Project ID'),
    'bucket': openapi.Schema(type=openapi.TYPE_STRING, description='GCS bucket name'),
    'prefix': openapi.Schema(type=openapi.TYPE_STRING, description='GCS bucket prefix'),
    'google_application_credentials': openapi.Schema(
        type=openapi.TYPE_STRING,
        description='The content of GOOGLE_APPLICATION_CREDENTIALS json file. '
        'Check official Google Cloud Authentication documentation for more details.',
    ),
    'google_project_id': openapi.Schema(type=openapi.TYPE_STRING, description='Google project ID'),
}

_gcs_import_storage_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        regex_filter=openapi.Schema(
            type=openapi.TYPE_STRING,
            description='Cloud storage regex for filtering objects. '
            'You must specify it otherwise no objects will be imported.',
        ),
        use_blob_urls=openapi.Schema(
            type=openapi.TYPE_BOOLEAN,
            description='Interpret objects as BLOBs and generate URLs. For example, if your bucket contains images, '
            'you can use this option to generate URLs for these images. '
            'If set to False, it will read the content of the file and load it into Label Studio.',
            default=False,
        ),
        presign=openapi.Schema(
            type=openapi.TYPE_BOOLEAN, description='Presign URLs for direct download', default=True
        ),
        presign_ttl=openapi.Schema(type=openapi.TYPE_INTEGER, description='Presign TTL in minutes', default=1),
        **_common_gcs_storage_schema_properties,
    ),
    required=[],
)

_gcs_import_storage_schema_with_id = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        id=openapi.Schema(
            type=openapi.TYPE_INTEGER, description='Storage ID. If set, storage with specified ID will be updated'
        ),
        **_gcs_import_storage_schema.properties,
    ),
    required=[],
)

_gcs_export_storage_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        can_delete_objects=openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Deletion from storage enabled.'),
        **_common_gcs_storage_schema_properties,
    ),
    required=[],
)

_gcs_export_storage_schema_with_id = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        id=openapi.Schema(
            type=openapi.TYPE_INTEGER, description='Storage ID. If set, storage with specified ID will be updated'
        ),
        **_gcs_export_storage_schema.properties,
    ),
    required=[],
)
