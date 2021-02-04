import json
import logging
import os

from azure.storage.blob import BlobServiceClient

from .base import CloudStorage, BaseStorageForm, StringField, BooleanField, Optional


logger = logging.getLogger(__name__)
logging.getLogger('azure.core.pipeline.policies.http_logging_policy').setLevel(logging.WARNING)
AZURE_BLOB_ACCOUNT_NAME = os.getenv('AZURE_BLOB_ACCOUNT_NAME') 
AZURE_BLOB_ACCOUNT_KEY = os.getenv('AZURE_BLOB_ACCOUNT_KEY') 

class AzureBlobStorage(CloudStorage):

    description = 'Azure Blob Storage'

    @property
    def url_prefix(self):
        return 'azure-blob://'

    @property
    def readable_path(self):
        return self.url_prefix + self.path + '/' + self.prefix

    def _get_client(self):
        if not AZURE_BLOB_ACCOUNT_NAME or not AZURE_BLOB_ACCOUNT_KEY:
            raise ValueError('Azure account name and key must be set using environment variables AZURE_BLOB_ACCOUNT_NAME and AZURE_BLOB_ACCOUNT_KEY')

        connection_string = "DefaultEndpointsProtocol=https;AccountName="+AZURE_BLOB_ACCOUNT_NAME+";AccountKey="+AZURE_BLOB_ACCOUNT_KEY+";EndpointSuffix=core.windows.net"
        client = BlobServiceClient.from_connection_string(conn_str=connection_string)
        container = client.get_container_client(self.path)
        
        return {
            'client': client,
            'container': container
        }

    def validate_connection(self):
        pass

    def _get_objects(self):
        container = self.client['container']
        files = container.list_blobs(name_starts_with=self.prefix)
        return (f.name for f in files if f.name != (self.prefix.rstrip('/') + '/'))

    def _get_value(self, key, inplace=False, validate=True):
        container = self.client['container']
        blob = container.download_blob(key)
        blob_str = blob.content_as_text()
        value = json.loads(blob_str)
        assert isinstance(value, dict), "For cloud storage it's allowed to use dict (one task) per json file only"
        return value

    def _set_value(self, key, value):
        if not isinstance(value, str):
            value = json.dumps(value)
        container = self.client['container']
        blob = container.get_blob_client(key)
        blob.upload_blob(value)


class AzureBlobCompletionsStorageForm(BaseStorageForm):
    prefix = StringField('Prefix', [Optional()], description='Azure Blob prefix')
    create_local_copy = BooleanField('Create local copy', description='Create a local copy on your disk', default=True)

    bound_params = dict(
        prefix='prefix',
        create_local_copy='create_local_copy',
        **BaseStorageForm.bound_params
    )


class AzureBlobCompletionsStorage(AzureBlobStorage):

    form = AzureBlobCompletionsStorageForm

    def __init__(self, use_blob_urls=False, regex='.*', **kwargs):
        """Completion Storages are unfiltered JSON storages"""
        super(AzureBlobCompletionsStorage, self).__init__(use_blob_urls=False, regex='.*', **kwargs)

    def _validate_object(self, key):
        value = self._get_value(key)
        if any((
            'completions' not in value,
            'id' not in value,
            not isinstance(value['completions'], list)
        )):
            raise ValueError('Invalid completion format found by key ' + key)
