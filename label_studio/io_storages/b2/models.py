"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

import json
import logging
import re
from typing import Union
from urllib.parse import urlparse

import boto3
from core.redis import start_job_async_or_sync
from django.conf import settings
from django.db import models
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from io_storages.b2.utils import (
    catch_and_reraise_from_none,
    get_client_and_resource,
    resolve_b2_url,
)
from io_storages.base_models import (
    ExportStorage,
    ExportStorageLink,
    ImportStorage,
    ImportStorageLink,
    ProjectStorageMixin,
)
from io_storages.utils import StorageObject, load_tasks_json, storage_can_resolve_bucket_url
from tasks.models import Annotation

from label_studio.io_storages.b2.utils import B2

logger = logging.getLogger(__name__)
logging.getLogger('botocore').setLevel(logging.CRITICAL)
boto3.set_stream_logger(level=logging.INFO)

# Cache for B2 clients to avoid re-creating them on every request
clients_cache = {}


class B2StorageMixin(models.Model):
    """
    Mixin for Backblaze B2 Cloud Storage connection settings.
    
    B2 is S3-compatible, so we use boto3 with custom endpoints.
    Unlike AWS S3, B2 requires:
    - An explicit endpoint URL (e.g., https://s3.us-west-004.backblazeb2.com)
    - Application Key ID and Application Key (equivalent to AWS credentials)
    - No special session tokens or SSE KMS keys
    """
    
    bucket = models.TextField(
        _('bucket'),
        null=True,
        blank=True,
        help_text='B2 bucket name'
    )
    prefix = models.TextField(
        _('prefix'),
        null=True,
        blank=True,
        help_text='B2 bucket prefix (folder path)'
    )
    regex_filter = models.TextField(
        _('regex_filter'),
        null=True,
        blank=True,
        help_text='Cloud storage regex for filtering objects',
    )
    use_blob_urls = models.BooleanField(
        _('use_blob_urls'),
        default=False,
        help_text='Interpret objects as BLOBs and generate URLs',
    )
    
    # B2-specific credentials
    # Note: These are called "Application Key ID" and "Application Key" in B2 UI,
    # but we use AWS-compatible naming for boto3 compatibility
    b2_access_key_id = models.TextField(
        _('b2_access_key_id'),
        null=True,
        blank=True,
        help_text='B2 Application Key ID (equivalent to AWS_ACCESS_KEY_ID)'
    )
    b2_secret_access_key = models.TextField(
        _('b2_secret_access_key'),
        null=True,
        blank=True,
        help_text='B2 Application Key (equivalent to AWS_SECRET_ACCESS_KEY)',
    )
    
    # B2-specific endpoint configuration
    # B2 uses region-specific endpoints like: https://s3.us-west-004.backblazeb2.com
    b2_endpoint_url = models.TextField(
        _('b2_endpoint_url'),
        null=True,
        blank=True,
        help_text='B2 S3-compatible endpoint URL (e.g., https://s3.us-west-004.backblazeb2.com)'
    )
    region_name = models.TextField(
        _('region_name'),
        null=True,
        blank=True,
        help_text='B2 Region (e.g., us-west-004, us-east-005, eu-central-003)'
    )

    @catch_and_reraise_from_none
    def get_client_and_resource(self):
        """
        Get or create cached boto3 client and resource for B2.
        
        B2 client initialization takes ~100ms, so we cache clients to avoid
        performance issues when processing many tasks.
        """
        # Create cache key from connection parameters
        cache_key = f'{self.b2_access_key_id}:{self.b2_secret_access_key}:{self.b2_endpoint_url}:{self.region_name}'
        if cache_key in clients_cache:
            return clients_cache[cache_key]

        # Create new client and resource
        result = get_client_and_resource(
            self.b2_access_key_id,
            self.b2_secret_access_key,
            self.b2_endpoint_url,
            self.region_name,
        )
        clients_cache[cache_key] = result
        return result

    def get_client(self):
        """Get boto3 client for B2."""
        client, _ = self.get_client_and_resource()
        return client

    def get_client_and_bucket(self, validate_connection=True):
        """Get boto3 client and bucket resource for B2."""
        client, b2 = self.get_client_and_resource()
        if validate_connection:
            self.validate_connection(client)
        return client, b2.Bucket(self.bucket)

    @catch_and_reraise_from_none
    def validate_connection(self, client=None):
        """
        Validate connection to B2 bucket.
        
        For import storage, we check that at least one object exists with the prefix.
        For export storage, we only check that the bucket exists (prefix can be empty).
        """
        logger.debug('validate_connection')
        if client is None:
            client = self.get_client()
        
        # Check if this is an export storage class
        is_export = 'Export' in self.__class__.__name__
        
        if self.prefix:
            logger.debug(
                f'[Class {self.__class__.__name__}]: Test connection to B2 bucket {self.bucket} '
                f'with prefix {self.prefix} using ListObjectsV2 operation'
            )
            result = client.list_objects_v2(Bucket=self.bucket, Prefix=self.prefix, MaxKeys=1)
            # We expect 1 key with the prefix for imports. For exports it's okay if there are 0 with the prefix.
            expected_keycount = 0 if is_export else 1
            if (keycount := result.get('KeyCount')) is None or keycount < expected_keycount:
                raise KeyError(f'{self.url_scheme}://{self.bucket}/{self.prefix} not found.')
        else:
            logger.debug(
                f'[Class {self.__class__.__name__}]: Test connection to B2 bucket {self.bucket} '
                f'using HeadBucket operation'
            )
            client.head_bucket(Bucket=self.bucket)

    @property
    def path_full(self):
        """Full path to the storage location."""
        prefix = self.prefix or ''
        return f'{self.url_scheme}://{self.bucket}/{prefix}'

    @property
    def type_full(self):
        """Human-readable storage type name."""
        return 'Backblaze B2'

    @catch_and_reraise_from_none
    def get_bytes_stream(self, uri, range_header=None):
        """
        Get file directly from B2 using iter_chunks without wrapper.

        This method forwards Range headers directly to B2 and returns the raw stream.
        Note: The returned stream is NOT seekable and will break if seeking backwards.

        Args:
            uri: The B2 URI of the file to retrieve
            range_header: Optional HTTP Range header to forward to B2

        Returns:
            Tuple of (stream, content_type, metadata) where metadata contains
            important B2 headers like ETag, ContentLength, etc.
        """
        # Parse URI to get bucket and key
        parsed_uri = urlparse(uri, allow_fragments=False)
        bucket_name = parsed_uri.netloc
        key = parsed_uri.path.lstrip('/')

        # Get B2 client
        client = self.get_client()

        try:
            # Forward Range header to B2 if provided
            request_params = {'Bucket': bucket_name, 'Key': key}
            if range_header:
                request_params['Range'] = range_header

            # Get the object from B2
            response = client.get_object(**request_params)

            # Extract metadata to return
            metadata = {
                'ETag': response.get('ETag'),
                'ContentLength': response.get('ContentLength'),
                'ContentRange': response.get('ContentRange'),
                'LastModified': response.get('LastModified'),
                'StatusCode': response['ResponseMetadata']['HTTPStatusCode'],
            }

            # Return the streaming body directly
            return response['Body'], response.get('ContentType'), metadata

        except Exception as e:
            logger.error(f'Error getting direct stream from B2 for uri {uri}: {e}', exc_info=True)
            return None, None, {}

    class Meta:
        abstract = True


