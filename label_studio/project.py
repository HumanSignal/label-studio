import os
import io
import logging
import json
import random

from shutil import copy2
from collections import defaultdict, OrderedDict
from operator import itemgetter
from xml.etree import ElementTree
from uuid import uuid4
from copy import deepcopy

from label_studio_converter import Converter

from label_studio.utils.misc import (
    config_line_stripped, config_comments_free, parse_config, timestamp_now, timestamp_to_local_datetime)
from label_studio.utils.analytics import Analytics
from label_studio.utils.models import ProjectObj, MLBackend
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.io import find_file, delete_dir_content, json_load
from label_studio.utils.validation import is_url
from label_studio.tasks import Tasks
from label_studio.storage import create_storage, get_available_storage_names

logger = logging.getLogger(__name__)


class ProjectNotFound(KeyError):
    pass


class Project(object):

    _storage = {}

    def __init__(self, config, name, root_dir='.', context=None):
        self.config = config
        self.name = name
        self.path = os.path.join(root_dir, self.name)

        self.on_boarding = {}
        self.context = context or {}

        self.source_storage = None
        self.target_storage = None
        self.create_storages()

        self.tasks = None
        self.label_config_line, self.label_config_full, self.parsed_label_config, self.input_data_tags = None, None, None, None  # noqa
        self.derived_input_schema, self.derived_output_schema = None, None

        self.load_label_config()
        self.update_derived_input_schema()
        self.update_derived_output_schema()

        self.analytics = None
        self.load_analytics()

        self.project_obj = None
        self.ml_backends = []
        self.load_project_ml_backend()

        self.converter = None
        self.load_converter()
        self.max_tasks_file_size = 250

    def get_storage(self, storage_for):
        if storage_for == 'source':
            return self.source_storage
        elif storage_for == 'target':
            return self.target_storage

    def get_available_storage_names(self, storage_for):
        if storage_for == 'source':
            return self.get_available_source_storage_names()
        elif storage_for == 'target':
            return self.get_available_target_storage_names()

    @classmethod
    def get_available_source_storages(cls):
        return ['tasks-json', 's3', 'gcs']

    @classmethod
    def get_available_target_storages(cls):
        return ['completions-dir', 's3-completions', 'gcs-completions']

    def get_available_source_storage_names(self):
        names = OrderedDict()
        nameset = set(self.get_available_source_storages())
        for name, desc in get_available_storage_names().items():
            # we don't expose configurable filesystem storage in UI to avoid security problems
            if name in nameset:
                names[name] = desc
        return names

    def get_available_target_storage_names(self):
        names = OrderedDict()
        nameset = set(self.get_available_target_storages())
        for name, desc in get_available_storage_names().items():
            # blobs have no sense for target storages
            if name in nameset:
                names[name] = desc
        return names

    def create_storages(self):
        source = self.config['source']
        target = self.config['target']
        self.source_storage = create_storage(source['type'], 'source', source['path'], self.path, self,
                                             **source.get('params', {}))
        self.target_storage = create_storage(target['type'], 'target', target['path'], self.path, self,
                                             **target.get('params', {}))

    def update_storage(self, storage_for, storage_kwargs):

        def _update_storage(storage_for, storage_kwargs):
            storage_name = storage_kwargs.pop('name', storage_for)
            storage_type = storage_kwargs.pop('type')
            storage_path = storage_kwargs.pop('path', None)
            # storage_path = self.config[storage_for]['path']
            storage = create_storage(storage_type, storage_name, storage_path, self.path, self, **storage_kwargs)
            self.config[storage_for] = {
                'name': storage_name,
                'type': storage_type,
                'path': storage_path,
                'params': storage_kwargs
            }
            self._save_config()
            logger.debug('Created storage type "' + storage_type + '"')
            return storage

        if storage_for == 'source':
            self.source_storage = _update_storage('source', storage_kwargs)
        elif storage_for == 'target':
            self.target_storage = _update_storage('target', storage_kwargs)
        self.update_derived_input_schema()
        self.update_derived_output_schema()

    @property
    def can_manage_tasks(self):
        return self.config['source']['type'] not in {'s3', 's3-completions', 'gcs', 'gcs-completions'}

    @property
    def can_manage_completions(self):
        return self.config['target']['type'] not in {'s3', 's3-completions', 'gcs', 'gcs-completions'}

    @property
    def can_delete_tasks(self):
        return self.can_manage_tasks and self.can_manage_completions

    @property
    def data_types_json(self):
        return self.project_obj.data_types_json

    def load_label_config(self):
        self.label_config_full = config_comments_free(open(self.config['label_config'], encoding='utf8').read())
        self.label_config_line = config_line_stripped(self.label_config_full)
        self.parsed_label_config = parse_config(self.label_config_line)
        self.input_data_tags = self.get_input_data_tags(self.label_config_line)

    def update_derived_input_schema(self):
        self.derived_input_schema = set()
        for task_id, task in self.source_storage.items():
            data_keys = set(task['data'].keys())
            if not self.derived_input_schema:
                self.derived_input_schema = data_keys
            else:
                self.derived_input_schema &= data_keys
        logger.debug('Derived input schema: ' + str(self.derived_input_schema))

    def update_derived_output_schema(self):
        self.derived_output_schema = {
            'from_name_to_name_type': set(),
            'labels': defaultdict(set)
        }

        # for all already completed tasks we update derived output schema for further label config validation
        for task_id, c in self.target_storage.items():
            for completion in c['completions']:
                self._update_derived_output_schema(completion)
        logger.debug('Derived output schema: ' + str(self.derived_output_schema))

    def load_analytics(self):
        collect_analytics = os.getenv('collect_analytics')
        if collect_analytics is None:
            collect_analytics = self.config.get('collect_analytics', True)
        collect_analytics = bool(int(collect_analytics))
        self.analytics = Analytics(self.label_config_line, collect_analytics, self.name, self.context)

    def add_ml_backend(self, params, raise_on_error=True):
        ml_backend = MLBackend.from_params(params)
        if not ml_backend.connected and raise_on_error:
            raise ValueError('ML backend with URL: "' + str(params['url']) + '" is not connected.')
        self.ml_backends.append(ml_backend)

    def remove_ml_backend(self, name):
        # remove from memory
        remove_idx = next((i for i, b in enumerate(self.ml_backends) if b.model_name == name), None)
        if remove_idx is None:
            raise KeyError('Can\'t remove ML backend with name "' + name + '": not found.')
        self.ml_backends.pop(remove_idx)

        # remove from config
        config_params = self.config.get('ml_backends', [])
        remove_idx = next((i for i, b in enumerate(config_params) if b['name'] == name), None)
        if remove_idx is not None:
            config_params.pop(remove_idx)
        self.config['ml_backends'] = config_params
        self._save_config()

    def load_project_ml_backend(self):
        # configure project
        self.project_obj = ProjectObj(label_config=self.label_config_line, label_config_full=self.label_config_full)

        # configure multiple machine learning backends
        self.ml_backends = []
        ml_backends_params = self.config.get('ml_backends', [])
        for ml_backend_params in ml_backends_params:
            self.add_ml_backend(ml_backend_params, raise_on_error=False)

    def load_converter(self):
        self.converter = Converter(self.parsed_label_config)

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
    def ml_backends_connected(self):
        return len(self.ml_backends) > 0

    @property
    def task_data_login(self):
        return self.project_obj.task_data_login

    @property
    def task_data_password(self):
        return self.project_obj.task_data_password

    def extract_data_types(self, config):
        return self.project_obj.extract_data_types(config)

    def validate_label_config(self, config_string):
        logger.debug('Validate label config')
        self.project_obj.validate_label_config(config_string)

        logger.debug('Get parsed config')
        parsed_config = parse_config(config_string)

        logger.debug('Validate label config on derived input schema')
        self.validate_label_config_on_derived_input_schema(parsed_config)

        logger.debug('Validate label config on derived output schema')
        self.validate_label_config_on_derived_output_schema(parsed_config)

    def _save_config(self):
        with io.open(self.config['config_path'], mode='w') as f:
            json.dump(self.config, f, indent=2)

    def update_params(self, params):
        if 'ml_backend' in params:
            ml_backend_params = self._create_ml_backend_params(params['ml_backend'], self.name)
            self.add_ml_backend(ml_backend_params)
            self.config['ml_backends'].append(ml_backend_params)
            self._save_config()

    def update_label_config(self, new_label_config):
        label_config_file = self.config['label_config']
        # save xml label config to file
        new_label_config = new_label_config.replace('\r\n', '\n')
        with io.open(label_config_file, mode='w', encoding='utf8') as f:
            f.write(new_label_config)

        # reload everything that depends on label config
        self.load_label_config()
        self.update_derived_output_schema()
        self.load_analytics()
        self.load_project_ml_backend()
        self.load_converter()

        # save project config state
        self.config['label_config_updated'] = True
        with io.open(self.config['config_path'], mode='w', encoding='utf8') as f:
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
            if result_type in ('relation', 'rating', 'pairwise'):
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

    def no_tasks(self):
        return self.source_storage.empty()

    def delete_tasks(self):
        """
        Deletes all tasks & completions from filesystem, then reloads clean project
        :return:
        """
        self.source_storage.remove_all()
        self.target_storage.remove_all()
        self.update_derived_input_schema()
        self.update_derived_output_schema()

        # delete everything on ML backend
        if self.ml_backends_connected:
            for m in self.ml_backends:
                m.clear(self)

    def next_task(self, completed_tasks_ids):
        completed_tasks_ids = set(completed_tasks_ids)
        sampling = self.config.get('sampling', 'sequential')

        # Tasks are ordered ascending by their "id" fields. This is default mode.
        task_iter = filter(lambda i: i not in self.target_storage, self.source_storage.ids())
        if sampling == 'sequential':
            task_id = next(task_iter, None)
            if task_id is not None:
                return self.source_storage.get(task_id)

        # Tasks are sampled with equal probabilities
        elif sampling == 'uniform':
            actual_tasks_ids = list(task_iter)
            if not actual_tasks_ids:
                return None
            random.shuffle(actual_tasks_ids)
            return self.source_storage.get(actual_tasks_ids[0])

        # Task with minimum / maximum average prediction score is taken
        elif sampling.startswith('prediction-score'):
            id_score_map = {}
            for task_id, task in self.source_storage.items():
                if task_id in completed_tasks_ids:
                    continue
                if 'predictions' in task and len(task['predictions']) > 0:
                    score = sum((p['score'] for p in task['predictions']), 0) / len(task['predictions'])
                    id_score_map[task_id] = score
            if not id_score_map:
                return None
            if sampling.endswith('-min'):
                best_idx = min(id_score_map, key=id_score_map.get)
            elif sampling.endswith('-max'):
                best_idx = max(id_score_map, key=id_score_map.get)
            else:
                raise NotImplementedError('Unknown sampling method ' + sampling)
            return self.source_storage.get(best_idx)
        else:
            raise NotImplementedError('Unknown sampling method ' + sampling)

    def remove_task(self, task_id):
        self.source_storage.remove(task_id)
        self.delete_completion(task_id)

    def get_completions_ids(self):
        """ List completion ids from output_dir directory

        :return: filenames without extensions and directories
        """
        task_ids = set(self.source_storage.ids())
        completion_ids = set(self.target_storage.ids())
        completions = completion_ids.intersection(task_ids)
        #completions = list(self.target_storage.ids())
        logger.debug('{num} completions found in {output_dir}'.format(
            num=len(completions), output_dir=self.config["output_dir"]))
        return sorted(completions)

    def get_completed_at(self, task_ids):
        """ Get completed time for list of task ids

        :param task_ids: list of task ids
        :return: list of string with formatted datetime
        """
        times = {}
        for _, data in self.target_storage.items():
            id = data['id']
            try:
                latest_time = max(data['completions'], key=itemgetter('created_at'))['created_at']
            except Exception as exc:
                times[id] = 'undefined'
            else:
                times[id] = timestamp_to_local_datetime(latest_time).strftime('%Y-%m-%d %H:%M:%S')
        return times

    def get_task_with_completions(self, task_id):
        """ Get task with completions

        :param task_id: task ids
        :return: json dict with completion
        """
        data = self.target_storage.get(task_id)
        logger.debug('Get task ' + str(task_id) + ' from target storage: ' + str(data))

        if data:
            logger.debug('Get predictions ' + str(task_id) + ' from source storage')
            # tasks can hold the newest version of predictions, so task it from tasks
            data['predictions'] = self.source_storage.get(task_id).get('predictions', [])
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
            task = deepcopy(self.source_storage.get(task_id))
            task['completions'] = []
        else:
            task = deepcopy(task)

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

        try:
            self._update_derived_output_schema(completion)
        except Exception as exc:
            logger.error(exc, exc_info=True)
            logger.debug(json.dumps(completion, indent=2))

        # save completion time
        completion['created_at'] = timestamp_now()

        # write task + completions to file
        self.target_storage.set(task_id, task)
        logger.debug('Completion ' + str(task_id) + ' saved:\n' + json.dumps(task, indent=2))
        return completion['id']

    def delete_completion(self, task_id):
        """ Delete completion from disk

        :param task_id: task id
        """
        self.target_storage.remove(task_id)
        self.update_derived_output_schema()

    def make_predictions(self, task):
        task = deepcopy(task)
        task['predictions'] = []
        try:
            for ml_backend in self.ml_backends:
                if not ml_backend.connected:
                    continue
                predictions = ml_backend.make_predictions(task, self)
                predictions['created_by'] = ml_backend.model_name
                task['predictions'].append(predictions)
        except Exception as exc:
            logger.debug(exc)
        return task

    def train(self):
        completions = []
        for _, c in self.target_storage.items():
            completions.append(c)
        train_status = False
        if self.ml_backends_connected:
            for ml_backend in self.ml_backends:
                if ml_backend.connected:
                    ml_backend.train(completions, self)
                    train_status = True
        return train_status

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
        with io.open(label_config_file, encoding='utf8') as f:
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
    def _create_ml_backend_params(cls, url, project_name=None):
        if '=http' in url:
            name, url = url.split('=', 1)
        else:
            project_name = os.path.basename(project_name or '')
            name = project_name + str(uuid4())[:4]
        if not is_url(url):
            raise ValueError('Specified string "' + url + '" doesn\'t look like URL.')
        return {'url': url, 'name': name}

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
        if args.force:
            delete_dir_content(dir)
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

        if args.source:
            config['source'] = {
                'type': args.source,
                'path': args.source_path,
                'params': args.source_params
            }
        else:
            # save tasks.json
            tasks_json = 'tasks.json'
            tasks_json_path = os.path.join(dir, tasks_json)
            if input_path:
                tasks = cls._load_tasks(input_path, args, config_xml_path)
            else:
                tasks = {}
            with io.open(tasks_json_path, mode='w') as fout:
                json.dump(tasks, fout, indent=2)
            config['input_path'] = tasks_json
            config['source'] = {
                'name': 'Tasks',
                'type': 'tasks-json',
                'path': os.path.abspath(tasks_json_path)
            }
            logger.debug('{tasks_json_path} input file with {n} tasks has been created from {input_path}'.format(
                tasks_json_path=tasks_json_path, n=len(tasks), input_path=input_path))

        if args.target:
            config['target'] = {
                'type': args.target,
                'path': args.target_path,
                'params': args.target_params
            }
        else:
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
            config['target'] = {
                'name': 'Completions',
                'type': 'completions-dir',
                'path': os.path.abspath(completions_dir)
            }

        if 'ml_backends' not in config or not isinstance(config['ml_backends'], list):
            config['ml_backends'] = []
        if args.ml_backends:
            for url in args.ml_backends:
                config['ml_backends'].append(cls._create_ml_backend_params(url, project_name))

        if args.sampling:
            config['sampling'] = args.sampling
        if args.port:
            config['port'] = args.port
        if args.host:
            config['host'] = args.host
        if args.allow_serving_local_files:
            config['allow_serving_local_files'] = True

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
    def get_config(cls, project_name, args):
        return cls._get_config(cls.get_project_dir(project_name, args))

    @classmethod
    def _get_config(cls, project_dir, args=None):
        """
        Get config from input args Namespace acquired by Argparser
        :param args:
        :return:
        """
        # check if project directory exists
        if not os.path.exists(project_dir):
            project_name = args.project_name if args is not None else '<project_name>'
            raise FileNotFoundError(
                'Couldn\'t find directory ' + project_dir +
                ', maybe you\'ve missed appending "--init" option:\nlabel-studio start ' +
                project_name + ' --init'
            )

        # check config.json exists in directory
        config_path = os.path.join(project_dir, 'config.json')
        if not os.path.exists(config_path):
            project_name = args.project_name if args is not None else '<project_name>'
            raise FileNotFoundError(
                'Couldn\'t find config file ' + config_path + ' in project directory ' + project_dir +
                ', maybe you\'ve missed appending "--init" option:\nlabel-studio start ' + project_name + ' --init'
            )

        config_path = os.path.abspath(config_path)
        with io.open(config_path) as c:
            config = json.load(c)

        config['config_path'] = config_path
        if config.get('input_path'):
            config['input_path'] = os.path.join(os.path.dirname(config_path), config['input_path'])
        config['label_config'] = os.path.join(os.path.dirname(config_path), config['label_config'])
        if config.get('output_dir'):
            config['output_dir'] = os.path.join(os.path.dirname(config_path), config['output_dir'])
        if not config.get('source'):
            config['source'] = {
                'name': 'Tasks',
                'type': 'tasks-json',
                'path': os.path.abspath(config['input_path'])
            }
        if not config.get('target'):
            config['target'] = {
                'name': 'Completions',
                'type': 'completions-dir',
                'path': os.path.abspath(config['output_dir'])
            }
        return config

    @classmethod
    def _load_from_dir(cls, project_dir, project_name, args, context):
        config = cls._get_config(project_dir, args)
        return cls(config, project_name, context=context, root_dir=args.root_dir)

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
        self.on_boarding['import'] = not self.no_tasks()
        self.on_boarding['labeled'] = not self.target_storage.empty()
        return self.on_boarding

    @property
    def generate_sample_task_escape(self):
        return self.project_obj.generate_sample_task_escape

    @property
    def supported_formats(self):
        return self.project_obj.supported_formats

    def serialize(self):
        """ Serialize project to json dict
        """
        project = self
        banlist = ('json', 'dir-jsons')
        available_storages = list(filter(lambda i: i[0] not in banlist, get_available_storage_names().items()))

        output = {
            'project_name': project.name,
            'task_count': len(project.source_storage.ids()),
            'completion_count': len(project.get_completions_ids()),
            'config': project.config,
            'can_manage_tasks': project.can_manage_tasks,
            'can_manage_completions': project.can_manage_completions,
            'can_delete_tasks': project.can_delete_tasks,
            'target_storage': {'readable_path': project.target_storage.readable_path},
            'source_storage': {'readable_path': project.source_storage.readable_path},
            'available_storages': available_storages,
            'source_syncing': self.source_storage.is_syncing,
            'target_syncing': self.target_storage.is_syncing
        }
        return output
