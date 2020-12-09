from collections import defaultdict

from label_studio.utils.io import get_temp_dir, read_yaml
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.validation import TaskValidator
from label_studio.tasks import Tasks
from .uploader import aggregate_files, aggregate_tasks, check_max_task_number


# TODO: define SQLAlchemy declarative_base()
_db = {}


def read_object_formats():
    data = read_yaml('object_formats.yml')
    o2fs = data
    f2o = {f: o for o, fs in data.items() for f in fs}
    return o2fs, f2o


class ImportState(object):

    object_to_formats, format_to_object = read_object_formats()

    def __init__(self, filelist=(), project=None, **kwargs):
        super(ImportState, self).__init__(**kwargs)

        # these are actual db columns
        self.id = 0
        self.project = project
        self.filelist = filelist
        self.tasks = []
        self.found_formats = {}
        self.selected_formats = None
        self.selected_objects = None
        self.columns_to_draw = []
        self.files_as_tasks_list = {'type': None, 'selected': False}
        self._validator = TaskValidator(self.project)

        self._update()

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
            'files_as_tasks_list': self.files_as_tasks_list
        }

    def _get_object_from_format(self, f):
        return self.format_to_object.get(f.lower().lstrip('.'))

    def _update(self):
        if self.filelist:
            request_files = {filename: open(filename, mode='rb') for filename in self.filelist}
            with get_temp_dir() as tmpdir:
                files = aggregate_files(request_files, tmpdir)
                self.tasks, found_formats = aggregate_tasks(files, self.project, self.selected_formats)
                if not self.found_formats:
                    # It's a first time we get all formats
                    self.found_formats = found_formats
                if self.selected_formats is None:
                    # It's a first time we get all formats
                    self.selected_formats, self.selected_objects = [], []
                    for format in sorted(found_formats.keys()):
                        self.selected_formats.append(format)
                        self.selected_objects.append(self._get_object_from_format(format))
                check_max_task_number(self.tasks)

        # validate tasks
        self.tasks = self._validator.to_internal_value(self.tasks)

    def apply(self):
        # get the last task id
        max_id_in_old_tasks = -1
        if not self.project.no_tasks():
            max_id_in_old_tasks = self.project.source_storage.max_id()

        new_tasks = Tasks().from_list_of_dicts(self.tasks, max_id_in_old_tasks + 1)
        try:
            self.project.source_storage.set_many(new_tasks.keys(), new_tasks.values())
        except NotImplementedError:
            raise NotImplementedError(
                'Import is not supported for the current storage ' + str(self.project.source_storage))

        # if tasks have completion - we need to implicitly save it to target
        for i in new_tasks.keys():
            for completion in new_tasks[i].get('completions', []):
                self.project.save_completion(int(i), completion)

        # update schemas based on newly uploaded tasks
        self.project.update_derived_input_schema()
        self.project.update_derived_output_schema()
        return new_tasks

    @property
    def tasks_preview(self):
        return [task['data'] for task in self.tasks]

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
        import_state = ImportState(filelist=filelist, project=project)

        global _db
        import_state.id = 1
        _db[import_state.id] = import_state
        return import_state

    @classmethod
    def create_from_data(cls, data, project):
        import_state = ImportState(project=project)
        if isinstance(data, dict):
            import_state.tasks = [data]
        elif isinstance(data, list):
            import_state.tasks = data
        else:
            raise ValidationError()

        global _db
        import_state.id = 1
        _db[import_state.id] = import_state
        return import_state

    @classmethod
    def get_by_id(cls, id):
        return _db[id]

    def update(self, **import_state_interface):
        [setattr(self, name, value) for name, value in import_state_interface.items()]
        self._update()
