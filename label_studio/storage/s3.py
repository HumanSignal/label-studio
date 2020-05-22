import logging
import boto3
import json
import re
import os
import threading

from datetime import datetime, timedelta
from .base import BaseStorage
from label_studio.utils.io import json_load

logger = logging.getLogger(__name__)
logging.getLogger('botocore').setLevel(logging.CRITICAL)
boto3.set_stream_logger(level=logging.INFO)
thread_lock = threading.Lock()


class S3Storage(BaseStorage):

    def __init__(self, prefix=None, regex=None, create_local_copy=True, **kwargs):
        super(S3Storage, self).__init__(**kwargs)
        self.prefix = prefix
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

    def _load_ids(self):
        if os.path.exists(self._ids_file):
            self._ids_keys_map = json_load(self._ids_file, int_keys=True)
            self._keys_ids_map = {item['key']: id for id, item in self._ids_keys_map.items()}

    def _save_ids(self):
        with open(self._ids_file, mode='w') as fout:
            json.dump(self._ids_keys_map, fout, indent=2)

    @property
    def readable_path(self):
        return 's3://' + self.path + '/' + self.prefix

    def _get_value(self, key):
        try:
            obj = self.s3.Object(self.bucket.name, key).get()['Body'].read().decode('utf-8')
        except self.client.exceptions.NoSuchKey as e:
            logger.error('Key ' + key + ' not found in ' + self.readable_path, exc_info=True)
            return None
        return json.loads(obj)

    def get(self, id):
        item = self._ids_keys_map.get(id)
        if item:
            data = self._get_value(item['key'])
            if data is None:
                return
            if 'data' in data:
                data['id'] = id
                return data
            else:
                return {'data': data, 'id': id}

    def _set_value(self, key, value):
        if not isinstance(value, str):
            value = json.dumps(value)
        self.s3.Object(self.bucket.name, key).put(Body=value)

    def _id_to_key(self, id):
        if not isinstance(id, str):
            id = str(id)
        if id.startswith(self.prefix):
            return id
        if self.prefix is not None:
            if self.prefix.endswith('/'):
                return self.prefix + id
            return self.prefix + '/' + id
        return id

    def set(self, id, value):
        key = self._id_to_key(id)
        logger.debug('Create ' + key + ' in ' + self.readable_path)
        self._set_value(key, value)
        self._ids_keys_map[id] = {'key': key, 'exists': True}
        self._keys_ids_map[key] = id
        self._save_ids()
        if self.create_local_copy:
            self._create_local(id, value)

    def _create_local(self, id, value):
        with open(os.path.join(self.objects_dir, str(id)), mode='w') as fout:
            json.dump(value, fout, indent=2)

    def set_many(self, keys, values):
        raise NotImplementedError

    def max_id(self):
        return max(self._ids_keys_map.keys(), default=-1)

    def ids(self):
        self.sync()
        return self._ids_keys_map.keys()

    def _ready_to_sync(self):
        if self.last_sync_time is None:
            return True
        return (datetime.now() - self.last_sync_time) > timedelta(seconds=self.sync_period_in_sec)

    def sync(self):
        if self._ready_to_sync():
            logger.debug('Sync with S3 ' + self.readable_path)
            thread = threading.Thread(target=self._sync)
            thread.start()
        else:
            logger.debug('Not ready to sync.')

    def _sync(self):
        with thread_lock:
            self.last_sync_time = datetime.now()

        new_id = self.max_id() + 1
        new_ids_keys_map = {}
        new_keys_ids_map = {}

        for obj in self.bucket.objects.filter(Prefix=self.prefix + '/', Delimiter='/').all():
            key = obj.key
            if self.regex and not self.regex.match(key):
                continue
            if key not in self._keys_ids_map:
                new_ids_keys_map[new_id] = {'key': key, 'exists': True}
                new_keys_ids_map[key] = new_id
                new_id += 1

        with thread_lock:
            self._ids_keys_map.update(new_ids_keys_map)
            self._keys_ids_map.update(new_keys_ids_map)
            self._save_ids()

    def items(self):
        for id in self.ids():
            obj = self.get(id)
            if obj:
                yield id, obj

    def remove(self, key):
        raise NotImplementedError

    def remove_all(self):
        raise NotImplementedError

    def empty(self):
        self.sync()
        return len(self._ids_keys_map) == 0

    def __contains__(self, id):
        return id in self._ids_keys_map


class S3BlobStorage(S3Storage):

    def __init__(self, data_key, **kwargs):
        super(S3BlobStorage, self).__init__(**kwargs)
        self.data_key = data_key

    def _get_value(self, key):
        return {self.data_key: 's3://' + self.bucket.name + '/' + key}

    def _set_value(self, key, value):
        raise NotImplementedError
