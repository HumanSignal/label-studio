import os
import io
import logging
import json
import urllib
import orjson
import random

from shutil import copy2
from collections import OrderedDict, defaultdict
from datetime import datetime
from operator import itemgetter

from label_studio_converter import Converter

from label_studio.utils.misc import LabelConfigParser, config_line_stripped, config_comments_free, parse_config
from label_studio.utils.analytics import Analytics
from label_studio.utils.models import ProjectObj, MLBackend
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.io import find_file, delete_dir_content


logger = logging.getLogger(__name__)


class Project(object):

    _storage = {}

    _allowed_extensions = {
        'Text': ('.txt',),
        'Image': ('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif'),
        'Audio': ('.wav', '.aiff', '.mp3', '.au', '.flac')
    }

    def __init__(self, config, name, context=None):
        self.config = config
        self.name = name

        self.tasks = None
        self.derived_input_schema = []
        self.derived_output_schema = {
            'from_name_to_name_type': set(),
            'labels': defaultdict(set)
        }
        self.label_config_line = None
        self.label_config_full = None
        self.ml_backend = None
        self.project_obj = None
        self.analytics = None
        self.converter = None
        self.on_boarding = {}
        self.context = context or {}
        self.reload()

    @property
    def id(self):
        return self.project_obj.id

    @property
    def data_types(self):
        return self.project_obj.data_types

    @property
    def label_config(self):
        return self.project_obj.label_config

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

        # save project config state
        self.config['label_config_updated'] = True
        with io.open(self.config['config_path'], mode='w') as f:
            json.dump(self.config, f)
        logger.info('Label config saved to: {path}'.format(path=label_config_file))

    def _get_single_input_value(self, input_data_tags):
        if len(input_data_tags) > 1:
            val = ",".join(tag.attrib.get("name") for tag in input_data_tags)
            print('Warning! Multiple input data tags found: ' +
                  val + '. Only first one is used.')
        input_data_tag = input_data_tags[0]
        data_key = input_data_tag.attrib.get('value').lstrip('$')
        return data_key

    def _create_task_with_local_uri(self, filepath, data_key, task_id):
        """ Convert filepath to task with flask serving URL
        """
        filename = os.path.basename(self, filepath)
        params = urllib.parse.urlencode({'d': os.path.dirname(filepath)})
        base_url = 'http://localhost:{port}/'.format(port=self.config.get("port"))
        image_url_path = base_url + urllib.parse.quote('data/' + filename)
        image_local_url = '{image_url_path}?{params}'.format(image_url_path=image_url_path, params=params)
        return {
            'id': task_id,
            'task_path': filepath,
            'data': {data_key: image_local_url}
        }

    def is_text_annotation(self, input_data_tags, filepath):
        return (
            len(input_data_tags) == 1 and input_data_tags[0].tag == 'Text'
            and filepath.endswith(self._allowed_extensions['Text'])
        )

    def is_image_annotation(self, input_data_tags, filepath):
        return (
            len(input_data_tags) == 1 and input_data_tags[0].tag == 'Image'
            and filepath.lower().endswith(self._allowed_extensions['Image'])
        )

    def is_audio_annotation(self, input_data_tags, filepath):
        return (
            len(input_data_tags) == 1 and input_data_tags[0].tag in ('Audio', 'AudioPlus')
            and filepath.lower().endswith(self._allowed_extensions['Audio'])
        )

    def _update_derived_output_schema(self, completion):
        """
        Given completion, output schema is updated. Output schema consists of unique tuples (from_name, to_name, type)
        and list of unique labels derived from existed completions
        :param completion:
        :return:
        """
        for result in completion['result']:
            self.derived_output_schema['from_name_to_name_type'].add((
                result['from_name'], result['to_name'], result['type']
            ))
            for label in result['value'][result['type']]:
                self.derived_output_schema['labels'][result['from_name']].add(label)

    def validate_label_config_on_derived_input_schema(self, config_string_or_parsed_config):
        """
        Validate label config on input schemas (tasks types and data keys) derived from imported tasks
        :param config_string_or_parsed_config: label config string or parsed config object
        :return: True if config match already imported tasks
        """
        input_schema = self.derived_input_schema

        # check if schema exists, i.e. at least one task has been uploaded
        if not input_schema:
            return

        config = config_string_or_parsed_config
        if isinstance(config, str):
            config = parse_config(config)
        input_types, input_values = set(), set()
        for input_items in map(itemgetter('inputs'), config.values()):
            for input_item in input_items:
                input_types.add(input_item['type'])
                input_values.add(input_item['value'])

        input_schema_types = set([item['type'] for item in input_schema])
        input_schema_values = set([item['value'] for item in input_schema])

        # check input data types: they must be in schema
        for item in input_types:
            if item not in input_schema_types:
                raise ValidationError(
                    'You have already imported tasks and they are incompatible with a new config. '
                    'Can\'t find type "{item}" among already imported tasks with types {input_schema_types}'
                        .format(item=item, input_schema_types=list(input_schema_types)))

        # check input data values: they must be in schema
        for item in input_values:
            if item not in input_schema_values:
                raise ValidationError(
                    'You have already imported tasks and they are incompatible with a new config. '
                    'Can\t find key "{item}" among already imported tasks with keys {input_schema_values}'
                        .format(item=item, input_schema_values=list(input_schema_types)))

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

    def tasks_from_json_file(self, path):
        """ Prepare tasks from json

        :param path: path to json with list or dict
        :param tasks: main db instance of tasks
        :return: new task id
        """
        def push_task(root):
            task_id = len(self.tasks) + 1
            data = root['data'] if 'data' in root else root
            self.tasks[task_id] = {'id': task_id, 'task_path': path, 'data': data}
            if 'predictions' in data:
                self.tasks[task_id]['predictions'] = data['predictions']
                self.tasks[task_id]['data'].pop('predictions', None)
            if 'predictions' in root:
                self.tasks[task_id]['predictions'] = root['predictions']

        logger.debug('Reading tasks from JSON file ' + path)
        with open(path) as f:
            json_body = orjson.loads(f.read())

            # multiple tasks in file
            if isinstance(json_body, list):
                [push_task(data) for data in json_body]

            # one task in file
            elif isinstance(json_body, dict):
                push_task(json_body)

            # unsupported task type
            else:
                raise Exception('Unsupported task data:', path)

    def _init(self):
        label_config = LabelConfigParser(self.config['label_config'])

        if not os.path.exists(self.config['output_dir']):
            os.mkdir(self.config['output_dir'])

        task_id = 0
        data_key = None

        input_data_tags = label_config.get_input_data_tags()

        # load at first start
        self.tasks = OrderedDict()

        # file
        if os.path.isfile(self.config['input_path']):
            files = [os.path.basename(self.config['input_path'])]
            root_dir = os.path.normpath(os.path.dirname(self.config['input_path']))

        # directory
        else:
            root_dir = os.path.normpath(self.config['input_path'])
            files = [os.path.join(root, f) for root, _, files in os.walk(root_dir) for f in files \
                     if 'completion' not in f and 'completion' not in root]

        # walk over all the files
        for f in files:
            norm_f = os.path.normpath(f)
            path = os.path.join(root_dir, norm_f) if not norm_f.startswith(root_dir) else f

            # load tasks from json
            if f.endswith('.json'):
                self.tasks_from_json_file(path)

            # load tasks from txt: line by line, task by task
            elif self.is_text_annotation(input_data_tags, f):
                if data_key is None:
                    data_key = self._get_single_input_value(input_data_tags)
                with io.open(path) as fin:
                    for line in fin:
                        task_id = len(self.tasks) + 1
                        self.tasks[task_id] = {'id': task_id, 'task_path': path, 'data': {data_key: line.strip()}}

            # load tasks from files: creating URI to local resources
            elif self.is_image_annotation(input_data_tags, f) or self.is_audio_annotation(input_data_tags, f):
                if data_key is None:
                    data_key = self._get_single_input_value(input_data_tags)
                task_id = len(self.tasks) + 1
                self.tasks[task_id] = self._create_task_with_local_uri(f, data_key, task_id)
            else:
                logger.warning('Unrecognized file format for file ' + f)

        num_tasks_loaded = len(self.tasks)

        # make derived input schema
        if num_tasks_loaded > 0:
            for tag in input_data_tags:
                self.derived_input_schema.append({
                    'type': tag.tag,
                    'value': tag.attrib['value'].lstrip('$')
                })

        # for all already completed tasks we update derived output schema for further label config validation
        for task_id in self.get_task_ids():
            task_with_completions = self.get_task_with_completions(task_id)
            if task_with_completions and 'completions' in task_with_completions:
                completions = task_with_completions['completions']
                for completion in completions:
                    self._update_derived_output_schema(completion)

        print(str(len(self.tasks)) + ' tasks loaded from: ' + self.config['input_path'])

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
        with io.open(self.config['input_path'], mode='w') as f:
            json.dump([], f)
        self.reload()

    def iter_tasks(self):
        sampling = self.config.get('sampling', 'sequential')
        if sampling == 'sequential':
            return self.tasks.items()
        elif sampling == 'uniform':
            keys = list(self.tasks.keys())
            random.shuffle(keys)
            return ((k, self.tasks[k]) for k in keys)
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

    def get_completions_ids(self):
        """ List completion ids from output_dir directory

        :return: filenames without extensions and directories
        """
        root_dir = self.config['output_dir']
        os.mkdir(root_dir) if not os.path.exists(root_dir) else ()
        files = os.listdir(root_dir)
        completions = [int(os.path.splitext(f)[0]) for f in files if f.endswith('.json')]
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

    def reload(self):
        self.tasks = None
        self.derived_input_schema = []
        self.derived_output_schema = {
            'from_name_to_name_type': set(),
            'labels': defaultdict(set)
        }

        self._init()

        self.label_config_full = config_comments_free(open(self.config['label_config']).read())
        self.label_config_line = config_line_stripped(self.label_config_full)

        collect_analytics = os.getenv('collect_analytics')
        if collect_analytics is None:
            collect_analytics = self.config.get('collect_analytics', True)
        if self.analytics is None:
            self.analytics = Analytics(self.label_config_line, collect_analytics, self.name, self.context)
        else:
            self.analytics.update_info(self.label_config_line, collect_analytics, self.name, self.context)

        # configure project
        self.project_obj = ProjectObj(label_config=self.label_config_line, label_config_full=self.label_config_full)

        # configure machine learning backend
        if self.ml_backend is None:
            ml_backend_params = self.config.get('ml_backend')
            if ml_backend_params:
                ml_backend = MLBackend.from_params(ml_backend_params)
                self.project_obj.connect(ml_backend)

        self.converter = Converter(self.label_config_full)

    @classmethod
    def get_project_dir(cls, project_name, args):
        return os.path.join(args.root_dir, project_name)

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
        label_config_name = 'config.xml'
        output_dir_name = 'completions'
        input_path_name = 'tasks.json'
        default_config_file = os.path.join(dir, 'config.json')
        default_label_config_file = os.path.join(dir, label_config_name)
        default_output_dir = os.path.join(dir, output_dir_name)
        default_input_path = os.path.join(dir, input_path_name)

        if hasattr(args, 'config_path') and args.config_path:
            copy2(args.config_path, default_config_file)
        if hasattr(args, 'input_path') and args.input_path:
            copy2(args.input_path, default_input_path)
        if hasattr(args, 'output_dir') and args.output_dir:
            if os.path.exists(args.output_dir):
                copy2(args.output_dir, default_output_dir)
        if hasattr(args, 'label_config') and args.label_config:
            copy2(args.label_config, default_label_config_file)

        default_config = {
            'title': 'Label Studio',
            'port': 8200,
            'debug': False,

            'label_config': label_config_name,
            'input_path': input_path_name,
            'output_dir': output_dir_name,

            'instruction': 'Type some <b>hypertext</b> for label experts!',
            'allow_delete_completions': True,
            'templates_dir': 'examples',

            'editor': {
                'debug': False
            },

            '!ml_backend': {
                'url': 'http://localhost:9090',
                'model_name': 'my_super_model'
            },
            'sampling': 'uniform'
        }

        # create input_path (tasks.json)
        if not os.path.exists(default_input_path):
            with io.open(default_input_path, mode='w') as fout:
                json.dump([], fout, indent=2)
            print(default_input_path + ' input path has been created.')
        else:
            print(default_input_path + ' input path already exists.')

        # create config file (config.json)
        if not os.path.exists(default_config_file):
            with io.open(default_config_file, mode='w') as fout:
                json.dump(default_config, fout, indent=2)
            print(default_config_file + ' config file has been created.')
        else:
            print(default_config_file + ' config file already exists.')

        # create label config (config.xml)
        if not os.path.exists(default_label_config_file):
            path = find_file('examples/image_polygons/config.xml')
            default_label_config = open(path).read()

            with io.open(default_label_config_file, mode='w') as fout:
                fout.write(default_label_config)
            print(default_label_config_file + ' label config file has been created.')
        else:
            print(default_label_config_file + ' label config file already exists.')

        # create output dir (completions)
        if not os.path.exists(default_output_dir):
            os.makedirs(default_output_dir)
            print(default_output_dir + ' output directory has been created.')
        else:
            print(default_output_dir + ' output directory already exists.')

        print('')
        print('Label Studio has been successfully initialized. Check project states in ' + dir)
        print('Start the server: label-studio start ' + dir)
        return dir

    @classmethod
    def _get_config(cls, project_dir, args):
        """
        Get config path from input args Namespace acquired by Argparser
        :param args:
        :param args:
        :return:
        """
        # if config is explicitly specified, just return it
        if args.config_path:
            config_path = args.config_path
        else:
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

        if args.port:
            config['port'] = args.port

        if args.label_config:
            config['label_config'] = args.label_config

        if args.input_path:
            config['input_path'] = args.input_path

        if args.output_dir:
            config['output_dir'] = args.output_dir

        if args.debug is not None:
            config['debug'] = args.debug

        if args.ml_backend_url:
            if 'ml_backend' not in config:
                config['ml_backend'] = {}
            config['ml_backend']['url'] = args.ml_backend_url

        if args.ml_backend_name:
            if 'ml_backend' not in config:
                config['ml_backend'] = {}
            config['ml_backend']['name'] = args.ml_backend_name

        # absolutize paths relative to config.json
        config_dir = os.path.dirname(config_path)
        config['label_config'] = os.path.join(config_dir, config['label_config'])
        config['input_path'] = os.path.join(config_dir, config['input_path'])
        config['output_dir'] = os.path.join(config_dir, config['output_dir'])
        config['config_path'] = config_path

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

        raise KeyError('Project {p} doesn\'t exist'.format(p=project_name))

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
        except KeyError:
            project = cls.create(project_name, args, context)
            logger.info('Project "' + project_name + '" created.')
        return project

    def update_on_boarding_state(self):
        self.on_boarding['setup'] = self.config.get('label_config_updated', False)
        self.on_boarding['import'] = len(self.tasks) > 0
        self.on_boarding['labeled'] = len(os.listdir(self.config['output_dir'])) > 0
        return self.on_boarding
