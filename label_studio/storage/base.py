import os
import json
import re
import logging
import threading

from abc import ABC, abstractmethod
from datetime import datetime, timedelta

from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField
from wtforms.validators import InputRequired, Optional, ValidationError
from collections import OrderedDict

from label_studio.utils.io import json_load

logger = logging.getLogger(__name__)

_storage = {}


def register_storage(storage_type, class_def):
    if storage_type in _storage:
        raise IndexError('Storage {} already exists'.format(storage_type))
    _storage[storage_type] = class_def


def get_storage_form(storage_type):
    return _storage[storage_type].form


def create_storage(storage_type, path, project_path=None, **kwargs):
    if storage_type not in _storage:
        raise NotImplementedError('Can\'t create storage "{}"'.format(storage_type))
    return _storage[storage_type](path=path, project_path=project_path, **kwargs)


def get_available_storage_names():
    out = OrderedDict()
    for key in sorted(_storage, key=lambda x: _storage[x].description):
        out[key] = _storage[key].description
    return out


class BaseForm(FlaskForm):
    bound_params = {}


class BaseStorageForm(BaseForm):
    path = StringField('Path', [InputRequired()], description='Path')

    # Bind here form fields to storage fields {"form field": "storage_field"}
    bound_params = dict(path='path')


class BaseStorage(ABC):

    form = BaseStorageForm
    description = 'Base Storage'

    def __init__(self, path, project_path=None, **kwargs):
        self.path = path
        self.project_path = project_path
        self.form_class = BaseStorageForm

    def get_params(self):
        return {
            form_param: getattr(self, storage_param)
            for form_param, storage_param in self.form.bound_params.items()
        }

    @property
    @abstractmethod
    def readable_path(self):
        pass

    @classmethod
    def from_dict(cls, d):
        return cls(**d)

    @abstractmethod
    def get(self, id):
        pass

    @abstractmethod
    def __contains__(self, id):
        pass

    @abstractmethod
    def set(self, id, value):
        pass

    @abstractmethod
    def set_many(self, ids, values):
        pass

    @abstractmethod
    def ids(self):
        pass

    @abstractmethod
    def max_id(self):
        pass

    @abstractmethod
    def items(self):
        pass

    @abstractmethod
    def remove(self, id):
        pass

    @abstractmethod
    def remove_all(self):
        pass

    @abstractmethod
    def empty(self):
        pass


class IsValidRegex(object):

    def __call__(self, form, field):
        try:
            re.compile(field.data)
        except re.error:
            raise ValidationError(field.data + ' is not a valid regular expression')


class CloudStorageForm(BaseForm):

    prefix = StringField('Prefix', [Optional()], description='File prefix')
    regex = StringField('Regex', [IsValidRegex()], description='File filter by regex, example: .*jpe?g')
    data_key = StringField('Data key', [InputRequired()], description='Task tag key from your label config')
    use_blob_urls = BooleanField('Use BLOBs URLs', description='Generate tasks with filtered files using tag key '
                                                               '(for resources like jpg, mp3, etc). \n'
                                                               'If not selected filtered files will be interpreted '
                                                               'as jsons with Label Studio task items inside.')
    bound_params = dict(
        prefix='prefix',
        regex='regex',
        use_blob_urls='use_blob_urls',
        data_key='data_key'
    )


