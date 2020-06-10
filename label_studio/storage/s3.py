import logging
import boto3
import json

from .base import CloudStorage, BaseStorageForm, BooleanField, Optional, StringField

logger = logging.getLogger(__name__)
logging.getLogger('botocore').setLevel(logging.CRITICAL)
boto3.set_stream_logger(level=logging.INFO)


def get_client_and_resource(aws_access_key_id=None, aws_secret_access_key=None, aws_session_token=None):
    session = boto3.Session(
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        aws_session_token=aws_session_token)
    return session.client('s3'), session.resource('s3')


class S3Storage(CloudStorage):

    description = 'Amazon S3'

    def __init__(self, aws_access_key_id=None, aws_secret_access_key=None, aws_session_token=None, **kwargs):
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.aws_session_token = aws_session_token
        
        super(S3Storage, self).__init__(**kwargs)

    def _get_client(self):
        client, s3 = get_client_and_resource(self.aws_access_key_id, self.aws_secret_access_key, self.aws_session_token)
        return {
            's3': s3,
            'client': client,
            'bucket': s3.Bucket(self.path)
        }

    def validate_connection(self):
        self.client['client'].head_bucket(Bucket=self.path)

    @property
    def url_prefix(self):
        return 's3://'

    @property
    def readable_path(self):
        return self.url_prefix + self.path + '/' + self.prefix

    def _get_value(self, key):
        s3 = self.client['s3']
        bucket = self.client['bucket']
        obj = s3.Object(bucket.name, key).get()['Body'].read().decode('utf-8')
        value = json.loads(obj)
        return value

    def _set_value(self, key, value):
        if not isinstance(value, str):
            value = json.dumps(value)
        s3 = self.client['s3']
        bucket = self.client['bucket']
        logger.debug('Create new S3 object on ' + self.key_prefix + key)
        s3.Object(bucket.name, key).put(Body=value)

    def _get_objects(self):
        bucket = self.client['bucket']
        if self.prefix:
            bucket_iter = bucket.objects.filter(Prefix=self.prefix + '/', Delimiter='/').all()
        else:
            bucket_iter = bucket.objects.all()
        return (obj.key for obj in bucket_iter)


class S3CompletionsStorageForm(BaseStorageForm):
    prefix = StringField('Prefix', [Optional()], description='S3 Bucket prefix')
    create_local_copy = BooleanField('Create local copy', description='Create a local copy on your disk', default=True)

    bound_params = dict(
        prefix='prefix',
        create_local_copy='create_local_copy',
        **BaseStorageForm.bound_params
    )


class S3CompletionsStorage(S3Storage):

    form = S3CompletionsStorageForm
    
    def __init__(self, use_blob_urls=False, regex='.*', **kwargs):
        """Completion Storages are unfiltered JSON storages"""
        super(S3CompletionsStorage, self).__init__(use_blob_urls=False, regex='.*', **kwargs)

    def _validate_object(self, key):
        value = self._get_value(key)
        if any((
            'completions' not in value,
            'id' not in value,
            not isinstance(value['completions'], list)
        )):
            raise ValueError('Invalid completion format found by key ' + key)