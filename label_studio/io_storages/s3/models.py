"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from typing import TYPE_CHECKING
import re
import logging
import json
import boto3  # type: ignore[import]

from core.redis import start_job_async_or_sync
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.dispatch import receiver
from django.db.models.signals import post_save, pre_delete

from io_storages.s3.utils import get_client_and_resource, resolve_s3_url
from tasks.validation import ValidationError as TaskValidationError  # type: ignore[attr-defined]
from tasks.models import Annotation
from core.feature_flags import flag_set  # type: ignore[attr-defined]
from io_storages.base_models import (
    ExportStorage,
    ExportStorageLink,
    ImportStorage,
    ImportStorageLink,
    ProjectStorageMixin
)

if TYPE_CHECKING:
    from io_storages.s3.utils import AWS
else:
    from label_studio.io_storages.s3.utils import AWS

logger = logging.getLogger(__name__)
logging.getLogger('botocore').setLevel(logging.CRITICAL)
boto3.set_stream_logger(level=logging.INFO)

clients_cache = {}  # type: ignore[var-annotated]


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

    def get_client_and_resource(self):  # type: ignore[no-untyped-def]
        # s3 client initialization ~ 100 ms, for 30 tasks it's a 3 seconds, so we need to cache it
        cache_key = f'{self.aws_access_key_id}:{self.aws_secret_access_key}:{self.aws_session_token}:{self.region_name}:{self.s3_endpoint}'
        if cache_key in clients_cache:
            return clients_cache[cache_key]

        result = get_client_and_resource(  # type: ignore[no-untyped-call]
            self.aws_access_key_id, self.aws_secret_access_key, self.aws_session_token, self.region_name,
            self.s3_endpoint)
        clients_cache[cache_key] = result
        return result

    def get_client(self):  # type: ignore[no-untyped-def]
        client, _ = self.get_client_and_resource()  # type: ignore[no-untyped-call]
        return client

    def get_client_and_bucket(self, validate_connection=True):  # type: ignore[no-untyped-def]
        client, s3 = self.get_client_and_resource()  # type: ignore[no-untyped-call]
        if validate_connection:
            self.validate_connection(client)  # type: ignore[no-untyped-call]
        return client, s3.Bucket(self.bucket)

    def validate_connection(self, client=None):  # type: ignore[no-untyped-def]
        logger.debug('validate_connection')
        if client is None:
            client = self.get_client()  # type: ignore[no-untyped-call]
        # we need to check path existence for Import storages only
        if self.prefix and 'Export' not in self.__class__.__name__:
            logger.debug(f'Test connection to bucket {self.bucket} with prefix {self.prefix}')
            result = client.list_objects_v2(Bucket=self.bucket, Prefix=self.prefix, MaxKeys=1)
            if not result.get('KeyCount'):
                raise KeyError(f'{self.url_scheme}://{self.bucket}/{self.prefix} not found.')  # type: ignore[attr-defined]
        else:
            logger.debug(f'Test connection to bucket {self.bucket}')
            client.head_bucket(Bucket=self.bucket)

    @property
    def path_full(self):  # type: ignore[no-untyped-def]
        prefix = self.prefix or ''
        return f'{self.url_scheme}://{self.bucket}/{prefix}'  # type: ignore[attr-defined]

    @property
    def type_full(self):  # type: ignore[no-untyped-def]
        return 'Amazon AWS S3'

    class Meta:
        abstract = True


class S3ImportStorageBase(S3StorageMixin, ImportStorage):

    url_scheme = 's3'

    presign = models.BooleanField(
        _('presign'), default=True,
        help_text='Generate presigned URLs')
    presign_ttl = models.PositiveSmallIntegerField(
        _('presign_ttl'), default=1,
        help_text='Presigned URLs TTL (in minutes)')
    recursive_scan = models.BooleanField(
        _('recursive scan'), default=False,
        help_text=_('Perform recursive scan over the bucket content'))

    def iterkeys(self):  # type: ignore[no-untyped-def]
        client, bucket = self.get_client_and_bucket()  # type: ignore[no-untyped-call]
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

    def scan_and_create_links(self):  # type: ignore[no-untyped-def]
        return self._scan_and_create_links(S3ImportStorageLink)  # type: ignore[no-untyped-call]

    def _get_validated_task(self, parsed_data, key):  # type: ignore[no-untyped-def]
        """ Validate parsed data with labeling config and task structure
        """
        if not isinstance(parsed_data, dict):
            raise TaskValidationError('Error at ' + str(key) + ':\n'
                                      'Cloud storage supports one task (one dict object) per JSON file only. ')
        return parsed_data

    def get_data(self, key):  # type: ignore[no-untyped-def]
        uri = f'{self.url_scheme}://{self.bucket}/{key}'
        if self.use_blob_urls:
            data_key = settings.DATA_UNDEFINED_NAME
            return {data_key: uri}

        # read task json from bucket and validate it
        _, s3 = self.get_client_and_resource()  # type: ignore[no-untyped-call]
        bucket = s3.Bucket(self.bucket)
        obj = s3.Object(bucket.name, key).get()['Body'].read().decode('utf-8')
        value = json.loads(obj)
        if not isinstance(value, dict):
            raise ValueError(f"Error on key {key}: For S3 your JSON file must be a dictionary with one task")

        value = self._get_validated_task(value, key)  # type: ignore[no-untyped-call]
        return value

    def generate_http_url(self, url):  # type: ignore[no-untyped-def]
        return resolve_s3_url(url, self.get_client(), self.presign, expires_in=self.presign_ttl * 60)  # type: ignore[no-untyped-call, no-untyped-call]

    def get_blob_metadata(self, key):  # type: ignore[no-untyped-def]
        return AWS.get_blob_metadata(key, self.bucket, aws_access_key_id=self.aws_access_key_id,  # type: ignore[arg-type]
                                     aws_secret_access_key=self.aws_secret_access_key,
                                     aws_session_token=self.aws_session_token, region_name=self.region_name,
                                     s3_endpoint=self.s3_endpoint)

    class Meta:
        abstract = True


