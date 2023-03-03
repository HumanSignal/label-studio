from .gcs.api import GCSDatasetStorageListAPI, GCSExportStorageListAPI


def get_storage_list():
    return [
        {
            'name': 'gcs',
            'title': 'Google Cloud Storage',
            'import_list_api': GCSDatasetStorageListAPI,
            'export_list_api': GCSExportStorageListAPI
        },
    ]
