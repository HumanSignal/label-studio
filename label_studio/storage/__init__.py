from .base import (
    create_storage, register_storage, get_available_storages, get_available_storage_names,
    BaseStorageForm, CloudStorageForm, CloudStorageBlobForm, get_storage_form
)
from .filesystem import JSONStorage, DirJSONsStorage
from .s3 import S3Storage, S3BlobStorage
from .gcs import GCSStorage, GCSBlobStorage

register_storage('json', JSONStorage, BaseStorageForm)
register_storage('dir-jsons', DirJSONsStorage, BaseStorageForm)
register_storage('s3', S3Storage, CloudStorageForm)
register_storage('s3blob', S3BlobStorage, CloudStorageBlobForm)
register_storage('gcs', GCSStorage, CloudStorageForm)
register_storage('gcsblob', GCSBlobStorage, CloudStorageBlobForm)
