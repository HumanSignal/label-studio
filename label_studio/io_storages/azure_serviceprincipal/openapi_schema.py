from drf_yasg import openapi

_common_storage_schema_properties = {
    'title': openapi.Schema(type=openapi.TYPE_STRING, description='Storage title'),
    'description': openapi.Schema(type=openapi.TYPE_STRING, description='Storage description'),
    'project': openapi.Schema(type=openapi.TYPE_INTEGER, description='Project ID'),
    'container': openapi.Schema(type=openapi.TYPE_STRING, description='Azure serviceprincipal container'),
    'prefix': openapi.Schema(type=openapi.TYPE_STRING, description='Azure serviceprincipal prefix name'),
    'account_name': openapi.Schema(type=openapi.TYPE_STRING, description='Azure serviceprincipal account name'),
    'client_id': openapi.Schema(type=openapi.TYPE_STRING, description='Azure serviceprincipal client id'),
    'client_secret': openapi.Schema(type=openapi.TYPE_STRING, description='Azure serviceprincipal client secret'),
    'tenant_id': openapi.Schema(type=openapi.TYPE_STRING, description='Azure serviceprincipal tenant id'),
}


_azure_serviceprincipal_import_storage_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        regex_filter=openapi.Schema(
            type=openapi.TYPE_STRING,
            description='Cloud storage regex for filtering objects. '
            'You must specify it otherwise no objects will be imported.',
        ),
        use_serviceprincipal_urls=openapi.Schema(
            type=openapi.TYPE_BOOLEAN,
            description='Interpret objects as serviceprincipals and generate URLs. For example, if your bucket contains images, '
            'you can use this option to generate URLs for these images. '
            'If set to False, it will read the content of the file and load it into Label Studio.',
            default=False,
        ),
        presign=openapi.Schema(
            type=openapi.TYPE_BOOLEAN, description='Presign URLs for direct download', default=True
        ),
        presign_ttl=openapi.Schema(type=openapi.TYPE_INTEGER, description='Presign TTL in minutes', default=1),
        **_common_storage_schema_properties,
    ),
    required=[],
)

_azure_serviceprincipal_import_storage_schema_with_id = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        id=openapi.Schema(
            type=openapi.TYPE_INTEGER, description='Storage ID. If set, storage with specified ID will be updated'
        ),
        **_azure_serviceprincipal_import_storage_schema.properties,
    ),
    required=[],
)

_azure_serviceprincipal_export_storage_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        can_delete_objects=openapi.Schema(
            type=openapi.TYPE_BOOLEAN, description='Deletion from storage enabled', default=False
        ),
        **_common_storage_schema_properties,
    ),
    required=[],
)

_azure_serviceprincipal_export_storage_schema_with_id = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties=dict(
        id=openapi.Schema(
            type=openapi.TYPE_INTEGER, description='Storage ID. If set, storage with specified ID will be updated'
        ),
        **_azure_serviceprincipal_export_storage_schema.properties,
    ),
    required=[],
)
