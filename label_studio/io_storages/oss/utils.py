"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import base64
import oss2

from botocore.exceptions import ClientError
from urllib.parse import urlparse
from core.utils.params import get_env


logger = logging.getLogger(__name__)


import os
from oss2 import SizedFileAdapter, determine_part_size
from oss2.models import PartInfo
import oss2
from itertools import islice




class OssClient(object):

    def __init__(self, bucket_name=None, oss_access_key_id=None, oss_secret_access_key=None, 
                 endpoint=None, region=None):
        self.bucket_name = bucket_name or get_env('OSS_BUCKET_NAME')
        self.oss_access_key_id = oss_access_key_id or get_env('OSS_ACCESS_KEY_ID')
        self.oss_secret_access_key = oss_secret_access_key or get_env('OSS_SECRET_ACCESS_KEY')
        self.endpoint = endpoint or get_env('OSS_ENDPOINT')
        self.auth = oss2.Auth(self.oss_access_key_id, self.oss_secret_access_key)
        self.bucket = oss2.Bucket(self.auth, self.endpoint, self.bucket_name, region=None)
        
    def bucket_info(self):
        bucket = self.bucket.get_bucket_info()
        return {
            'name': bucket.name,
            'storage_class': bucket.storage_class,
            'creation_date': bucket.creation_date,
            'intranet_endpoint':bucket.intranet_endpoint,
            'extranet_endpoint': bucket.extranet_endpoint,
            'owner_id': bucket.owner.id,
            'grant': bucket.acl.grant
        }
    
    def download_objects(self):
        return
    
    def put_object(self, key, data):
        return self.bucket.put_object(key, data)
    
    def get_objects(self, key):
        return self.bucket.get_object(key).read()
    
    def list_objects(self, prefix, max_keys=100):
        lst = []
        for b in oss2.ObjectIterator(self.bucket, prefix=prefix, max_keys=max_keys):
            obj = {}
            obj['name'] = b.key
            obj['last_modified'] = b.last_modified
            obj['etag'] = b.etag
            obj['type'] = b.type
            obj['size'] = b.size
            obj['storage_class'] = b.storage_class
            obj['url'] =  self.bucket.sign_url('GET', b.key, 60) #60(s)
            lst.append(obj)
            break
        return lst

    def resolve_oss_url(self, obj_name, time=60):
        obj_url = self.bucket.sign_url('GET', obj_name, time)
        return obj_url
