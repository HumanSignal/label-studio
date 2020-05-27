import json
import logging

from google.cloud import storage

from .base import CloudStorage, CloudStorageBlobForm


logger = logging.getLogger(__name__)


class GCSStorage(CloudStorage):

    description = 'Google Cloud Storage'

    @property
    def readable_path(self):
        return 'gs://' + self.path + '/' + self.prefix

    def _get_client(self):
        client = storage.Client()
        return {
            'client': client,
            'bucket': client.get_bucket(self.path)
        }

    def validate_connection(self):
        pass

    def _get_objects(self):
        logger.debug('Getting GCS blobs from ' + self.path)
        bucket = self.client['bucket']
        files = bucket.list_blobs(prefix=self.prefix)
        return (f.name for f in files if f.name != (self.prefix + '/'))

    def _get_value(self, key):
        bucket = self.client['bucket']
        blob = bucket.blob(key)
        blob_str = blob.download_as_string()
        return json.loads(blob_str)
        # try:
        #     value = json.loads(blob_str)
        # except Exception as e:
        #     logger.error(e, exc_info=True)
        #     return None
        # else:
        #     return value

    def _set_value(self, key, value):
        if not isinstance(value, str):
            value = json.dumps(value)
        bucket = self.client['bucket']
        blob = bucket.blob(key)
        blob.upload_from_string(value)


class GCSBlobStorage(GCSStorage):

    form = CloudStorageBlobForm
    description = 'Google Cloud Storage with Blobs (image / audio files)'

    def __init__(self, data_key, **kwargs):
        super(GCSBlobStorage, self).__init__(**kwargs)
        self.data_key = data_key

    def _get_value(self, key):
        return {self.data_key: 'gs://' + self.path + '/' + key}

    def _set_value(self, key, value):
        raise NotImplementedError
