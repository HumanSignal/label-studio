import os
import re
import logging
import threading
import ujson as json

from abc import ABC, abstractmethod
from datetime import datetime, timedelta

from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField
from wtforms.validators import InputRequired, Optional, ValidationError
from collections import OrderedDict

from label_studio.utils.io import json_load
from label_studio.utils.validation import TaskValidator, ValidationError as TaskValidationError
from label_studio.utils.misc import Settings

logger = logging.getLogger(__name__)

_storage = {}


def register_storage(storage_type, class_def):
    if storage_type in _storage:
        raise IndexError('Storage {} already exists'.format(storage_type))
    _storage[storage_type] = class_def


def get_storage_form(storage_type):
    return _storage[storage_type].form


def create_storage(storage_type, name, path, project_path=None, project=None, **kwargs):
    if storage_type not in _storage:
        raise NotImplementedError('Can\'t create storage "{}"'.format(storage_type))
    return _storage[storage_type](name=name, path=path, project_path=project_path, project=project, **kwargs)


def get_available_storage_names():
    out = OrderedDict()
    for key in sorted(_storage, key=lambda x: _storage[x].description):
        out[key] = _storage[key].description
    return out


class BaseForm(FlaskForm):
    bound_params = {}


class BaseStorageForm(BaseForm):
    path = StringField('Path', [InputRequired()], description='Storage path (e.g. bucket name)')

    # Bind here form fields to storage fields {"form field": "storage_field"}
    bound_params = dict(path='path')


class BaseStorage(ABC):

    form = BaseStorageForm
    description = 'Base Storage'

    def __init__(self, name, path, project_path=None, project=None, **kwargs):
        self.name = name
        self.path = path
        self.project_path = project_path
        self.project = project
        self.form_class = BaseStorageForm
        self.is_syncing = False

    def __str__(self):
        return self.__class__.__name__

    def get_params(self):
        return {
            form_param: getattr(self, storage_param)
            for form_param, storage_param in self.form.bound_params.items()
        }

    def set_project(self, project):
        self.project = project

    @property
    def default_data_key(self):
        if self.project is not None:
            if self.project.data_types.keys():
                return list(self.project.data_types.keys())[0]
        return ''

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
    def remove_all(self, ids=None):
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


class CloudStorageForm(BaseStorageForm):

    prefix = StringField('Prefix', [Optional()], description='File prefix')
    regex = StringField('Regex', [IsValidRegex()], description='File filter by regex, example: .* (If not specified, all files will be skipped)')  # noqa
    # data_key = StringField('Data key', [Optional()], description='Task tag key from your label config')
    use_blob_urls = BooleanField('Use BLOBs URLs', default=True,
                                 description='Treat every bucket object as a source file. If unchecked, Label Studio treats every bucket object as a JSON-formatted task.')
    bound_params = dict(
        prefix='prefix',
        regex='regex',
        use_blob_urls='use_blob_urls',
        # data_key='data_key',
        **BaseStorageForm.bound_params
    )