class B2ImportStorageBase(B2StorageMixin, ImportStorage):
    """
    Base class for B2 Import Storage.
    
    This class provides the core functionality for importing tasks from B2 buckets.
    """

    url_scheme = 'b2'

    presign = models.BooleanField(
        _('presign'),
        default=True,
        help_text='Generate presigned URLs'
    )
    presign_ttl = models.PositiveSmallIntegerField(
        _('presign_ttl'),
        default=1,
        help_text='Presigned URLs TTL (in minutes)'
    )
    recursive_scan = models.BooleanField(
        _('recursive scan'),
        default=False,
        help_text=_('Perform recursive scan over the bucket content'),
    )

    @catch_and_reraise_from_none
    def iter_objects(self):
        """
        Iterate over objects in the B2 bucket.
        
        Yields:
            B2 object instances
        """
        _, bucket = self.get_client_and_bucket()
        list_kwargs = {}
        if self.prefix:
            list_kwargs['Prefix'] = self.prefix.rstrip('/') + '/'
        if not self.recursive_scan:
            list_kwargs['Delimiter'] = '/'
        bucket_iter = bucket.objects.filter(**list_kwargs).all()
        regex = re.compile(str(self.regex_filter)) if self.regex_filter else None
        for obj in bucket_iter:
            key = obj.key
            if key.endswith('/'):
                logger.debug(key + ' is skipped because it is a folder')
                continue
            if regex and not regex.match(key):
                logger.debug(key + ' is skipped by regex filter')
                continue
            logger.debug(f'B2 {key} has passed the regex filter')
            yield obj

    @catch_and_reraise_from_none
    def iter_keys(self):
        """Iterate over object keys in the B2 bucket."""
        for obj in self.iter_objects():
            yield obj.key

    def get_unified_metadata(self, obj):
        """Get standardized metadata for an object."""
        return {
            'key': obj.key,
            'last_modified': obj.last_modified,
            'size': obj.size,
        }

    @catch_and_reraise_from_none
    def scan_and_create_links(self):
        """Scan B2 bucket and create task links."""
        return self._scan_and_create_links(B2ImportStorageLink)

    @catch_and_reraise_from_none
    def get_data(self, key) -> list[StorageObject]:
        """
        Get data from B2 for a given key.
        
        If use_blob_urls is True, return the B2 URL directly.
        Otherwise, read and parse the JSON content.
        """
        uri = f'{self.url_scheme}://{self.bucket}/{key}'
        if self.use_blob_urls:
            data_key = settings.DATA_UNDEFINED_NAME
            task = {data_key: uri}
            return [StorageObject(key=key, task_data=task)]

        # read task json from bucket and validate it
        _, b2 = self.get_client_and_resource()
        bucket = b2.Bucket(self.bucket)
        obj = b2.Object(bucket.name, key).get()['Body'].read()
        return load_tasks_json(obj, key)

    @catch_and_reraise_from_none
    def generate_http_url(self, url):
        """Generate HTTP URL (presigned or base64) for a B2 URL."""
        return resolve_b2_url(url, self.get_client(), self.presign, expires_in=self.presign_ttl * 60)

    @catch_and_reraise_from_none
    def can_resolve_url(self, url: Union[str, None]) -> bool:
        """Check if this storage can resolve the given URL."""
        return storage_can_resolve_bucket_url(self, url)

    @catch_and_reraise_from_none
    def get_blob_metadata(self, key):
        """Get metadata for a blob in B2."""
        return B2.get_blob_metadata(
            key,
            self.bucket,
            b2_access_key_id=self.b2_access_key_id,
            b2_secret_access_key=self.b2_secret_access_key,
            b2_endpoint_url=self.b2_endpoint_url,
            region_name=self.region_name,
        )

    class Meta:
        abstract = True


