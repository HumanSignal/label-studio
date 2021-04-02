"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import ujson as json
import os
import logging

from copy import deepcopy
from core.utils.io import json_load, delete_dir_content, iter_files, remove_file_or_dir
from .base import BaseStorage, BaseForm, CloudStorage


logger = logging.getLogger(__name__)


class JSONStorage(BaseStorage):

    description = 'JSON task file'

    def __init__(self, **kwargs):
        super(JSONStorage, self).__init__(**kwargs)
        tasks = {}
        if os.path.exists(self.path):
            tasks = json_load(self.path, int_keys=True)
        if len(tasks) == 0:
            self.data = {}
        elif isinstance(tasks, dict):
            self.data = tasks
        elif isinstance(self.data, list):
            self.data = {int(task['id']): task for task in tasks}
        self._save()

    def _save(self):
        with open(self.path, mode='w', encoding='utf8') as fout:
            json.dump(self.data, fout, ensure_ascii=False)

    @property
    def readable_path(self):
        return self.path

    def get(self, id):
        return self.data.get(int(id))

    def set(self, id, value):
        self.data[int(id)] = value
        self._save()

    def __contains__(self, id):
        return id in self.data

    def set_many(self, ids, values):
        for id, value in zip(ids, values):
            self.data[int(id)] = value
        self._save()

    def ids(self):
        return self.data.keys()

    def max_id(self):
        return max(self.ids(), default=-1)

    def items(self):
        return self.data.items()

    def remove(self, key):
        self.data.pop(int(key), None)
        self._save()

    def remove_all(self, ids=None):
        if ids is None:
            self.data = {}
        else:
            [self.data.pop(i, None) for i in ids]
        self._save()

    def empty(self):
        return len(self.data) == 0

    def sync(self):
        pass


def already_exists_error(what, path):
    raise RuntimeError('{path} {what} already exists. Use "--force" option to recreate it.'.format(
        path=path, what=what))


class DirJSONsStorage(BaseStorage):

    description = 'Directory with JSON task files'

    def __init__(self, **kwargs):
        super(DirJSONsStorage, self).__init__(**kwargs)
        os.makedirs(self.path, exist_ok=True)
        self.cache = {}

    @property
    def readable_path(self):
        return self.path

    def get(self, id):
        if id in self.cache:
            return self.cache[id]
        else:
            filename = os.path.join(self.path, str(id) + '.json')
            if os.path.exists(filename):
                data = json_load(filename)
                self.cache[id] = data
                return data

    def __contains__(self, id):
        return id in set(self.ids())

    def set(self, id, value):
        filename = os.path.join(self.path, str(id) + '.json')
        with open(filename, 'w', encoding='utf8') as fout:
            json.dump(value, fout, indent=2, sort_keys=True)
        self.cache[id] = value

    def set_many(self, keys, values):
        self.cache.clear()
        raise NotImplementedError

    def ids(self):
        for f in iter_files(self.path, '.json'):
            yield int(os.path.splitext(os.path.basename(f))[0])

    def max_id(self):
        return max(self.ids(), default=-1)

    def sync(self):
        pass

    def items(self):
        for id in self.ids():
            filename = os.path.join(self.path, str(id) + '.json')
            yield id, self.cache[id] if id in self.cache else json_load(filename)

    def remove(self, id):
        filename = os.path.join(self.path, str(id) + '.json')
        if os.path.exists(filename):
            os.remove(filename)
            self.cache.pop(id, None)

    def remove_all(self, ids=None):
        if ids is None:
            self.cache.clear()
            delete_dir_content(self.path)
        else:
            for i in ids:
                self.cache.pop(i, None)
                path = os.path.join(self.path, str(i) + '.json')
                try:
                    remove_file_or_dir(path)
                except OSError:
                    logger.warning('Storage file already removed: ' + path)

    def empty(self):
        return next(self.ids(), None) is None


class TasksJSONStorage(JSONStorage):

    form = BaseForm
    description = 'Local [loading tasks from "tasks.json" file]'

    def __init__(self, path, project_path, **kwargs):
        super(TasksJSONStorage, self).__init__(
            project_path=project_path,
            path=os.path.join(project_path, 'tasks.json'))


class ExternalTasksJSONStorage(CloudStorage):

    form = BaseForm
    description = 'Local [loading tasks from "tasks.json" file]'

    def __init__(self, name, path, project_path, prefix=None, create_local_copy=False, regex='.*', **kwargs):
        super(ExternalTasksJSONStorage, self).__init__(
            name=name,
            project_path=project_path,
            path=os.path.join(project_path, 'tasks.json'),
            use_blob_urls=False,
            prefix=None,
            regex=None,
            create_local_copy=False,
            sync_in_thread=False,
            **kwargs
        )
        # data is used as a local cache for tasks.json file
        self.data = {}

    def _save(self):
        with open(self.path, mode='w', encoding='utf8') as fout:
            json.dump(self.data, fout, ensure_ascii=False)

    def _get_client(self):
        pass

    def validate_connection(self):
        pass

    @property
    def url_prefix(self):
        return ''

    @property
    def readable_path(self):
        return self.path

    def _get_value(self, key, inplace=False):
        return self.data[int(key)] if inplace else deepcopy(self.data[int(key)])

    def _set_value(self, key, value):
        self.data[int(key)] = value

    def set(self, id, value):
        with self.thread_lock:
            super(ExternalTasksJSONStorage, self).set(id, value)
            self._save()

    def set_many(self, ids, values):
        with self.thread_lock:
            for id, value in zip(ids, values):
                super(ExternalTasksJSONStorage, self)._pre_set(id, value)
            self._save_ids()
            self._save()

    def _extract_task_id(self, full_key):
        return int(full_key.split(self.key_prefix, 1)[-1])

    def iter_full_keys(self):
        return (self.key_prefix + key for key in self._get_objects())

    def _get_objects(self):
        self.data = json_load(self.path, int_keys=True)
        return (str(id) for id in self.data)

    def _remove_id_from_keys_map(self, id):
        full_key = self.key_prefix + str(id)
        assert id in self._ids_keys_map, 'No such task id: ' + str(id)
        assert self._ids_keys_map[id]['key'] == full_key, (self._ids_keys_map[id]['key'], full_key)
        self._selected_ids.remove(id)
        self._ids_keys_map.pop(id)
        self._keys_ids_map.pop(full_key)

    def remove(self, id):
        with self.thread_lock:
            id = int(id)

            logger.debug('Remove id=' + str(id) + ' from ids.json')
            self._remove_id_from_keys_map(id)
            self._save_ids()

            logger.debug('Remove id=' + str(id) + ' from tasks.json')
            self.data.pop(id, None)
            self._save()

    def remove_all(self, ids=None):
        with self.thread_lock:
            remove_ids = self.data if ids is None else ids

            logger.debug('Remove ' + str(len(remove_ids)) + ' records from ids.json')
            for id in remove_ids:
                self._remove_id_from_keys_map(id)
            self._save_ids()

            logger.debug('Remove all data from tasks.json')
            # remove record from tasks.json
            if ids is None:
                self.data = {}
            else:
                for id in remove_ids:
                    self.data.pop(id, None)
            self._save()


class AnnotationsDirStorage(DirJSONsStorage):

    form = BaseForm
    description = 'Local [annotations are in "annotations" directory]'

    def __init__(self, name, path, project_path, **kwargs):
        super(AnnotationsDirStorage, self).__init__(
            name=name,
            project_path=project_path,
            path=os.path.join(project_path, 'annotations'))
