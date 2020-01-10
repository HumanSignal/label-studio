import os
import datetime
import logging.config
import traceback as tb
import io
from flask import request, jsonify, make_response
import json  # it MUST be included after flask!
import inspect
import pkg_resources

from shutil import copy2
from collections import defaultdict
from appdirs import user_config_dir
from pythonjsonlogger import jsonlogger
from lxml import etree, objectify
from xml.etree import ElementTree
from .db import re_init
from label_studio.utils.io import find_file, find_dir


input_args = None
config_path = None
prev_config = None


# settings from django analogue
class Settings:
    TASKS_MAX_NUMBER = 250000
    TASKS_MAX_FILE_SIZE = 200 * 1024 * 1024
    UPLOAD_DATA_UNDEFINED_NAME = '$undefined$'


# this must be before logger setup
class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        if not log_record.get('timestamp'):
            # this doesn't use record.created, so it is slightly off
            now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ')
            log_record['timestamp'] = now
        if log_record.get('level'):
            log_record['level'] = log_record['level'].upper()
        else:
            log_record['level'] = record.levelname


# read logger config
with open(find_file('logger.json')) as f:
    log_config = json.load(f)
logfile = os.path.join(os.path.dirname(__file__), '..', 'static', 'logs', 'service.log')

# create log file
os.makedirs(os.path.dirname(logfile), exist_ok=True)

open(logfile, 'w') if not os.path.exists(logfile) else ()
file_handler = logging.FileHandler(logfile)
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(CustomJsonFormatter())
# set logger config
logging.config.dictConfig(log_config)
log = logging.getLogger('service')
log.addHandler(file_handler)


# make an answer to client
def answer(status=0, msg='', result=None):
    if status == 0 and not msg and result is None:
        status = -1000
        msg = "nothing happened"

    if status == 200 and not msg:
        msg = 'ok'

    a = {"status": status, "msg": msg}
    a.update({'request': request.args})

    if result is not None:
        a.update({"result": result})

    return make_response(jsonify(a), status)


# make an answer as exception
class AnswerException(Exception):
    def __init__(self, status, msg='', result=None):
        self.status, self.msg, self.result = status, msg, result
        self.answer = answer(status, msg, result)
        Exception.__init__(self, self.answer)


# standard exception treatment for any api function
def exception_treatment(f):
    def exception_f(*args, **kwargs):
        try:
            return f(*args, **kwargs)

        except AnswerException as e:
            traceback = tb.format_exc()
            log.critical('\n\n--------------\n' + traceback + '--------------\n')

            if 'traceback' not in e.result:
                e.result['traceback'] = traceback
            if hasattr(exception_f, 'request_id') and not e.result['request_id']:
                e.result['request_id'] = exception_f.request_id
            return answer(e.status, e.msg, e.result)

        except Exception as e:
            traceback = tb.format_exc()
            log.critical('\n\n--------------\n' + traceback + '--------------\n')

            body = {'traceback': traceback}
            if hasattr(exception_f, 'request_id'):
                body['request_id'] = exception_f.request_id
            return answer(501, str(e), body)

    exception_f.__name__ = f.__name__
    return exception_f


def config_line_stripped(xml_config):
    """ Remove comments

    :param xml_config: xml config string
    :return: xml config string
    """
    xml_config = config_comments_free(xml_config)
    return xml_config.replace('\n', '').replace('\r', '')


def config_comments_free(xml_config):
    """ Remove \n and \r from xml, flat xml to string

    :param xml_config: xml config string
    :return: xml config string
    """
    tree = etree.fromstring(xml_config)
    comments = tree.xpath('//comment()')

    for xml_config in comments:
        p = xml_config.getparent()
        if p:
            p.remove(xml_config)
        xml_config = etree.tostring(tree, method='html').decode("utf-8")

    return xml_config


