import logging
import boto3
import json

from .base import CloudStorage, BaseForm, BooleanField, Optional, StringField

logger = logging.getLogger(__name__)
logging.getLogger('botocore').setLevel(logging.CRITICAL)
boto3.set_stream_logger(level=logging.INFO)


class S3Storage(CloudStorage):

    description = 'Amazon S3'

    def _get_client(self):
        s3 = boto3.resource('s3')
        return {
            's3': s3,
            'client': boto3.client('s3'),
            'bucket': s3.Bucket(self.path)
        }

    def validate_connection(self):
        self.client['client'].head_bucket(Bucket=self.path)

    @property
    def readable_path(self):
        return 's3://' + self.path + '/' + self.prefix

    def _get_value(self, key):
        s3 = self.client['s3']
        bucket = self.client['bucket']
        obj = s3.Object(bucket.name, key).get()['Body'].read().decode('utf-8')
        value = json.loads(obj)
        return value

    def _get_value_url(self, key):
        bucket = self.client['bucket']
        data_key = self.data_key if self.data_key else self.default_data_key
        return {data_key: 's3://' + bucket.name + '/' + key}

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


class S3CompletionsStorageForm(BaseForm):
    prefix = StringField('Prefix', [Optional()], description='S3 Bucket prefix')
    create_local_copy = BooleanField('Create local copy', description='Create a local copy on your disk', default=True)

    bound_params = dict(
        prefix='prefix',
        create_local_copy='create_local_copy'
    )


class S3CompletionsStorage(S3Storage):

    form = S3CompletionsStorageForm

    def _validate_object(self, key):
        value = self._get_value(key)
        if any((
            'completions' not in value,
            'id' not in value,
            not isinstance(value['completions'], list)
        )):
            raise ValueError('Invalid completion format found by key ' + key)