class CloudStorage(BaseStorage):

    thread_lock = threading.Lock()
    form = CloudStorageForm
    description = 'Base Cloud Storage'

    def __init__(self, prefix=None, regex=None, create_local_copy=True, use_blob_urls=False, data_key=None, **kwargs):
        super(CloudStorage, self).__init__(**kwargs)
        self.prefix = prefix or ''
        self.regex_str = regex
        self.regex = re.compile(self.regex_str) if self.regex_str else None
        self.local_dir = os.path.join(self.project_path, self.__class__.__name__.lower(), self.path)
        self.create_local_copy = create_local_copy
        self.use_blob_urls = use_blob_urls
        self.data_key = data_key

        self.client = self._get_client()
        self.validate_connection()

        os.makedirs(self.local_dir, exist_ok=True)
        if self.create_local_copy:
            self.objects_dir = os.path.join(self.local_dir, 'objects')
            os.makedirs(self.objects_dir, exist_ok=True)

        self.last_sync_time = None
        self.sync_period_in_sec = 30

        self._ids_keys_map = {}
        self._selected_ids = []
        self._keys_ids_map = {}
        self._ids_file = os.path.join(self.local_dir, 'ids.json')
        self._load_ids()
        self.sync()

    def get_params(self):
        params = super(CloudStorage, self).get_params()
        params.update({
            'prefix': self.prefix,
            'regex': self.regex_str,
            'create_local_copy': self.create_local_copy
        })
        return params

    @abstractmethod
    def validate_connection(self):
        pass

    @abstractmethod
    def _get_client(self):
        pass

    @property
    @abstractmethod
    def readable_path(self):
        pass

    def _load_ids(self):
        if os.path.exists(self._ids_file):
            self._ids_keys_map = json_load(self._ids_file, int_keys=True)
            self._keys_ids_map = {item['key']: id for id, item in self._ids_keys_map.items()}

    def _save_ids(self):
        with open(self._ids_file, mode='w') as fout:
            json.dump(self._ids_keys_map, fout, indent=2)

    @abstractmethod
    def _get_value(self, key):
        pass

    @abstractmethod
    def _get_value_url(self, key):
        pass

    def get(self, id):
        item = self._ids_keys_map.get(id)
        if item:
            try:
                if self.use_blob_urls:
                    data = self._get_value_url(item['key'])
                else:
                    data = self._get_value(item['key'])
            except Exception as exc:
                # return {'error': True, 'message': str(exc)}
                logger.error(str(exc), exc_info=True)
                return
            if 'data' in data:
                data['id'] = id
                return data
            else:
                return {'data': data, 'id': id}

    def _id_to_key(self, id):
        if not isinstance(id, str):
            id = str(id)
        if self.prefix:
            if id.startswith(self.prefix):
                return id
            if self.prefix.endswith('/'):
                return self.prefix + id
            return self.prefix + '/' + id
        return id

    @abstractmethod
    def _set_value(self, key, value):
        pass

    def set(self, id, value):
        key = self._id_to_key(id)
        logger.debug('Create ' + key + ' in ' + self.readable_path)
        self._set_value(key, value)
        self._ids_keys_map[id] = {'key': key, 'exists': True}
        self._keys_ids_map[key] = id
        self._selected_ids.append(id)
        self._save_ids()
        if self.create_local_copy:
            self._create_local(id, value)

    def set_many(self, keys, values):
        raise NotImplementedError

    def _create_local(self, id, value):
        with open(os.path.join(self.objects_dir, str(id)), mode='w', encoding='utf8') as fout:
            json.dump(value, fout, indent=2)

    def max_id(self):
        return max(self._ids_keys_map.keys(), default=-1)

    def ids(self):
        self.sync()
        return self._selected_ids

    def _ready_to_sync(self):
        if self.last_sync_time is None:
            return True
        return (datetime.now() - self.last_sync_time) > timedelta(seconds=self.sync_period_in_sec)

    def sync(self):
        self.validate_connection()
        if self._ready_to_sync():
            thread = threading.Thread(target=self._sync)
            thread.daemon = True
            thread.start()
        else:
            logger.debug('Not ready to sync.')

    def _validate_object(self, key):
        pass

    def _sync(self):
        with self.thread_lock:
            self.last_sync_time = datetime.now()

        new_id = self.max_id() + 1
        new_ids_keys_map = {}
        new_keys_ids_map = {}

        for key in self._get_objects():
            try:
                self._validate_object(key)
            except Exception as exc:
                continue
            if self.regex and not self.regex.match(key):
                logger.debug(key + ' is skipped by regex filter')
                continue
            if key not in self._keys_ids_map:
                id = new_id
                new_id += 1
            else:
                id = self._keys_ids_map[key]
            new_ids_keys_map[id] = {'key': key, 'exists': True}
            new_keys_ids_map[key] = id

        with self.thread_lock:
            self._selected_ids = list(new_ids_keys_map.keys())
            self._ids_keys_map.update(new_ids_keys_map)
            self._keys_ids_map.update(new_keys_ids_map)
            self._save_ids()

    @abstractmethod
    def _get_objects(self):
        pass

    def items(self):
        for id in self.ids():
            obj = self.get(id)
            if obj:
                yield id, obj

    def empty(self):
        self.sync()
        return len(self._ids_keys_map) == 0

    def __contains__(self, id):
        return id in self._ids_keys_map

    def remove(self, key):
        raise NotImplementedError

    def remove_all(self):
        raise NotImplementedError
