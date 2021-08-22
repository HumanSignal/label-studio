from label_studio.io_storages.s3.api import S3ImportStorageListAPI, S3ExportStorageListAPI
from label_studio.io_storages.gcs.api import GCSImportStorageListAPI, GCSExportStorageListAPI
from label_studio.io_storages.azure_blob.api import AzureBlobImportStorageListAPI, AzureBlobExportStorageListAPI
from label_studio.io_storages.redis.api import RedisImportStorageListAPI, RedisExportStorageListAPI


def get_storage_list():
    return [
        {'name': 's3', 'title': 'AWS S3', 'import_list_api': S3ImportStorageListAPI, 'export_list_api': S3ExportStorageListAPI},
        {'name': 'gcs', 'title': 'Google Cloud Storage', 'import_list_api': GCSImportStorageListAPI, 'export_list_api': GCSExportStorageListAPI},
        {'name': 'azure', 'title': 'Microsoft Azure', 'import_list_api': AzureBlobImportStorageListAPI, 'export_list_api': AzureBlobExportStorageListAPI},
        {'name': 'redis', 'title': 'Redis', 'import_list_api': RedisImportStorageListAPI, 'export_list_api': RedisExportStorageListAPI}
    ]