def label_studio_init(output_dir, label_config=None):
    os.makedirs(output_dir, exist_ok=True)
    default_config_file = os.path.join(output_dir, 'config.json')
    default_label_config_file = os.path.join(output_dir, 'config.xml')
    default_output_dir = os.path.join(output_dir, 'completions')
    default_input_path = os.path.join(output_dir, 'tasks.json')

    if label_config:
        copy2(label_config, default_label_config_file)

    default_config = {
        'title': 'Label Studio',
        'port': 8200,
        'debug': False,

        'label_config': default_label_config_file,
        'input_path': default_input_path,
        'output_dir': default_output_dir,

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
        print(f'{default_input_path} input path has been created.')
    else:
        print(f'{default_input_path} input path already exists.')

    # create config file (config.json)
    if not os.path.exists(default_config_file):
        with io.open(default_config_file, mode='w') as fout:
            json.dump(default_config, fout, indent=2)
        print(f'{default_config_file} config file has been created.')
    else:
        print(f'{default_config_file} config file already exists.')

    # create label config (config.xml)
    if not os.path.exists(default_label_config_file):
        default_label_config = '<View></View>'
        with io.open(default_label_config_file, mode='w') as fout:
            fout.write(default_label_config)
        print(f'{default_label_config_file} label config file has been created.')
    else:
        print(f'{default_label_config_file} label config file already exists.')

    # create output dir (completions)
    if not os.path.exists(default_output_dir):
        os.makedirs(default_output_dir)
        print(f'{default_output_dir} output directory has been created.')
    else:
        print(f'{default_output_dir} output directory already exists.')

    print('')
    print(f'Label Studio has been successfully initialized. Check project states in {output_dir}')
    print(f'Start the server: label-studio start {output_dir}')


def load_config(re_init_db=True):
    global input_args, config_path

    c = json.load(open(config_path))
    c['port'] = input_args.port if input_args.port else c['port']
    c['label_config'] = input_args.label_config if input_args.label_config else c['label_config']
    c['input_path'] = input_args.input_path if input_args.input_path else c['input_path']
    c['output_dir'] = input_args.output_dir if input_args.output_dir else c['output_dir']

    # re-init db
    if prev_config != c and re_init_db:
        print('Config changes detected, reloading DB')
        re_init(c)

    return c


def parse_input_args():
    """ Combine args with json config

    :return: config dict
    """
    import sys
    import argparse

    global input_args, config_path, prev_config
    if len(sys.argv) == 1:
        print('\nQuick start usage: label-studio start my_project --init\n')

    parser = argparse.ArgumentParser(description='Label studio')

    subparsers = parser.add_subparsers(dest='command', help='Available commands', required=True)

    # init sub-command parser

    available_templates = [os.path.basename(os.path.dirname(f)) for f in iter_config_templates()]

    parser_init = subparsers.add_parser('init', help='Initialize Label Studio')
    parser_init.add_argument(
        'project_name',
        help='Path to directory where project state will be initialized')
    parser_init.add_argument(
        '--template', dest='template', choices=available_templates,
        help='Choose from predefined project templates'
    )

    # start sub-command parser

    parser_start = subparsers.add_parser('start', help='Start Label Studio server')
    parser_start.add_argument(
        'project_name',
        help='Path to directory where project state has been initialized'
    )
    parser_start.add_argument(
        '--init', dest='init', action='store_true',
        help='Initialize if project is not initialized yet'
    )
    parser_start.add_argument(
        '--template', dest='template', choices=available_templates,
        help='Choose from predefined project templates'
    )
    parser_start.add_argument(
        '-c', '--config', dest='config_path', default=os.path.join(os.path.dirname(__file__), '..', 'config.json'),
        help='backend config')
    parser_start.add_argument(
        '-l', '--label-config', dest='label_config', default='',
        help='label config path')
    parser_start.add_argument(
        '-i', '--input-path', dest='input_path', default='',
        help='input path to task file or directory with tasks')
    parser_start.add_argument(
        '-o', '--output-dir', dest='output_dir', default='',
        help='output directory for completions')
    parser_start.add_argument(
        '-p', '--port', dest='port', default=8200, type=int,
        help='backend port')
    parser_start.add_argument(
        '-v', '--verbose', action='store_true',
        help='increase output verbosity')

    input_args = parser.parse_args()
    if hasattr(input_args, 'label_config') and input_args.label_config:
        label_config = input_args.label_config
    elif input_args.template:
        label_config = os.path.join(find_dir('examples'), input_args.template, 'config.xml')
    else:
        label_config = None
    if input_args.command == 'init' or input_args.init:
        label_studio_init(input_args.project_name, label_config)
        if input_args.command == 'init':
            return False
    print('Working dir', os.getcwd())
    if not os.path.exists(input_args.project_name):
        raise FileNotFoundError(
            f'Couldn\'t find directory {input_args.project_name}, maybe you mean:\n'
            f'label-studio start {input_args.project_name} --init')
    config_path = os.path.join(input_args.project_name, 'config.json')
    if not os.path.exists(config_path):
        raise FileNotFoundError(
            f'Couldn\'t find config file {config_path} in project directory {input_args.project_name}, '
            f'may be you mean:\nlabel-studio start {input_args.project_name} --init')
    return True


class LabelConfigParser(object):

    def __init__(self, filepath):
        with io.open(filepath) as f:
            self._config = f.read()

    def get_value_for_name(self, name):
        tag_iter = ElementTree.fromstring(self._config).iter()
        return next((
            tag.attrib.get('value') for tag in tag_iter
            if tag.attrib.get('name') == name), None
        )

    def get_input_data_tags(self):
        tag_iter = ElementTree.fromstring(self._config).iter()
        return [
            tag for tag in tag_iter
            if tag.attrib.get('name') and tag.attrib.get('value', '').startswith('$')
        ]


def get_config_dir():
    config_dir = user_config_dir(appname='label-studio')
    if not os.path.exists(config_dir):
        os.makedirs(config_dir)
    return config_dir


def get_data_dir():
    data_dir = user_config_dir(appname='label-studio')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    return data_dir


def get_app_version():
    return pkg_resources.get_distribution('label-studio').version


def parse_config(config_string):

    def _is_input_tag(tag):
        return tag.attrib.get('name') and tag.attrib.get('value')

    def _is_output_tag(tag):
        return tag.attrib.get('name') and tag.attrib.get('toName')

    xml_tree = etree.fromstring(config_string)

    inputs, outputs, labels = {}, {}, defaultdict(set)
    for tag in xml_tree.iter():
        if _is_input_tag(tag):
            inputs[tag.attrib['name']] = {'type': tag.tag, 'value': tag.attrib['value'].lstrip('$')}
        elif _is_output_tag(tag):
            outputs[tag.attrib['name']] = {'type': tag.tag, 'to_name': tag.attrib['toName'].split(',')}
        parent = tag.getparent()
        if parent is not None and parent.attrib.get('name') in outputs:
            labels[parent.attrib['name']].add(tag.attrib['value'])

    for output_tag, tag_info in outputs.items():
        tag_info['inputs'] = []
        for input_tag_name in tag_info['to_name']:
            if input_tag_name not in inputs:
                raise KeyError(f'to_name={input_tag_name} is specified for output tag name={output_tag}, '
                               f'but we can\'t find it among input tags')
            tag_info['inputs'].append(inputs[input_tag_name])
        tag_info['labels'] = list(labels[output_tag])
    return outputs


def iter_config_templates():
    templates_dir = find_dir('examples')
    for d in os.listdir(templates_dir):
        # check xml config file exists
        path = os.path.join(templates_dir, d, 'config.xml')
        if not os.path.exists(path):
            continue
        yield path


def get_config_templates():
    """ Get label config templates from directory (as usual 'examples' directory)
    """
    from collections import defaultdict
    templates = defaultdict(list)

    for i, path in enumerate(iter_config_templates()):
        # open and check xml
        code = open(path).read()
        try:
            objectify.fromstring(code)
        except Exception as e:
            logging.error(f"Can't parse XML for label config template from {path}: {str(e)}")
            continue

        # extract fields from xml and pass them to template
        try:
            json_string = code.split('<!--')[1].split('-->')[0]
            meta = json.loads(json_string)
        except Exception as e:
            logging.error(f"Can't parse meta info from label config: {str(e)}")
            continue

        meta['pk'] = i
        meta['label_config'] = '-->\n'.join(code.split('-->\n')[1:])  # remove all comments at the beginning of code

        meta['category'] = meta['category'] if 'category' in meta else 'no category'
        templates[meta['category']].append(meta)

    # sort by title
    for key in templates:
        templates[key] = sorted(templates[key], key=lambda x: x['title'])

    return templates
