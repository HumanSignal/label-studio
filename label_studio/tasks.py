import io
import json
import os
import urllib

from label_studio.utils.io import iter_files


class Tasks(object):

    _allowed_extensions = {
        'Text': ('.txt',),
        'Image': ('.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.gif'),
        'Audio': ('.wav', '.aiff', '.mp3', '.au', '.flac')
    }

    def _create_task_with_local_uri(self, filepath, data_key, task_id):
        """ Convert filepath to task with flask serving URL
        """
        from label_studio.utils.functions import HOSTNAME

        filename = os.path.basename(filepath)
        params = urllib.parse.urlencode({'d': os.path.dirname(filepath)})
        base_url = HOSTNAME + '/'
        image_url_path = base_url + urllib.parse.quote('data/' + filename)
        image_local_url = '{image_url_path}?{params}'.format(image_url_path=image_url_path, params=params)
        return {
            'id': task_id,
            'task_path': filepath,
            'data': {data_key: image_local_url}
        }

    def from_dict(self, d, task_id=0):
        task = {}
        if 'data' in d and isinstance(d['data'], dict):
            # if "data" key is presented, task is considered underneath
            task[task_id] = {'id': task_id, 'data': d['data']}
            if 'completions' in d:
                task[task_id]['completions'] = d['completions']
            if 'predictions' in d:
                task[task_id]['predictions'] = d['predictions']
        else:
            # all input dict is considered as task data, no completions/predictions is expected
            task[task_id] = {'id': task_id, 'data': d}
        return task

    def from_list_of_dicts(self, l, start_task_id=0):
        tasks = {}
        for i, t in enumerate(l):
            tasks.update(self.from_dict(t, start_task_id + i))
        return tasks

    def from_json_file(self, path, start_task_id=0):
        with open(path, encoding="utf8") as f:
            json_body = json.loads(f.read())

            # multiple tasks in file
            if isinstance(json_body, list):
                tasks = {}
                task_id = start_task_id
                for d in json_body:
                    tasks.update(self.from_dict(d, task_id))
                    task_id += 1
                return tasks

            # one task in file
            elif isinstance(json_body, dict):
                tasks = self.from_dict(json_body, start_task_id)
                return tasks

            # unsupported task type
            else:
                raise Exception('Unsupported task data:', path)

    def from_dir_with_json_files(self, path):
        tasks = {}
        for f in iter_files(path, ext='.json'):
            tasks.update(self.from_json_file(f, start_task_id=len(tasks)))
        return tasks

    def from_text_file(self, path, data_key, start_task_id=0):
        tasks = {}
        task_id = start_task_id
        with io.open(path, encoding="utf8") as f:
            for line in f:
                tasks[task_id] = {'id': task_id, 'data': {data_key: line.strip()}}
                task_id += 1
        return tasks

    def from_dir_with_text_files(self, path, data_key):
        tasks = {}
        for f in iter_files(path, ext=''):
            tasks.update(self.from_text_file(f, data_key, start_task_id=len(tasks)))
        return tasks

    def _from_dir_with_local_resources(self, path, data_key, data_type):
        tasks = {}
        for f in iter_files(path, ext=self._allowed_extensions[data_type]):
            task_id = len(tasks) + 1
            tasks[task_id] = self._create_task_with_local_uri(f, data_key, task_id)
        return tasks

    def from_dir_with_image_files(self, path, data_key):
        return self._from_dir_with_local_resources(path, data_key, 'Image')

    def from_dir_with_audio_files(self, path, data_key):
        return self._from_dir_with_local_resources(path, data_key, 'Audio')