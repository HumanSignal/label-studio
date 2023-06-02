"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import re
import logging
import json
import os

from core.redis import start_job_async_or_sync
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.dispatch import receiver
from django.db.models.signals import post_save, pre_delete
from rest_framework.exceptions import NotFound

from label_studio.io_storages.oss.utils import OssClient
from tasks.validation import ValidationError as TaskValidationError
from tasks.models import Annotation
from io_storages.base_models import (
    ExportStorage,
    ExportStorageLink,
    ImportStorage,
    ImportStorageLink,
    ProjectStorageMixin
)

logger = logging.getLogger(__name__)
logging.getLogger('botocore').setLevel(logging.CRITICAL)

clients_cache = {}


class OSSStorageMixin(models.Model):
    bucket = models.TextField(
        _('bucket'), null=True, blank=True,
        help_text='OSS bucket name')
    prefix = models.TextField(
        _('prefix'), null=True, blank=True,
        help_text='OSS bucket prefix')
    regex_filter = models.TextField(
        _('regex_filter'), null=True, blank=True,
        help_text='Cloud storage regex for filtering objects')
    use_blob_urls = models.BooleanField(
        _('use_blob_urls'), default=False,
        help_text='Interpret objects as BLOBs and generate URLs')
    oss_access_key_id = models.TextField(
        _('oss_access_key_id'), null=True, blank=True,
        help_text='OSS_ACCESS_KEY_ID')
    oss_secret_access_key = models.TextField(
        _('oss_secret_access_key'), null=True, blank=True,
        help_text='OSS_SECRET_ACCESS_KEY')
    region_name = models.TextField(
        _('region_name'), null=True, blank=True,
        help_text='OSS Region')
    oss_endpoint = models.TextField(
        _('oss_endpoint'), null=True, blank=True,
        help_text='OSS Endpoint')

    def get_client_and_resource(self):
        # oss client initialization ~ 100 ms, for 30 tasks it's a 3 seconds, so we need to cache it
        cache_key = f'{self.oss_access_key_id}:{self.oss_secret_access_key}:{self.bucket}:{self.region_name}:{self.oss_endpoint}'
        if cache_key in clients_cache:
            return clients_cache[cache_key]
        client = OssClient(self.bucket, self.oss_access_key_id, self.oss_secret_access_key, self.oss_endpoint, self.region_name)
        clients_cache[cache_key] = client
        return client

    def get_client(self):
        client = self.get_client_and_resource()
        return client

    def validate_connection(self, client=None):
        logger.debug('validate_connection')
        if client is None:
            client = self.get_client()
        logger.debug(f'Test connection to bucket {self.bucket} with prefix {self.prefix}')
        result = client.list_objects(self.prefix, max_keys=1)
        if not result:
            raise NotFound(f'{self.url_scheme}://{self.bucket}/{self.prefix} not found.')

    @property
    def path_full(self):
        prefix = self.prefix or ''
        return f'{self.url_scheme}://{self.bucket}/{prefix}'

    @property
    def type_full(self):
        return 'Amazon OSS OSS'
    
    def inject_attr_from_settings(self):
        """从配置中注入oss等配置"""
        if not self.bucket:
            self.bucket = settings.MLFLOW_OSS_BUCKET_NAME
        if not self.oss_endpoint:
            self.oss_endpoint = settings.MLFLOW_OSS_ENDPOINT_URL
        if not self.oss_access_key_id:
            self.oss_access_key_id = settings.MLFLOW_OSS_KEY_ID
        if not self.oss_secret_access_key:
            self.oss_secret_access_key = settings.MLFLOW_OSS_KEY_SECRET

    class Meta:
        abstract = True


