from .base import create_storage, register_storage
from .filesystem import JSONStorage, DirJSONsStorage
from .s3 import S3Storage, S3BlobStorage

register_storage('json', JSONStorage)
register_storage('dir-jsons', DirJSONsStorage)
register_storage('s3', S3Storage)
register_storage('s3blob', S3BlobStorage)