class S3ImportStorage(ProjectStorageMixin, S3ImportStorageBase):
    class Meta:
        abstract = False


class S3ExportStorage(S3StorageMixin, ExportStorage):

    def save_annotation(self, annotation):  # type: ignore[no-untyped-def]
        client, s3 = self.get_client_and_resource()  # type: ignore[no-untyped-call]
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = self._get_serialized_data(annotation)  # type: ignore[no-untyped-call]

        # get key that identifies this object in storage
        key = S3ExportStorageLink.get_key(annotation)  # type: ignore[no-untyped-call]
        key = str(self.prefix) + '/' + key if self.prefix else key

        # put object into storage
        additional_params = {}
        if flag_set('fflag_feat_back_lsdv_3958_server_side_encryption_for_target_storage_short', user='auto'):  # type: ignore[no-untyped-call]
            additional_params = {'ServerSideEncryption': 'AES256'}
        s3.Object(self.bucket, key).put(
            Body=json.dumps(ser_annotation),
            **additional_params
        )

        # create link if everything ok
        S3ExportStorageLink.create(annotation, self)  # type: ignore[no-untyped-call]

    def delete_annotation(self, annotation):  # type: ignore[no-untyped-def]
        client, s3 = self.get_client_and_resource()  # type: ignore[no-untyped-call]
        logger.debug(f'Deleting object on {self.__class__.__name__} Storage {self} for annotation {annotation}')

        # get key that identifies this object in storage
        key = S3ExportStorageLink.get_key(annotation)  # type: ignore[no-untyped-call]
        key = str(self.prefix) + '/' + key if self.prefix else key

        # delete object from storage
        s3.Object(self.bucket, key).delete()

        # delete link if everything ok
        S3ExportStorageLink.objects.filter(storage=self, annotation=annotation).delete()


def async_export_annotation_to_s3_storages(annotation):  # type: ignore[no-untyped-def]
    project = annotation.project
    if hasattr(project, 'io_storages_s3exportstorages'):
        for storage in project.io_storages_s3exportstorages.all():
            logger.debug(f'Export {annotation} to S3 storage {storage}')
            storage.save_annotation(annotation)


@receiver(post_save, sender=Annotation)
def export_annotation_to_s3_storages(sender, instance, **kwargs):  # type: ignore[no-untyped-def]
    storages = getattr(instance.project, 'io_storages_s3exportstorages', None)
    if storages and storages.exists():  # avoid excess jobs in rq
        start_job_async_or_sync(async_export_annotation_to_s3_storages, instance)  # type: ignore[no-untyped-call]


@receiver(pre_delete, sender=Annotation)
def delete_annotation_from_s3_storages(sender, instance, **kwargs):  # type: ignore[no-untyped-def]
    links = S3ExportStorageLink.objects.filter(annotation=instance)
    for link in links:
        storage = link.storage
        if storage.can_delete_objects:
            logger.debug(f'Delete {instance} from S3 storage {storage}')  # nosec
            storage.delete_annotation(instance)  # type: ignore[no-untyped-call]


class S3ImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(S3ImportStorage, on_delete=models.CASCADE, related_name='links')

    @classmethod
    def exists(cls, key, storage):  # type: ignore[no-untyped-def]
        storage_link_exists = super(S3ImportStorageLink, cls).exists(key, storage)  # type: ignore[no-untyped-call]
        # TODO: this is a workaround to be compatible with old keys version - remove it later
        prefix = str(storage.prefix) or ''
        return storage_link_exists or \
            cls.objects.filter(key=prefix + key, storage=storage.id).exists() or \
            cls.objects.filter(key=prefix + '/' + key, storage=storage.id).exists()


class S3ExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(S3ExportStorage, on_delete=models.CASCADE, related_name='links')
