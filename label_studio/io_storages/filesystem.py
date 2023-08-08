"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import ujson as json
import os
import logging

from copy import deepcopy
from core.utils.io import json_load, delete_dir_content, iter_files, remove_file_or_dir
from .base import BaseStorage, BaseForm, CloudStorage  # type: ignore[import]


logger = logging.getLogger(__name__)


class JSONStorage(BaseStorage):  # type: ignore[misc]

    description = 'JSON task file'

    def __init__(self, **kwargs):  # type: ignore[no-untyped-def]
        super(JSONStorage, self).__init__(**kwargs)
        tasks = {}
        if os.path.exists(self.path):
            tasks = json_load(self.path, int_keys=True)  # type: ignore[no-untyped-call]
        if len(tasks) == 0:
            self.data = {}
        elif isinstance(tasks, dict):
            self.data = tasks
        elif isinstance(self.data, list):
            self.data = {int(task['id']): task for task in tasks}
        self._save()  # type: ignore[no-untyped-call]

    def _save(self):  # type: ignore[no-untyped-def]
        with open(self.path, mode='w', encoding='utf8') as fout:
            json.dump(self.data, fout, ensure_ascii=False)

    @property
    def readable_path(self):  # type: ignore[no-untyped-def]
        return self.path

    def get(self, id):  # type: ignore[no-untyped-def]
        return self.data.get(int(id))

    def set(self, id, value):  # type: ignore[no-untyped-def]
        self.data[int(id)] = value
        self._save()  # type: ignore[no-untyped-call]

    def __contains__(self, id):  # type: ignore[no-untyped-def]
        return id in self.data

    def set_many(self, ids, values):  # type: ignore[no-untyped-def]
        for id, value in zip(ids, values):
            self.data[int(id)] = value
        self._save()  # type: ignore[no-untyped-call]

    def ids(self):  # type: ignore[no-untyped-def]
        return self.data.keys()

    def max_id(self):  # type: ignore[no-untyped-def]
        return max(self.ids(), default=-1)  # type: ignore[no-untyped-call]

    def items(self):  # type: ignore[no-untyped-def]
        return self.data.items()

    def remove(self, key):  # type: ignore[no-untyped-def]
        self.data.pop(int(key), None)
        self._save()  # type: ignore[no-untyped-call]

    def remove_all(self, ids=None):  # type: ignore[no-untyped-def]
        if ids is None:
            self.data = {}
        else:
            [self.data.pop(i, None) for i in ids]
        self._save()  # type: ignore[no-untyped-call]

    def empty(self):  # type: ignore[no-untyped-def]
        return len(self.data) == 0

    def sync(self):  # type: ignore[no-untyped-def]
        pass


def already_exists_error(what, path):  # type: ignore[no-untyped-def]
    raise RuntimeError('{path} {what} already exists. Use "--force" option to recreate it.'.format(
        path=path, what=what))


class DirJSONsStorage(BaseStorage):  # type: ignore[misc]

    description = 'Directory with JSON task files'

    def __init__(self, **kwargs):  # type: ignore[no-untyped-def]
        super(DirJSONsStorage, self).__init__(**kwargs)
        os.makedirs(self.path, exist_ok=True)
        self.cache = {}

    @property
    def readable_path(self):  # type: ignore[no-untyped-def]
        return self.path

    def get(self, id):  # type: ignore[no-untyped-def]
        if id in self.cache:
            return self.cache[id]
        else:
            filename = os.path.join(self.path, str(id) + '.json')
            if os.path.exists(filename):
                data = json_load(filename)  # type: ignore[no-untyped-call]
                self.cache[id] = data
                return data

    def __contains__(self, id):  # type: ignore[no-untyped-def]
        return id in set(self.ids())  # type: ignore[no-untyped-call]

    def set(self, id, value):  # type: ignore[no-untyped-def]
        filename = os.path.join(self.path, str(id) + '.json')
        with open(filename, 'w', encoding='utf8') as fout:
            json.dump(value, fout, indent=2, sort_keys=True)
        self.cache[id] = value

    def set_many(self, keys, values):  # type: ignore[no-untyped-def]
        self.cache.clear()
        raise NotImplementedError

    def ids(self):  # type: ignore[no-untyped-def]
        for f in iter_files(self.path, '.json'):  # type: ignore[no-untyped-call]
            yield int(os.path.splitext(os.path.basename(f))[0])

    def max_id(self):  # type: ignore[no-untyped-def]
        return max(self.ids(), default=-1)  # type: ignore[no-untyped-call]

    def sync(self):  # type: ignore[no-untyped-def]
        pass

    def items(self):  # type: ignore[no-untyped-def]
        for id in self.ids():  # type: ignore[no-untyped-call]
            filename = os.path.join(self.path, str(id) + '.json')
            yield id, self.cache[id] if id in self.cache else json_load(filename)  # type: ignore[no-untyped-call]

    def remove(self, id):  # type: ignore[no-untyped-def]
        filename = os.path.join(self.path, str(id) + '.json')
        if os.path.exists(filename):
            os.remove(filename)
            self.cache.pop(id, None)

    def remove_all(self, ids=None):  # type: ignore[no-untyped-def]
        if ids is None:
            self.cache.clear()
            delete_dir_content(self.path)  # type: ignore[no-untyped-call]
        else:
            for i in ids:
                self.cache.pop(i, None)
                path = os.path.join(self.path, str(i) + '.json')
                try:
                    remove_file_or_dir(path)  # type: ignore[no-untyped-call]
                except OSError:
                    logger.warning('Storage file already removed: ' + path)

    def empty(self):  # type: ignore[no-untyped-def]
        return next(self.ids(), None) is None  # type: ignore[no-untyped-call]