class CloudStorage(BaseStorage):

    thread_lock = threading.Lock()
    form = CloudStorageForm
    description = 'Base Cloud Storage'

    def __init__(
        self, prefix=None, regex=None, create_local_copy=True, use_blob_urls=True, data_key=None,
        sync_in_thread=True, presign=True, **kwargs
    ):
        super(CloudStorage, self).__init__(**kwargs)
        self.prefix = prefix or ''
        self.regex_str = regex
        self.regex = re.compile(self.regex_str) if self.regex_str else None
        self._ids_file = None
        if self.project_path is not None:
            self.objects_dir = os.path.join(self.project_path, 'completions')
            os.makedirs(self.objects_dir, exist_ok=True)
            self._ids_file = os.path.join(self.project_path, self.name + '.json')

        self.create_local_copy = create_local_copy
        self.use_blob_urls = use_blob_urls
        self.data_key = data_key or Settings.UPLOAD_DATA_UNDEFINED_NAME
        self.sync_in_thread = sync_in_thread
        self.presign = presign

        self.client = self._get_client()
        self.validate_connection()

        self.last_sync_time = None
        self.is_syncing = False
        self.sync_period_in_sec = 30

        self._ids_keys_map = {}
        self._selected_ids = []
        self._keys_ids_map = {}
        self._load_ids()
        self.sync()

    def get_params(self):
        """Get params to fill the form"""
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
    def url_prefix(self):
        pass

    @property
    def key_prefix(self):
        return self.url_prefix + self.path + '/'

    @property
    @abstractmethod
    def readable_path(self):
        pass

    @property
    def _save_to_file_enabled(self):
        return self.project_path is not None and self._ids_file is not None

    def _load_ids(self):
        if self._save_to_file_enabled and os.path.exists(self._ids_file):
            self._ids_keys_map = json_load(self._ids_file, int_keys=True)
            self._keys_ids_map = {item['key']: id for id, item in self._ids_keys_map.items()}

    def _save_ids(self):
        if self._save_to_file_enabled:
            with open(self._ids_file, mode='w') as fout:
                json.dump(self._ids_keys_map, fout)

    @abstractmethod
    def _get_value(self, key, inplace=False):
        pass

    def _get_value_url(self, key):
        data_key = self.data_key if self.data_key else self.default_data_key
        return {data_key: self.url_prefix + self.path + '/' + key}

    def _validate_task(self, key, parsed_data):
        """ Validate parsed data with labeling config and task structure
        """
        is_list = isinstance(parsed_data, list)
        # we support only one task per JSON file
        if not (is_list and len(parsed_data) == 1 or isinstance(parsed_data, dict)):
            raise TaskValidationError('Error at ' + str(key) + ':\n'
                                      'Cloud storages support one task per one JSON file only. '
                                      'Task must be {} or [{}] with length = 1')

        # classic validation for one task
        validator = TaskValidator(self.project)
        try:
            new_tasks = validator.to_internal_value(parsed_data if is_list else [parsed_data])
        except TaskValidationError as e:
            # pretty format of errors
            messages = e.msg_to_list()
            out = [(str(key) + ' :: ' + msg) for msg in messages]
            out = "\n".join(out)
            raise TaskValidationError(out)

        return new_tasks[0]

    def get_data(self, key, inplace=False, validate=True):
        """ :param key: task key
            :param inplace: return inplace data instead of deepcopy, it's for speedup
            :param validate: validate a task, set False for speed up
        """
        if self.use_blob_urls:
            return self._get_value_url(key)
        else:
            # read task json from bucket and validate it
            try:
                parsed_data = self._get_value(key, inplace)
            except Exception as e:
                raise Exception(key + ' :: ' + str(e))

            return self._validate_task(key, parsed_data) if validate else parsed_data

    def _get_key_by_id(self, id):
        item = self._ids_keys_map.get(id)
        if not item:
            # selected id not found in fetched keys
            return
        item_key = item['key']
        if not item_key.startswith(self.key_prefix + self.prefix):
            # found key not from current storage
            return
        return item_key

    def get(self, id, inplace=False, validate=True):
        item_key = self._get_key_by_id(id)
        if not item_key:
            return
        try:
            key = item_key.split(self.key_prefix, 1)[-1]
            data = self.get_data(key, inplace=inplace, validate=validate)
        except Exception as exc:
            # return {'error': True, 'message': str(exc)}
            logger.error(str(exc), exc_info=True)
            raise exc
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

    def _pre_set(self, id, value):
        if self.prefix:
            key = self.prefix + '/' + str(id)
        else:
            key = str(id)
        full_key = self.key_prefix + key
        self._set_value(key, value)
        self._ids_keys_map[id] = {'key': full_key, 'exists': True}
        self._keys_ids_map[full_key] = id
        self._selected_ids.append(id)
        return full_key

    def set(self, id, value):
        full_key = self._pre_set(id, value)
        self._save_ids()
        logger.debug('Create ' + full_key + ' in ' + self.readable_path)

        if self.create_local_copy:
            self._create_local(id, value)

    def set_many(self, keys, values):
        raise NotImplementedError

    def _create_local(self, id, value):
        local_file = os.path.join(self.objects_dir, str(id) + '.json')
        logger.debug('Creating local copy in file ' + local_file)
        with open(local_file, mode='w', encoding='utf8') as fout:
            json.dump(value, fout)

    def max_id(self):
        return max(self._ids_keys_map.keys(), default=-1)

    def ids(self):
        self.sync()
        return self._selected_ids

    def _ready_to_sync(self):
        if not self.regex_str:
            return False
        if self.last_sync_time is None:
            return True
        return (datetime.now() - self.last_sync_time) > timedelta(seconds=self.sync_period_in_sec)

    def sync(self):
        self.validate_connection()
        if self.sync_in_thread:
            if self._ready_to_sync():
                thread = threading.Thread(target=self._sync)
                thread.daemon = True
                thread.start()
            else:
                logger.debug('Not ready to sync.')
        else:
            self._sync()

    def _validate_object(self, key):
        pass

    def iter_full_keys(self):
        for key in self._get_objects():

            if self.regex is not None and not self.regex.match(key):
                logger.debug(key + ' is skipped by regex filter')
                continue

            try:
                self._validate_object(key)
            except Exception as exc:
                continue

            yield self.key_prefix + key

    def _extract_task_id(self, full_key):
        """Infer task ID from specified key (e.g. by splitting tasks.json/123)"""
        pass

    def _get_new_id(self, key, new_id):
        idx = self._extract_task_id(key)
        if idx is not None:
            return idx, new_id
        idx = new_id
        new_id += 1
        return idx, new_id

    def _sync(self):
        with self.thread_lock:
            self.is_syncing = True

            new_id = self.max_id() + 1
            new_ids_keys_map = {}
            new_keys_ids_map = {}

            full = set(self.iter_full_keys())
            intersect = full & set(self._keys_ids_map)
            exclusion = full - intersect

            # new tasks
            for key in exclusion:
                id, new_id = self._get_new_id(key, new_id)
                new_ids_keys_map[id] = {'key': key, 'exists': True}
                new_keys_ids_map[key] = id

            # old existed tasks
            for key in intersect:
                id = self._keys_ids_map[key]
                new_ids_keys_map[id] = {'key': key, 'exists': True}
                new_keys_ids_map[key] = id

            self._selected_ids = list(new_ids_keys_map.keys())
            self._ids_keys_map.update(new_ids_keys_map)
            self._keys_ids_map.update(new_keys_ids_map)
            self._save_ids()
            self.is_syncing = False
            self.last_sync_time = datetime.now()

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
        item_key = self._get_key_by_id(id)
        return item_key is not None

    def remove(self, key):
        raise NotImplementedError

    def remove_all(self, ids=None):
        raise NotImplementedError
