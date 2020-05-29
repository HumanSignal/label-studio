import json
import os

from label_studio.utils.io import json_load, delete_dir_content, iter_files
from .base import BaseStorage, BaseForm


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
            json.dump(self.data, fout, ensure_ascii=False, indent=2)

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

    def remove_all(self):
        self.data = {}
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

    @property
    def readable_path(self):
        return self.path

    def get(self, id):
        filename = os.path.join(self.path, str(id) + '.json')
        if os.path.exists(filename):
            return json_load(filename)

    def __contains__(self, id):
        return id in set(self.ids())

    def set(self, id, value):
        filename = os.path.join(self.path, str(id) + '.json')
        with open(filename, 'w', encoding='utf8') as fout:
            json.dump(value, fout, indent=2, sort_keys=True)

    def set_many(self, keys, values):
        raise NotImplementedError

    def ids(self):
        for f in iter_files(self.path, '.json'):
            yield int(os.path.splitext(os.path.basename(f))[0])

    def max_id(self):
        return max(self.ids(), default=-1)

    def sync(self):
        pass

    def items(self):
        for key in self.ids():
            filename = os.path.join(self.path, str(key) + '.json')
            yield key, json_load(filename)

    def remove(self, key):
        filename = os.path.join(self.path, str(key) + '.json')
        if os.path.exists(filename):
            os.remove(filename)

    def remove_all(self):
        delete_dir_content(self.path)

    def empty(self):
        return next(self.ids(), None) is None


class TasksJSONStorage(JSONStorage):

    form = BaseForm
    description = 'Local [loading tasks from "tasks.json" file]'

    def __init__(self, path, project_path, **kwargs):
        super(TasksJSONStorage, self).__init__(
            project_path=project_path,
            path=os.path.join(project_path, 'tasks.json'))


class CompletionsDirStorage(DirJSONsStorage):

    form = BaseForm
    description = 'Local [completions are in "completions" directory]'

    def __init__(self, path, project_path, **kwargs):
        super(CompletionsDirStorage, self).__init__(
            project_path=project_path,
            path=os.path.join(project_path, 'completions'))
