from drf_yasg import openapi

_common_s3_storage_schema_properties = {
    'title': openapi.Schema(type=openapi.TYPE_STRING, description='Storage title'),
    'description': openapi.Schema(type=openapi.TYPE_STRING, description='Storage description'),
    'project': openapi.Schema(type=openapi.TYPE_INTEGER, description='Project ID'),
    'bucket': openapi.Schema(type=openapi.TYPE_STRING, description='S3 bucket name'),
    'prefix': openapi.Schema(type=openapi.TYPE_STRING, description='S3 bucket prefix'),
    'aws_access_key_id': openapi.Schema(type=openapi.TYPE_STRING, description='AWS_ACCESS_KEY_ID'),
    'aws_secret_access_key': openapi.Schema(type=openapi.TYPE_STRING, description='AWS_SECRET_ACCESS_KEY'),
    'aws_session_token': openapi.Schema(type=openapi.TYPE_STRING, description='AWS_SESSION_TOKEN'),
    'aws_sse_kms_key_id': openapi.Schema(type=openapi.TYPE_STRING, description='AWS SSE KMS Key ID'),
    'region_name': openapi.Schema(type=openapi.TYPE_STRING, description='AWS Region'),
    's3_endpoint': openapi.Schema(type=openapi.TYPE_STRING, description='S3 Endpoint'),
}

_s3_import_storage_schema = openapi.Schema(
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
        presign=openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Presign URLs for download', default=True),
        presign_ttl=openapi.Schema(type=openapi.TYPE_INTEGER, description='Presign TTL in minutes', default=1),
        recursive_scan=openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Scan recursively'),
        **_common_s3_storage_schema_properties,
    ),
)

_s3_import_storage_schema_with_id = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        id=openapi.Schema(
            type=openapi.TYPE_INTEGER, description='Storage ID. If set, storage with specified ID will be updated'
        ),
        **_s3_import_storage_schema.properties,
    ),
)

_s3_export_storage_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        can_delete_objects=openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Deletion from storage enabled.'),
        **_common_s3_storage_schema_properties,
    ),
)

_s3_export_storage_schema_with_id = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        id=openapi.Schema(
            type=openapi.TYPE_INTEGER, description='Storage ID. If set, storage with specified ID will be updated'
        ),
        **_s3_export_storage_schema.properties,
    ),
)
