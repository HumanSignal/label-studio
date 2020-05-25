import logging
import boto3
import json
import re
import os

from .base import CloudStorage, CloudStorageBlobForm

logger = logging.getLogger(__name__)
logging.getLogger('botocore').setLevel(logging.CRITICAL)
boto3.set_stream_logger(level=logging.INFO)


class S3Storage(CloudStorage):

    def __init__(self, prefix=None, regex=None, create_local_copy=True, **kwargs):
        super(S3Storage, self).__init__(**kwargs)
        self.prefix = prefix or ''
        self.regex = re.compile(regex) if regex else None
        self.local_dir = os.path.join(self.project_path, self.path, *self.prefix.split('/'))
        os.makedirs(self.local_dir, exist_ok=True)
        self.create_local_copy = create_local_copy
        if self.create_local_copy:
            self.objects_dir = os.path.join(self.local_dir, 'objects')
            os.makedirs(self.objects_dir, exist_ok=True)

        self.s3 = boto3.resource('s3')
        self.client = boto3.client('s3')
        self.bucket = self.s3.Bucket(self.path)
        self.last_sync_time = None
        self.sync_period_in_sec = 30

        self._ids_keys_map = {}
        self._keys_ids_map = {}
        self._ids_file = os.path.join(self.local_dir, 'ids.json')
        self._load_ids()

    def _get_client(self):
        s3 = boto3.resource('s3')
        return {
            's3': s3,
            'client': boto3.client('s3'),
            'bucket': s3.Bucket(self.path)
        }

    @property
    def readable_path(self):
        return 's3://' + self.path + '/' + self.prefix

    def _get_value(self, key):
        s3 = self.client['s3']
        try:
            obj = s3.Object(self.bucket.name, key).get()['Body'].read().decode('utf-8')
            value = json.loads(obj)
        except self.client.exceptions.NoSuchKey as e:
            logger.error('Key ' + key + ' not found in ' + self.readable_path, exc_info=True)
            return None
        except Exception as e:
            logger.error(e, exc_info=True)
        else:
            return value

    def _set_value(self, key, value):
        if not isinstance(value, str):
            value = json.dumps(value)
        s3 = self.client['s3']
        s3.Object(self.bucket.name, key).put(Body=value)

    def _get_objects(self):
        bucket = self.client['bucket']
        if self.prefix:
            return bucket.objects.filter(Prefix=self.prefix + '/', Delimiter='/')
        else:
            return bucket.objects


class S3BlobStorage(S3Storage):

    def __init__(self, data_key, **kwargs):
        super(S3BlobStorage, self).__init__(**kwargs)
        self.form = CloudStorageBlobForm
        self.data_key = data_key

    def _get_value(self, key):
        return {self.data_key: 's3://' + self.bucket.name + '/' + key}

    def _set_value(self, key, value):
        raise NotImplementedError