class B2ImportStorage(ProjectStorageMixin, B2ImportStorageBase):
    """Concrete model for B2 Import Storage."""
    
    class Meta:
        abstract = False


class B2ExportStorage(B2StorageMixin, ExportStorage):
    """
    B2 Export Storage for saving annotations.
    
    This storage saves annotations to a B2 bucket in JSON format.
    """
    
    @catch_and_reraise_from_none
    def save_annotation(self, annotation):
        """Save a single annotation to B2."""
        client, b2 = self.get_client_and_resource()
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = self._get_serialized_data(annotation)

        # get key that identifies this object in storage
        key = B2ExportStorageLink.get_key(annotation)
        key = str(self.prefix) + '/' + key if self.prefix else key

        # put object into storage
        # Note: B2 doesn't support AWS SSE KMS keys, so we use basic server-side encryption
        additional_params = {}

        # B2 supports server-side encryption (AES-256) automatically
        # No need to explicitly set it like with AWS
        
        b2.Object(self.bucket, key).put(Body=json.dumps(ser_annotation), **additional_params)

        # create link if everything ok
        B2ExportStorageLink.create(annotation, self)

    @catch_and_reraise_from_none
    def delete_annotation(self, annotation):
        """Delete an annotation from B2."""
        client, b2 = self.get_client_and_resource()
        logger.debug(f'Deleting object on {self.__class__.__name__} Storage {self} for annotation {annotation}')

        # get key that identifies this object in storage
        key = B2ExportStorageLink.get_key(annotation)
        key = str(self.prefix) + '/' + key if self.prefix else key

        # delete object from storage
        b2.Object(self.bucket, key).delete()

        # delete link if everything ok
        B2ExportStorageLink.objects.filter(storage=self, annotation=annotation).delete()


def async_export_annotation_to_b2_storages(annotation):
    """Async function to export annotation to all B2 export storages."""
    project = annotation.project
    if hasattr(project, 'io_storages_b2exportstorages'):
        for storage in project.io_storages_b2exportstorages.all():
            logger.debug(f'Export {annotation} to B2 storage {storage}')
            storage.save_annotation(annotation)


@receiver(post_save, sender=Annotation)
def export_annotation_to_b2_storages(sender, instance, **kwargs):
    """Signal handler to export annotation to B2 when saved."""
    storages = getattr(instance.project, 'io_storages_b2exportstorages', None)
    if storages and storages.exists():  # avoid excess jobs in rq
        start_job_async_or_sync(async_export_annotation_to_b2_storages, instance)


@receiver(pre_delete, sender=Annotation)
def delete_annotation_from_b2_storages(sender, instance, **kwargs):
    """Signal handler to delete annotation from B2 when deleted."""
    links = B2ExportStorageLink.objects.filter(annotation=instance)
    for link in links:
        storage = link.storage
        if storage.can_delete_objects:
            logger.debug(f'Delete {instance} from B2 storage {storage}')
            storage.delete_annotation(instance)


class B2ImportStorageLink(ImportStorageLink):
    """Link between a Task and B2 Import Storage."""
    
    storage = models.ForeignKey(B2ImportStorage, on_delete=models.CASCADE, related_name='links')

    @classmethod
    def exists(cls, key, storage):
        """Check if a link already exists for this key and storage."""
        storage_link_exists = super(B2ImportStorageLink, cls).exists(key, storage)
        # TODO: this is a workaround to be compatible with old keys version - remove it later
        prefix = str(storage.prefix) or ''
        return (
            storage_link_exists
            or cls.objects.filter(key=prefix + key, storage=storage.id).exists()
            or cls.objects.filter(key=prefix + '/' + key, storage=storage.id).exists()
        )


class B2ExportStorageLink(ExportStorageLink):
    """Link between an Annotation and B2 Export Storage."""
    
    storage = models.ForeignKey(B2ExportStorage, on_delete=models.CASCADE, related_name='links')

