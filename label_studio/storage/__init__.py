from .base import create_storage, register_storage, get_available_storages
from .filesystem import JSONStorage, DirJSONsStorage
from .s3 import S3Storage, S3BlobStorage
from .gcs import GCSStorage, GCSBlobStorage

register_storage('json', JSONStorage)
register_storage('dir-jsons', DirJSONsStorage)
register_storage('s3', S3Storage)
register_storage('s3blob', S3BlobStorage)
register_storage('gcs', GCSStorage)
register_storage('gcsblob', GCSBlobStorage)
