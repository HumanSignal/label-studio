import os
import io
import logging
import json
import random

from shutil import copy2
from collections import defaultdict
from datetime import datetime
from operator import itemgetter
from xml.etree import ElementTree
from uuid import uuid4

from label_studio_converter import Converter

from label_studio.utils.misc import config_line_stripped, config_comments_free, parse_config
from label_studio.utils.analytics import Analytics
from label_studio.utils.models import ProjectObj, MLBackend
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.io import find_file, delete_dir_content, json_load
from label_studio.tasks import Tasks

logger = logging.getLogger(__name__)


class ProjectNotFound(KeyError):
    pass


class Project(object):

    _storage = {}

    def __init__(self, config, name, context=None):
        self.config = config
        self.name = name

        self.on_boarding = {}
        self.context = context or {}

        self.tasks = None
        self.label_config_line, self.label_config_full, self.input_data_tags = None, None, None
        self.derived_input_schema, self.derived_output_schema = None, None
        self.load_tasks()
        self.load_label_config()
        self.load_derived_schemas()

        self.analytics = None
        self.load_analytics()

        self.project_obj, self.ml_backend = None, None
        self.load_project_ml_backend()

        self.converter = None
        self.load_converter()
        self.max_tasks_file_size = 250

    def load_tasks(self):
        self.tasks = {}
        self.derived_input_schema = set()
        tasks = json_load(self.config['input_path'])
        if len(tasks) == 0:
            logger.warning('No tasks loaded from ' + self.config['input_path'])
            return
        for task_id, task in tasks.items():
            self.tasks[int(task_id)] = task
            data_keys = set(task['data'].keys())
            if not self.derived_input_schema:
                self.derived_input_schema = data_keys
            else:
                self.derived_input_schema &= data_keys
        print(str(len(self.tasks)) + ' tasks loaded from: ' + self.config['input_path'])

    def load_label_config(self):
        self.label_config_full = config_comments_free(open(self.config['label_config']).read())
        self.label_config_line = config_line_stripped(self.label_config_full)
        self.input_data_tags = self.get_input_data_tags(self.label_config_line)

    def load_derived_schemas(self):

        self.derived_output_schema = {
            'from_name_to_name_type': set(),
            'labels': defaultdict(set)
        }

        # for all already completed tasks we update derived output schema for further label config validation
        for task_id in self.get_task_ids():
            task_with_completions = self.get_task_with_completions(task_id)
            if task_with_completions and 'completions' in task_with_completions:
                completions = task_with_completions['completions']
                for completion in completions:
                    self._update_derived_output_schema(completion)

    def load_analytics(self):
        collect_analytics = os.getenv('collect_analytics')
        if collect_analytics is None:
            collect_analytics = self.config.get('collect_analytics', True)
        collect_analytics = bool(collect_analytics)
        self.analytics = Analytics(self.label_config_line, collect_analytics, self.name, self.context)

    def load_project_ml_backend(self):
        # configure project
        self.project_obj = ProjectObj(label_config=self.label_config_line, label_config_full=self.label_config_full)
        # configure machine learning backend
        ml_backend_params = self.config.get('ml_backend')
        if ml_backend_params:
            self.ml_backend = MLBackend.from_params(ml_backend_params)
            if not self.ml_backend.connected:
                raise ValueError('ML backend is not connected.')

    def load_converter(self):
        self.converter = Converter(self.label_config_full)

    @property
    def id(self):
        return self.project_obj.id

    @property
    def data_types(self):
        return self.project_obj.data_types

    @property
    def label_config(self):
        return self.project_obj.label_config

    @property
    def ml_backend_connected(self):
        return self.ml_backend is not None

    @property
    def task_data_login(self):
        return self.project_obj.task_data_login

    @property
    def task_data_password(self):
        return self.project_obj.task_data_password

    def extract_data_types(self, config):
        return self.project_obj.extract_data_types(config)

    def validate_label_config(self, config_string):
        self.project_obj.validate_label_config(config_string)

        parsed_config = parse_config(config_string)

        self.validate_label_config_on_derived_input_schema(parsed_config)
        self.validate_label_config_on_derived_output_schema(parsed_config)

    def update_label_config(self, new_label_config):
        label_config_file = self.config['label_config']
        # save xml label config to file
        with io.open(label_config_file, mode='w') as f:
            f.write(new_label_config)

        # reload everything that depends on label config
        self.load_label_config()
        self.load_derived_schemas()
        self.load_analytics()
        self.load_project_ml_backend()
        self.load_converter()

        # save project config state
        self.config['label_config_updated'] = True
        with io.open(self.config['config_path'], mode='w') as f:
            json.dump(self.config, f)
        logger.info('Label config saved to: {path}'.format(path=label_config_file))

    def _update_derived_output_schema(self, completion):
        """
        Given completion, output schema is updated. Output schema consists of unique tuples (from_name, to_name, type)
        and list of unique labels derived from existed completions
        :param completion:
        :return:
        """
        for result in completion['result']:
            result_type = result.get('type')
            if result_type == 'relation':
                continue
            if 'from_name' not in result or 'to_name' not in result:
                logger.error('Unexpected completion.result format: "from_name" or "to_name" not found in %r' % result)
                continue

            self.derived_output_schema['from_name_to_name_type'].add((
                result['from_name'], result['to_name'], result_type
            ))
            for label in result['value'].get(result_type, []):
                self.derived_output_schema['labels'][result['from_name']].add(label)

    def validate_label_config_on_derived_input_schema(self, config_string_or_parsed_config):
        """
        Validate label config on input schemas (tasks types and data keys) derived from imported tasks
        :param config_string_or_parsed_config: label config string or parsed config object
        :return: True if config match already imported tasks
        """

        # check if schema exists, i.e. at least one task has been uploaded
        if not self.derived_input_schema:
            return

        config = config_string_or_parsed_config
        if isinstance(config, str):
            config = parse_config(config)
        input_types, input_values = set(), set()
        for input_items in map(itemgetter('inputs'), config.values()):
            for input_item in input_items:
                input_types.add(input_item['type'])
                input_values.add(input_item['value'])

        # check input data values: they must be in schema
        for item in input_values:
            if item not in self.derived_input_schema:
                raise ValidationError(
                    'You have already imported tasks and they are incompatible with a new config. '
                    'You\'ve specified value=${item}, but imported tasks contain only keys: {input_schema_values}'
                        .format(item=item, input_schema_values=list(self.derived_input_schema)))

    def validate_label_config_on_derived_output_schema(self, config_string_or_parsed_config):
        """
        Validate label config on output schema (from_names, to_names and labeling types) derived from completions
        :param config_string_or_parsed_config: label config string or parsed config object
        :return: True if config match already created completions
        """
        output_schema = self.derived_output_schema

        # check if schema exists, i.e. at least one completion has been created
        if not output_schema['from_name_to_name_type']:
            return

        config = config_string_or_parsed_config
        if isinstance(config, str):
            config = parse_config(config)
        completion_tuples = set()

        for from_name, to in config.items():
            completion_tuples.add((from_name, to['to_name'][0], to['type'].lower()))
        for from_name, to_name, type in output_schema['from_name_to_name_type']:
            if (from_name, to_name, type) not in completion_tuples:
                raise ValidationError(
                    'You\'ve already completed some tasks, but some of them couldn\'t be loaded with this config: '
                    'name={from_name}, toName={to_name}, type={type} are expected'
                    .format(from_name=from_name, to_name=to_name, type=type)
                )
        for from_name, expected_label_set in output_schema['labels'].items():
            if from_name not in config:
                raise ValidationError(
                    'You\'ve already completed some tasks, but some of them couldn\'t be loaded with this config: '
                    'name=' + from_name + ' is expected'
                )
            found_labels = set(config[from_name]['labels'])
            extra_labels = list(expected_label_set - found_labels)
            if extra_labels:
                raise ValidationError(
                    'You\'ve already completed some tasks, but some of them couldn\'t be loaded with this config: '
                    'there are labels already created for "{from_name}":\n{extra_labels}'
                    .format(from_name=from_name, extra_labels=extra_labels)
                )

    def get_tasks(self):
        """ Load tasks from JSON files in input_path directory

        :return: file list
        """
        return self.tasks

    def delete_tasks(self):
        """
        Deletes all tasks & completions from filesystem, then reloads clean project
        :return:
        """
        delete_dir_content(self.config['output_dir'])
        if os.path.exists(self.config['input_path']) and os.path.isfile(self.config['input_path']):
            with io.open(self.config['input_path'], mode='w') as f:
                json.dump({}, f)

        # delete everything on ML backend
        if self.ml_backend:
            self.ml_backend.clear(self)

        # reload everything related to tasks
        self.load_tasks()
        self.load_derived_schemas()

    def next_task(self, completed_tasks_ids):
        completed_tasks_ids = set(completed_tasks_ids)
        sampling = self.config.get('sampling', 'sequential')
        if sampling == 'sequential':
            actual_tasks = (self.tasks[task_id] for task_id in self.tasks if task_id not in completed_tasks_ids)
            return next(actual_tasks, None)
        elif sampling == 'uniform':
            actual_tasks_ids = [task_id for task_id in self.tasks if task_id not in completed_tasks_ids]
            if not actual_tasks_ids:
                return None
            random.shuffle(actual_tasks_ids)
            return self.tasks[actual_tasks_ids[0]]
        else:
            raise NotImplementedError('Unknown sampling method ' + sampling)

    def get_task_ids(self):
        """ Get task ids only

        :return: list of task ids
        """
        return list(self.tasks.keys())

    def get_task(self, task_id):
        """ Get one task

        :param task_id:
        :return: task
        """
        try:
            task_id = int(task_id)
        except ValueError:
            return None
        return self.tasks.get(task_id)

    def iter_completions(self):
        root_dir = self.config['output_dir']
        os.mkdir(root_dir) if not os.path.exists(root_dir) else ()
        files = os.listdir(root_dir)
        for f in files:
            if f.endswith('.json'):
                yield os.path.join(root_dir, f)

    def get_completions_ids(self):
        """ List completion ids from output_dir directory

        :return: filenames without extensions and directories
        """
        completions = []
        for f in self.iter_completions():
            completions.append(int(os.path.splitext(os.path.basename(f))[0]))
        logger.debug('{num} completions found in {output_dir}'.format(
            num=len(completions), output_dir=self.config["output_dir"]))
        return sorted(completions)

    def get_completed_at(self, task_ids):
        """ Get completed time for list of task ids

        :param task_ids: list of task ids
        :return: list of string with formatted datetime
        """
        root_dir = self.config['output_dir']
        existing_completions = set(self.get_completions_ids())
        ids = existing_completions.intersection(task_ids)
        times = {i: os.path.getmtime(os.path.join(root_dir, str(i) + '.json')) for i in ids}
        times = {i: datetime.fromtimestamp(t).strftime('%Y-%m-%d %H:%M:%S') for i, t in times.items()}
        return times

    def get_task_with_completions(self, task_id):
        """ Get task with completions

        :param task_id: task ids
        :return: json dict with completion
        """
        try:
            task_id = int(task_id)  # check task_id is int (disallow to escape from output_dir)
        except ValueError:
            return None

        if 'completions' in self.tasks[task_id]:
            return self.tasks[task_id]

        filename = os.path.join(self.config['output_dir'], str(task_id) + '.json')

        if os.path.exists(filename):
            data = json.load(open(filename))
            # tasks can hold the newest version of predictions, so task it from tasks
            data['predictions'] = self.tasks[task_id].get('predictions', [])
        else:
            data = None
        return data

    def save_completion(self, task_id, completion):
        """ Save completion

        :param task_id: task id
        :param completion: json data from label (editor)
        """

        # try to get completions with task first
        task = self.get_task_with_completions(task_id)

        # init task if completions with task not exists
        if not task:
            task = self.get_task(task_id)
            task['completions'] = []

        # update old completion
        updated = False
        if 'id' in completion:
            for i, item in enumerate(task['completions']):
                if item['id'] == completion['id']:
                    task['completions'][i].update(completion)
                    updated = True

        # write new completion
        if not updated:
            completion['id'] = task['id'] * 1000 + len(task['completions']) + 1
            task['completions'].append(completion)

        self._update_derived_output_schema(completion)

        # write task + completions to file
        filename = os.path.join(self.config['output_dir'], str(task_id) + '.json')
        os.mkdir(self.config['output_dir']) if not os.path.exists(self.config['output_dir']) else ()
        json.dump(task, open(filename, 'w'), indent=4, sort_keys=True)
        return completion['id']

    def delete_completion(self, task_id):
        """ Delete completion from disk

        :param task_id: task id
        """
        filename = os.path.join(self.config['output_dir'], str(task_id) + '.json')
        os.remove(filename)

        self.load_tasks()
        self.load_derived_schemas()

    def train(self):
        completions = []
        for f in self.iter_completions():
            completions.append(json_load(f))
        self.ml_backend.train(completions, self)

    @classmethod
    def get_project_dir(cls, project_name, args):
        return os.path.join(args.root_dir, project_name)

    @classmethod
    def get_input_data_tags(cls, label_config):
        tag_iter = ElementTree.fromstring(label_config).iter()
        return [
            tag for tag in tag_iter
            if tag.attrib.get('name') and tag.attrib.get('value', '').startswith('$')
        ]

    @classmethod
    def _load_tasks(cls, input_path, args, label_config_file):
        with io.open(label_config_file) as f:
            label_config = f.read()

        task_loader = Tasks()
        if args.input_format == 'json':
            return task_loader.from_json_file(input_path)
        if args.input_format == 'json-dir':
            return task_loader.from_dir_with_json_files(input_path)
        input_data_tags = cls.get_input_data_tags(label_config)

        if len(input_data_tags) > 1:
            val = ",".join(tag.attrib.get("name") for tag in input_data_tags)
            print('Warning! Multiple input data tags found: ' +
                  val + '. Only first one is used.')
        elif len(input_data_tags) == 0:
            raise ValueError(
                'You\'ve specified input format "{fmt}" which requires label config being explicitly defined. '
                'Please specify --label-config=path/to/config.xml or use --format=json or format=json_dir'.format(
                    fmt=args.input_format)
            )
        input_data_tag = input_data_tags[0]
        data_key = input_data_tag.attrib.get('value').lstrip('$')

        if args.input_format == 'text':
            return task_loader.from_text_file(input_path, data_key)
        if args.input_format == 'text-dir':
            return task_loader.from_dir_with_text_files(input_path, data_key)
        if args.input_format == 'image-dir':
            return task_loader.from_dir_with_image_files(input_path, data_key)
        if args.input_format == 'audio-dir':
            return task_loader.from_dir_with_audio_files(input_path, data_key)
        raise RuntimeError('Can\'t load tasks for input format={}'.format(args.input_format))

    @classmethod
    def create_project_dir(cls, project_name, args):
        """
        Create project directory in args.root_dir/project_name, and initialize there all required files
        If some files are missed, restore them from defaults.
        If config files are specified by args, copy them in project directory
        :param project_name:
        :param args:
        :return:
        """
        dir = cls.get_project_dir(project_name, args)
        os.makedirs(dir, exist_ok=True)

        config = json_load(args.config_path) if args.config_path else json_load(find_file('default_config.json'))

        def already_exists_error(what, path):
            raise RuntimeError('{path} {what} already exists. Use "--force" option to recreate it.'.format(
                path=path, what=what
            ))

        input_path = args.input_path or config.get('input_path')

        # save label config
        config_xml = 'config.xml'
        config_xml_path = os.path.join(dir, config_xml)
        label_config_file = args.label_config or config.get('label_config')
        if label_config_file:
            copy2(label_config_file, config_xml_path)
            print(label_config_file + ' label config copied to ' + config_xml_path)
        else:
            if os.path.exists(config_xml_path) and not args.force:
                already_exists_error('label config', config_xml_path)
            if not input_path:
                # create default config with polygons only if input data is not set
                default_label_config = find_file('examples/image_polygons/config.xml')
                copy2(default_label_config, config_xml_path)
                print(default_label_config + ' label config copied to ' + config_xml_path)
            else:
                with io.open(config_xml_path, mode='w') as fout:
                    fout.write('<View></View>')
                print('Empty config has been created in ' + config_xml_path)

        config['label_config'] = config_xml

        # save tasks.json
        tasks_json = 'tasks.json'
        tasks_json_path = os.path.join(dir, tasks_json)
        if input_path:
            tasks = cls._load_tasks(input_path, args, config_xml_path)
            with io.open(tasks_json_path, mode='w') as fout:
                json.dump(tasks, fout, indent=2)
            print('{tasks_json_path} input file with {n} tasks has been created from {input_path}'.format(
                tasks_json_path=tasks_json_path, n=len(tasks), input_path=input_path))
        else:
            if os.path.exists(tasks_json_path) and not args.force:
                already_exists_error('input path', tasks_json_path)
            with io.open(tasks_json_path, mode='w') as fout:
                json.dump({}, fout)
            print(tasks_json_path + ' input path has been created with empty tasks.')
        config['input_path'] = tasks_json

        # create completions dir
        completions_dir = os.path.join(dir, 'completions')
        if os.path.exists(completions_dir) and not args.force:
            already_exists_error('output dir', completions_dir)
        if os.path.exists(completions_dir):
            delete_dir_content(completions_dir)
            print(completions_dir + ' output dir already exists. Clear it.')
        else:
            os.makedirs(completions_dir, exist_ok=True)
            print(completions_dir + ' output dir has been created.')
        config['output_dir'] = 'completions'

        if args.ml_backend_url:
            if 'ml_backend' not in config or not isinstance(config['ml_backend'], dict):
                config['ml_backend'] = {}
            config['ml_backend']['url'] = args.ml_backend_url
            if args.ml_backend_name:
                config['ml_backend']['name'] = args.ml_backend_name
            else:
                config['ml_backend']['name'] = str(uuid4())

        config['sampling'] = args.sampling

        # create config.json
        config_json = 'config.json'
        config_json_path = os.path.join(dir, config_json)
        if os.path.exists(config_json_path) and not args.force:
            already_exists_error('config', config_json_path)
        with io.open(config_json_path, mode='w') as f:
            json.dump(config, f, indent=2)

        print('')
        print('Label Studio has been successfully initialized. Check project states in ' + dir)
        print('Start the server: label-studio start ' + dir)
        return dir

    @classmethod
    def _get_config(cls, project_dir, args):
        """
        Get config from input args Namespace acquired by Argparser
        :param args:
        :return:
        """
        # check if project directory exists
        if not os.path.exists(project_dir):
            raise FileNotFoundError(
                'Couldn\'t find directory ' + project_dir +
                ', maybe you\'ve missed appending "--init" option:\nlabel-studio start ' +
                args.project_name + ' --init'
            )

        # check config.json exists in directory
        config_path = os.path.join(project_dir, 'config.json')
        if not os.path.exists(config_path):
            raise FileNotFoundError(
                'Couldn\'t find config file ' + config_path + ' in project directory ' + project_dir +
                ', maybe you\'ve missed appending "--init" option:\nlabel-studio start ' + args.project_name + ' --init'
            )

        config_path = os.path.abspath(config_path)
        with io.open(config_path) as c:
            config = json.load(c)

        config['config_path'] = config_path
        config['input_path'] = os.path.join(os.path.dirname(config_path), config['input_path'])
        config['label_config'] = os.path.join(os.path.dirname(config_path), config['label_config'])
        config['output_dir'] = os.path.join(os.path.dirname(config_path), config['output_dir'])
        return config

    @classmethod
    def _load_from_dir(cls, project_dir, project_name, args, context):
        config = cls._get_config(project_dir, args)
        return cls(config, project_name, context)

    @classmethod
    def get(cls, project_name, args, context):

        # If project stored in memory, just return it
        if project_name in cls._storage:
            return cls._storage[project_name]

        # If project directory exists, load project from directory and update in-memory storage
        project_dir = cls.get_project_dir(project_name, args)
        if os.path.exists(project_dir):
            project = cls._load_from_dir(project_dir, project_name, args, context)
            cls._storage[project_name] = project
            return project

        raise ProjectNotFound('Project {p} doesn\'t exist'.format(p=project_name))

    @classmethod
    def create(cls, project_name, args, context):
        # "create" method differs from "get" as it can create new directory with project resources
        project_dir = cls.create_project_dir(project_name, args)
        project = cls._load_from_dir(project_dir, project_name, args, context)
        cls._storage[project_name] = project
        return project

    @classmethod
    def get_or_create(cls, project_name, args, context):
        try:
            project = cls.get(project_name, args, context)
            logger.info('Get project "' + project_name + '".')
        except ProjectNotFound:
            project = cls.create(project_name, args, context)
            logger.info('Project "' + project_name + '" created.')
        return project

    def update_on_boarding_state(self):
        self.on_boarding['setup'] = self.config.get('label_config_updated', False)
        self.on_boarding['import'] = len(self.tasks) > 0
        self.on_boarding['labeled'] = len(os.listdir(self.config['output_dir'])) > 0
        return self.on_boarding