class OSSImportStorageBase(OSSStorageMixin, ImportStorage):

    url_scheme = 'oss'

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
        client = self.get_client()
        regex = re.compile(str(self.regex_filter)) if self.regex_filter else None
        next_marker = ""
        if not self.recursive_scan:
            delimiter = '/'
        else:
            delimiter = ''
        while True:
            obj = client.bucket.list_objects(prefix=self.prefix, delimiter=delimiter, marker=next_marker, max_keys=100)
            for i in obj.object_list:
                key = i.key
                if key.endswith('/'):
                    logger.debug(key + ' is skipped because it is a folder')
                    continue
                if regex and not regex.match(key):
                    logger.debug(key + ' is skipped by regex filter')
                    continue
                yield key
            if obj.is_truncated:
                next_marker = obj.next_marker
            else:
                break

    def scan_and_create_links(self):
        return self._scan_and_create_links(OSSImportStorageLink)

    def _get_validated_task(self, parsed_data, key):
        """ Validate parsed data with labeling config and task structure
        """
        if not isinstance(parsed_data, dict):
            raise TaskValidationError('Error at ' + str(key) + ':\n'
                                      'Cloud storage supports one task (one dict object) per JSON file only. ')
        return parsed_data

    def get_data(self, key):
        uri = f'{self.url_scheme}://{self.bucket}/{key}'
        if self.use_blob_urls:
            data_key = settings.DATA_UNDEFINED_NAME
            return {data_key: uri}

        # read task json from bucket and validate it
        oss_client = self.get_client_and_resource()
        obj = oss_client.bucket.get_object(key).read().decode('utf-8')
        value = json.loads(obj)
        if not isinstance(value, dict):
            raise ValueError(f"Error on key {key}: For OSS your JSON file must be a dictionary with one task")

        value = self._get_validated_task(value, key)
        return value

    def generate_http_url(self, url):
        key = url.split(f"{self.bucket}/")[1]
        return self.get_client().resolve_oss_url(key, self.presign_ttl * 60)

    class Meta:
        abstract = True


class OSSImportStorage(ProjectStorageMixin, OSSImportStorageBase):
    class Meta:
        abstract = False


class OSSExportStorage(OSSStorageMixin, ExportStorage):

    def save_annotation(self, annotation):
        client = self.get_client_and_resource()
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = self._get_serialized_data(annotation)

        # 获取标注任务的原始对象oss key
        key = OSSExportStorageLink.get_key(annotation)
        
        key =  os.path.join(str(self.prefix), settings.SYNC_ANNOTATION_DIR, key) if self.prefix else key

        # put object into storage
        client.put_object(key, json.dumps(ser_annotation))

        # create link if everything ok
        OSSExportStorageLink.create(annotation, self)

    def delete_annotation(self, annotation):
        pass


def async_export_annotation_to_oss_storages(annotation):
    project = annotation.project
    if hasattr(project, 'io_storages_ossexportstorages'):
        for storage in project.io_storages_ossexportstorages.all():
            logger.debug(f'Export {annotation} to OSS storage {storage}')
            storage.save_annotation(annotation)


@receiver(post_save, sender=Annotation)
def export_annotation_to_oss_storages(sender, instance, **kwargs):
    storages = getattr(instance.project, 'io_storages_ossexportstorages', None)
    if storages and storages.exists():  # avoid excess jobs in rq
        start_job_async_or_sync(async_export_annotation_to_oss_storages, instance)


@receiver(pre_delete, sender=Annotation)
def delete_annotation_from_oss_storages(sender, instance, **kwargs):
    links = OSSExportStorageLink.objects.filter(annotation=instance)
    for link in links:
        storage = link.storage
        if storage.can_delete_objects:
            logger.debug(f'Delete {instance} from OSS storage {storage}')  # nosec
            storage.delete_annotation(instance)


class OSSImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(OSSImportStorage, on_delete=models.CASCADE, related_name='links')

    @classmethod
    def exists(cls, key, storage):
        storage_link_exists = super(OSSImportStorageLink, cls).exists(key, storage)
        # TODO: this is a workaround to be compatible with old keys version - remove it later
        prefix = str(storage.prefix) or ''
        return storage_link_exists or \
            cls.objects.filter(key=prefix + key, storage=storage.id).exists() or \
            cls.objects.filter(key=prefix + '/' + key, storage=storage.id).exists()


class OSSExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(OSSExportStorage, on_delete=models.CASCADE, related_name='links')

    def get_key(annotation):
        """生成对象名称: 文件名称"""
        file_path = list(annotation.task.data.values())[0]
        if not file_path:
            logging.error(f"annotation 获取oss path失败 {annotation.id}")
            raise NotFound(f"annotation 获取oss path失败 {annotation.id}")
        return os.path.basename(file_path) + ".json"