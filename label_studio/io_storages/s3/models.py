"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import re
import logging
import json
import boto3

from botocore.exceptions import NoCredentialsError
from django.db import models, transaction
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.dispatch import receiver
from django.db.models.signals import post_save

from io_storages.base_models import ImportStorage, ImportStorageLink, ExportStorage, ExportStorageLink
from io_storages.utils import get_uri_via_regex
from io_storages.s3.utils import get_client_and_resource, resolve_s3_url
from tasks.validation import ValidationError as TaskValidationError
from tasks.models import Annotation

logger = logging.getLogger(__name__)
logging.getLogger('botocore').setLevel(logging.CRITICAL)
boto3.set_stream_logger(level=logging.INFO)
url_scheme = 's3'


class S3StorageMixin(models.Model):
    bucket = models.TextField(
        _('bucket'), null=True, blank=True,
        help_text='S3 bucket name')
    prefix = models.TextField(
        _('prefix'), null=True, blank=True,
        help_text='S3 bucket prefix')
    regex_filter = models.TextField(
        _('regex_filter'), null=True, blank=True,
        help_text='Cloud storage regex for filtering objects')
    use_blob_urls = models.BooleanField(
        _('use_blob_urls'), default=False,
        help_text='Interpret objects as BLOBs and generate URLs')
    aws_access_key_id = models.TextField(
        _('aws_access_key_id'), null=True, blank=True,
        help_text='AWS_ACCESS_KEY_ID')
    aws_secret_access_key = models.TextField(
        _('aws_secret_access_key'), null=True, blank=True,
        help_text='AWS_SECRET_ACCESS_KEY')
    aws_session_token = models.TextField(
        _('aws_session_token'), null=True, blank=True,
        help_text='AWS_SESSION_TOKEN')
    region_name = models.TextField(
        _('region_name'), null=True, blank=True,
        help_text='AWS Region')
    s3_endpoint = models.TextField(
        _('s3_endpoint'), null=True, blank=True,
        help_text='S3 Endpoint')

    def get_client_and_resource(self):
        return get_client_and_resource(
            self.aws_access_key_id, self.aws_secret_access_key, self.aws_session_token, self.region_name,
            self.s3_endpoint)

    def get_client(self):
        client, _ = self.get_client_and_resource()
        return client

    def get_client_and_bucket(self, validate_connection=True):
        client, s3 = self.get_client_and_resource()
        if validate_connection:
            self.validate_connection(client)
        return client, s3.Bucket(self.bucket)

    def validate_connection(self, client=None):
        if client is None:
            client = self.get_client()
        if self.prefix:
            logger.debug(f'Test connection to bucket {self.bucket} with prefix {self.prefix}')
            result = client.list_objects_v2(Bucket=self.bucket, Prefix=self.prefix, MaxKeys=1)
            if not result.get('KeyCount'):
                raise KeyError(f's3://{self.bucket}/{self.prefix} not found.')
        else:
            logger.debug(f'Test connection to bucket {self.bucket}')
            client.head_bucket(Bucket=self.bucket)

    @property
    def path_full(self):
        prefix = self.prefix or ''
        return f'{url_scheme}://{self.bucket}/{prefix}'

    @property
    def type_full(self):
        return 'Amazon AWS S3'

    class Meta:
        abstract = True


class S3ImportStorage(S3StorageMixin, ImportStorage):

    presign = models.BooleanField(
        _('presign'), default=True,
        help_text='Generate presigned URLs')
    presign_ttl = models.PositiveSmallIntegerField(
        _('presign_ttl'), default=1,
        help_text='Presigned URLs TTL (in minutes)')
    recursive_scan = models.BooleanField(
        _('recursive scan'), default=False,
        help_text=_('Perform recursive scan over the bucket content'))

    def iterkeys(self):
        client, bucket = self.get_client_and_bucket()
        if self.prefix:
            list_kwargs = {'Prefix': self.prefix.rstrip('/') + '/'}
            if not self.recursive_scan:
                list_kwargs['Delimiter'] = '/'
            bucket_iter = bucket.objects.filter(**list_kwargs).all()
        else:
            bucket_iter = bucket.objects.all()
        regex = re.compile(str(self.regex_filter)) if self.regex_filter else None
        for obj in bucket_iter:
            key = obj.key
            if key.endswith('/'):
                logger.debug(key + ' is skipped because it is a folder')
                continue
            if regex and not regex.match(key):
                logger.debug(key + ' is skipped by regex filter')
                continue
            yield key

    def scan_and_create_links(self):
        return self._scan_and_create_links(S3ImportStorageLink)

    def _get_validated_task(self, parsed_data, key):
        """ Validate parsed data with labeling config and task structure
        """
        if not isinstance(parsed_data, dict):
            raise TaskValidationError('Error at ' + str(key) + ':\n'
                                      'Cloud storage supports one task (one dict object) per JSON file only. ')
        return parsed_data

    def get_data(self, key):
        uri = f's3://{self.bucket}/{key}'
        if self.use_blob_urls:
            data_key = settings.DATA_UNDEFINED_NAME
            return {data_key: uri}

        # read task json from bucket and validate it
        _, s3 = self.get_client_and_resource()
        bucket = s3.Bucket(self.bucket)
        obj = s3.Object(bucket.name, key).get()['Body'].read().decode('utf-8')
        value = json.loads(obj)
        if not isinstance(value, dict):
            raise ValueError(f"Error on key {key}: For S3 your JSON file must be a dictionary with one task")

        value = self._get_validated_task(value, key)
        return value

    def resolve_uri(self, data):
        try:
            uri, storage = get_uri_via_regex(data, prefixes=(url_scheme,))
            if not storage:
                return
            resolved_uri = resolve_s3_url(uri, self.get_client(), self.presign, expires_in=self.presign_ttl * 60)
            return data.replace(uri, resolved_uri)
        except NoCredentialsError:
            logger.warning(f'No AWS credentials specified for {data}')


class S3ExportStorage(S3StorageMixin, ExportStorage):

    def save_annotation(self, annotation):
        client, s3 = self.get_client_and_resource()
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = self._get_serialized_data(annotation)
        with transaction.atomic():
            # Create export storage link
            link = S3ExportStorageLink.create(annotation, self)
            key = str(self.prefix) + '/' + link.key if self.prefix else link.key
            try:
                s3.Object(self.bucket, key).put(Body=json.dumps(ser_annotation))
            except Exception as exc:
                logger.error(f"Can't export annotation {annotation} to S3 storage {self}. Reason: {exc}", exc_info=True)


@receiver(post_save, sender=Annotation)
def export_annotation_to_s3_storages(sender, instance, **kwargs):
    project = instance.task.project
    if hasattr(project, 'io_storages_s3exportstorages'):
        for storage in project.io_storages_s3exportstorages.all():
            logger.debug(f'Export {instance} to S3 storage {storage}')
            storage.save_annotation(instance)


class S3ImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(S3ImportStorage, on_delete=models.CASCADE, related_name='links')

    @classmethod
    def exists(cls, key, storage):
        storage_link_exists = super(S3ImportStorageLink, cls).exists(key, storage)
        # TODO: this is a workaround to be compatible with old keys version - remove it later
        prefix = str(storage.prefix) or ''
        return storage_link_exists or \
            cls.objects.filter(key=prefix + key, storage=storage.id).exists() or \
            cls.objects.filter(key=prefix + '/' + key, storage=storage.id).exists()


class S3ExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(S3ExportStorage, on_delete=models.CASCADE, related_name='links')
