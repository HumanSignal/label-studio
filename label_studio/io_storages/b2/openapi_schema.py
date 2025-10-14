"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

# Common B2 storage schema properties following OpenAPI 3.0 specification
_common_b2_storage_schema_properties = {
    'title': {'type': 'string', 'description': 'Storage title', 'maxLength': 2048},
    'description': {'type': 'string', 'description': 'Storage description'},
    'project': {'type': 'integer', 'description': 'Project ID'},
    'bucket': {'type': 'string', 'description': 'B2 bucket name'},
    'prefix': {'type': 'string', 'description': 'B2 bucket prefix (folder path)'},
    'b2_access_key_id': {
        'type': 'string',
        'description': 'B2 Application Key ID (equivalent to AWS_ACCESS_KEY_ID)',
    },
    'b2_secret_access_key': {
        'type': 'string',
        'description': 'B2 Application Key (equivalent to AWS_SECRET_ACCESS_KEY)',
    },
    'b2_endpoint_url': {
        'type': 'string',
        'description': 'B2 S3-compatible endpoint URL (e.g., https://s3.us-west-004.backblazeb2.com)',
    },
    'region_name': {
        'type': 'string',
        'description': 'B2 Region (e.g., us-west-004, us-east-005, eu-central-003)',
    },
}

# B2 import storage schema
_b2_import_storage_schema = {
    'type': 'object',
    'properties': {
        'regex_filter': {
            'type': 'string',
            'description': 'Cloud storage regex for filtering objects. You must specify it otherwise no objects will be imported.',
        },
        'use_blob_urls': {
            'type': 'boolean',
            'description': 'Interpret objects as BLOBs and generate URLs. For example, if your bucket contains images, you can use this option to generate URLs for these images. If set to False, it will read the content of the file and load it into Label Studio.',
            'default': False,
        },
        'presign': {
            'type': 'boolean',
            'description': 'Generate presigned URLs for secure access to private files',
            'default': True,
        },
        'presign_ttl': {
            'type': 'integer',
            'description': 'Presigned URL expiration time in minutes',
            'default': 1,
        },
        'recursive_scan': {
            'type': 'boolean',
            'description': 'Scan recursively through all subfolders',
            'default': False,
        },
        **_common_b2_storage_schema_properties,
    },
    'required': [],
}

# B2 import storage schema with ID
_b2_import_storage_schema_with_id = {
    'type': 'object',
    'properties': {
        'id': {'type': 'integer', 'description': 'Storage ID. If set, storage with specified ID will be updated'},
        **_b2_import_storage_schema['properties'],
    },
    'required': [],
}

# B2 export storage schema
_b2_export_storage_schema = {
    'type': 'object',
    'properties': {
        'can_delete_objects': {
            'type': 'boolean',
            'description': 'Enable deletion of annotations from B2 when deleted from Label Studio',
            'default': False,
        },
        **_common_b2_storage_schema_properties,
    },
    'required': [],
}

# B2 export storage schema with ID
_b2_export_storage_schema_with_id = {
    'type': 'object',
    'properties': {
        'id': {'type': 'integer', 'description': 'Storage ID. If set, storage with specified ID will be updated'},
        **_b2_export_storage_schema['properties'],
    },
    'required': [],
}