class TasksJSONStorage(JSONStorage):

    form = BaseForm
    description = 'Local [loading tasks from "tasks.json" file]'

    def __init__(self, path, project_path, **kwargs):  # type: ignore[no-untyped-def]
        super(TasksJSONStorage, self).__init__(  # type: ignore[no-untyped-call]
            project_path=project_path,
            path=os.path.join(project_path, 'tasks.json'))


class ExternalTasksJSONStorage(CloudStorage):  # type: ignore[misc]

    form = BaseForm
    description = 'Local [loading tasks from "tasks.json" file]'

    def __init__(self, name, path, project_path, prefix=None, create_local_copy=False, regex='.*', **kwargs):  # type: ignore[no-untyped-def]
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

    def _save(self):  # type: ignore[no-untyped-def]
        with open(self.path, mode='w', encoding='utf8') as fout:
            json.dump(self.data, fout, ensure_ascii=False)

    def _get_client(self):  # type: ignore[no-untyped-def]
        pass

    def validate_connection(self):  # type: ignore[no-untyped-def]
        pass

    @property
    def url_prefix(self):  # type: ignore[no-untyped-def]
        return ''

    @property
    def readable_path(self):  # type: ignore[no-untyped-def]
        return self.path

    def _get_value(self, key, inplace=False):  # type: ignore[no-untyped-def]
        return self.data[int(key)] if inplace else deepcopy(self.data[int(key)])

    def _set_value(self, key, value):  # type: ignore[no-untyped-def]
        self.data[int(key)] = value

    def set(self, id, value):  # type: ignore[no-untyped-def]
        with self.thread_lock:
            super(ExternalTasksJSONStorage, self).set(id, value)
            self._save()  # type: ignore[no-untyped-call]

    def set_many(self, ids, values):  # type: ignore[no-untyped-def]
        with self.thread_lock:
            for id, value in zip(ids, values):
                super(ExternalTasksJSONStorage, self)._pre_set(id, value)
            self._save_ids()
            self._save()  # type: ignore[no-untyped-call]

    def _extract_task_id(self, full_key):  # type: ignore[no-untyped-def]
        return int(full_key.split(self.key_prefix, 1)[-1])

    def iter_full_keys(self):  # type: ignore[no-untyped-def]
        return (self.key_prefix + key for key in self._get_objects())  # type: ignore[no-untyped-call]

    def _get_objects(self):  # type: ignore[no-untyped-def]
        self.data = json_load(self.path, int_keys=True)  # type: ignore[no-untyped-call]
        return (str(id) for id in self.data)

    def _remove_id_from_keys_map(self, id):  # type: ignore[no-untyped-def]
        full_key = self.key_prefix + str(id)
        assert id in self._ids_keys_map, 'No such task id: ' + str(id)
        assert self._ids_keys_map[id]['key'] == full_key, (self._ids_keys_map[id]['key'], full_key)
        self._selected_ids.remove(id)
        self._ids_keys_map.pop(id)
        self._keys_ids_map.pop(full_key)

    def remove(self, id):  # type: ignore[no-untyped-def]
        with self.thread_lock:
            id = int(id)

            logger.debug('Remove id=' + str(id) + ' from ids.json')
            self._remove_id_from_keys_map(id)  # type: ignore[no-untyped-call]
            self._save_ids()

            logger.debug('Remove id=' + str(id) + ' from tasks.json')
            self.data.pop(id, None)
            self._save()  # type: ignore[no-untyped-call]

    def remove_all(self, ids=None):  # type: ignore[no-untyped-def]
        with self.thread_lock:
            remove_ids = self.data if ids is None else ids

            logger.debug('Remove ' + str(len(remove_ids)) + ' records from ids.json')
            for id in remove_ids:
                self._remove_id_from_keys_map(id)  # type: ignore[no-untyped-call]
            self._save_ids()

            logger.debug('Remove all data from tasks.json')
            # remove record from tasks.json
            if ids is None:
                self.data = {}
            else:
                for id in remove_ids:
                    self.data.pop(id, None)
            self._save()  # type: ignore[no-untyped-call]


class AnnotationsDirStorage(DirJSONsStorage):

    form = BaseForm
    description = 'Local [annotations are in "annotations" directory]'

    def __init__(self, name, path, project_path, **kwargs):  # type: ignore[no-untyped-def]
        super(AnnotationsDirStorage, self).__init__(  # type: ignore[no-untyped-call]
            name=name,
            project_path=project_path,
            path=os.path.join(project_path, 'annotations'))
