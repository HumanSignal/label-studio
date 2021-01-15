import logging

from copy import deepcopy

from label_studio.utils.io import get_temp_dir, read_yaml
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.validation import TaskValidator
from label_studio.utils.misc import Settings
from label_studio.tasks import Tasks
from .uploader import aggregate_files, aggregate_tasks


logger = logging.getLogger(__name__)


def read_object_formats():
    data = read_yaml('object_formats.yml')
    o2fs = data
    f2o = {f: o for o, fs in data.items() for f in fs}
    return o2fs, f2o


class ImportState(object):

    # TODO: define SQLAlchemy declarative_base()
    _db = {}

    object_to_formats, format_to_object = read_object_formats()
    AMBIGUOUS_TASKS_LIST_FORMATS = {'csv', 'tsv', 'txt'}

    def __init__(self, filelist=(), tasks=(), project=None, **kwargs):
        super(ImportState, self).__init__(**kwargs)

        # these are actual db columns
        self.id = 0
        self.reset()
        self.project = project
        self.filelist = filelist
        self.tasks = tasks
        self.preview_size = 10

        self._validator = None

        if project and (filelist or tasks):
            self._update()

    def reset(self):
        self.project = None
        self.filelist = ()
        self.tasks = ()
        self.found_formats = {}
        self.selected_formats = None
        self.selected_objects = None
        self.columns_to_draw = []
        self.data_keys = []
        self.files_as_tasks_list = {'type': None, 'selected': True}
        self.show_files_as_tasks_list = None

    def serialize(self):
        return {
            'id': self.id,
            'project': self.project.name,
            'task_preview': self.tasks_preview,
            'columns_to_draw': self.columns_to_draw,
            'total_tasks': self.total_tasks,
            'total_completions': self.total_completions,
            'total_predictions': self.total_predictions,
            'found_formats': self.found_formats,
            'selected_formats': self.selected_formats,
            'selected_objects': self.selected_objects,
            'files_as_tasks_list': self.files_as_tasks_list,
            'show_files_as_tasks_list': self.show_files_as_tasks_list
        }

    def _get_selected_objects(self):
        objects = []
        for format in self.selected_formats:
            normalized_format = format.lower().lstrip('.')
            if self.files_as_tasks_list['selected'] and normalized_format in self.AMBIGUOUS_TASKS_LIST_FORMATS:
                objects.append(None)
            else:
                objects.append(self.format_to_object.get(normalized_format))
        return objects

    def _show_files_as_tasks_list(self):
        for format in self.selected_formats:
            norm_format = format.lower().lstrip('.')
            if norm_format in self.AMBIGUOUS_TASKS_LIST_FORMATS:
                return True
        return False

    def _generate_label_config(self):
        # TODO: this is a temp workaround to guess initial config - we should make it prettier
        data_keys = list(self.data_keys)
        if len(data_keys) > 1:
            # better to use Table here
            return '<View></View>'
        if len(data_keys) == 1:
            data_key = data_keys[0]
            objects = set(self.selected_objects)
            if len(objects) > 1:
                raise ValidationError('More than one data type is presented')
            object_tag = list(objects)[0]
            if not object_tag:
                return '<View></View>'
            data_key = object_tag.lower() if data_key == Settings.UPLOAD_DATA_UNDEFINED_NAME else data_key
            return '<View><{0} name="{1}" value="${2}"/></View>'.format(object_tag, object_tag.lower(), data_key)

    def _read_tasks(self, num_tasks=None):
        request_files = {}
        for filename in self.filelist:
            request_files[filename] = open(self.project.upload_dir + '/' + filename, mode='rb')
        with get_temp_dir() as tmpdir:
            files = aggregate_files(request_files, tmpdir, self.project.upload_dir)
            tasks, found_formats, data_keys = aggregate_tasks(
                files, self.project, self.selected_formats, self.files_as_tasks_list['selected'], num_tasks)
            for file in files.values():
                try:
                    file.close()
                except:
                    pass
        return tasks, found_formats, data_keys

    def _raise_if_inconsistent_with_current_project(self):
        project_data_keys = self.project.data_keys
        if project_data_keys:
            import_data_keys = list(filter(lambda k: k != Settings.UPLOAD_DATA_UNDEFINED_NAME, self.data_keys))
            if import_data_keys and import_data_keys != project_data_keys:
                raise ValidationError(
                    "Import data inconsistent with current project:\n"
                    "Imported column names {}\nare inconsistent with common columns found in dataset: {}".format(
                        ','.join(import_data_keys), ','.join(project_data_keys)))

    def _update(self):
        if self.filelist:
            self.tasks, found_formats, self.data_keys = self._read_tasks()

            self._raise_if_inconsistent_with_current_project()

            if not self.found_formats:
                # It's a first time we get all formats
                self.found_formats = found_formats
            if self.selected_formats is None:
                # It's a first time we get all formats
                self.selected_formats, self.selected_objects = [], []
                for format in sorted(found_formats.keys()):
                    self.selected_formats.append(format)

            self.selected_objects = self._get_selected_objects()
            self.show_files_as_tasks_list = self._show_files_as_tasks_list()

        # validate tasks
        if not self._validator:
            self._validator = TaskValidator(self.project)
        self.tasks = self._validator.to_internal_value(self.tasks)

    def apply(self):
        # get the last task id
        max_id_in_old_tasks = -1
        if not self.project.no_tasks():
            max_id_in_old_tasks = self.project.source_storage.max_id()

        # now read all tasks
        # currently self._update() reads all tasks - uncomment this on change
        # all_tasks, _, _ = self._read_tasks()
        all_tasks = self.tasks

        new_tasks = Tasks().from_list_of_dicts(all_tasks, max_id_in_old_tasks + 1)
        try:
            self.project.source_storage.set_many(new_tasks.keys(), new_tasks.values())
        except NotImplementedError:
            raise NotImplementedError(
                'Import is not supported for the current storage, change storage type in project settings'
                + str(self.project.source_storage))

        # if tasks have completion - we need to implicitly save it to target
        for i in new_tasks.keys():
            for completion in new_tasks[i].get('completions', []):
                self.project.save_completion(int(i), completion)

        # update schemas based on newly uploaded tasks
        self.project.update_derived_input_schema()
        self.project.update_derived_output_schema()

        if self.project.label_config_is_empty:
            generated_label_config = self._generate_label_config()
            self.project.update_label_config(generated_label_config)
        return new_tasks

    @property
    def tasks_preview(self):
        preview = []
        for task in self.tasks[:self.preview_size]:
            t = deepcopy(task['data'])
            if 'completions' in task:
                t['completions'] = task['completions']
            if 'predictions' in task:
                t['predictions'] = task['predictions']
            preview.append(t)
        return preview

    @property
    def total_tasks(self):
        return len(self.tasks)

    @property
    def total_completions(self):
        return self._validator.completion_count

    @property
    def total_predictions(self):
        return self._validator.prediction_count

    @classmethod
    def create_from_filelist(cls, filelist, project):
        _id = 1
        if _id not in cls._db:
            i = ImportState()
            i.id = _id
            cls._db[_id] = i
        import_state = cls._db[_id]
        import_state.reset()
        import_state.filelist = filelist
        import_state.project = project
        import_state._update()

        return import_state

    @classmethod
    def create_from_data(cls, data, project):
        if isinstance(data, dict):
            tasks = [data]
        elif isinstance(data, list):
            tasks = data
        else:
            raise ValidationError('Incorrect input data type, it must be JSON dict or list')

        _id = 1
        if _id not in cls._db:
            i = ImportState()
            i.id = _id
            cls._db[_id] = i
        import_state = cls._db[_id]
        import_state.reset()
        import_state.tasks = tasks
        import_state.project = project
        import_state._update()
        return import_state

    @classmethod
    def get_by_id(cls, id):
        return cls._db[id]

    def update(self, **import_state_interface):
        [setattr(self, name, value) for name, value in import_state_interface.items()]
        self._update()
