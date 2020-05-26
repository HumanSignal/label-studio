import logging
import boto3
import json

from .base import CloudStorage, CloudStorageBlobForm

logger = logging.getLogger(__name__)
logging.getLogger('botocore').setLevel(logging.CRITICAL)
boto3.set_stream_logger(level=logging.INFO)


class S3Storage(CloudStorage):

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
        bucket = self.client['bucket']
        try:
            obj = s3.Object(bucket.name, key).get()['Body'].read().decode('utf-8')
            value = json.loads(obj)
        except self.client['client'].exceptions.NoSuchKey as e:
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
        bucket = self.client['bucket']
        s3.Object(bucket.name, key).put(Body=value)

    def _get_objects(self):
        bucket = self.client['bucket']
        if self.prefix:
            bucket_iter = bucket.objects.filter(Prefix=self.prefix + '/', Delimiter='/').all()
        else:
            bucket_iter = bucket.objects.all()
        return (obj.key for obj in bucket_iter)


class S3BlobStorage(S3Storage):

    def __init__(self, data_key, **kwargs):
        super(S3BlobStorage, self).__init__(**kwargs)
        self.form = CloudStorageBlobForm()
        self.data_key = data_key

    def _get_value(self, key):
        bucket = self.client['bucket']
        return {self.data_key: 's3://' + bucket.name + '/' + key}

    def _set_value(self, key, value):
        raise NotImplementedError
