import os
import datetime
import logging.config
import traceback as tb
import io
from flask import request, jsonify, make_response
import json  # it MUST be included after flask!
import pkg_resources
import hashlib

from collections import defaultdict
from pythonjsonlogger import jsonlogger
from lxml import etree, objectify
from xml.etree import ElementTree

from .io import find_file, find_dir


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
                raise KeyError('to_name={input_tag_name} is specified for output tag name={output_tag}, '
                               'but we can\'t find it among input tags'
                               .format(input_tag_name=input_tag_name, output_tag=output_tag))
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
            logging.error("Can't parse XML for label config template from " + path + ':' + str(e))
            continue

        # extract fields from xml and pass them to template
        try:
            json_string = code.split('<!--')[1].split('-->')[0]
            meta = json.loads(json_string)
        except Exception as e:
            logging.error("Can't parse meta info from label config: " + str(e))
            continue

        meta['pk'] = i
        meta['label_config'] = '-->\n'.join(code.split('-->\n')[1:])  # remove all comments at the beginning of code

        meta['category'] = meta['category'] if 'category' in meta else 'no category'
        templates[meta['category']].append(meta)

    # sort by title
    for key in templates:
        templates[key] = sorted(templates[key], key=lambda x: x['title'])

    return templates


def convert_string_to_hash(string):
    return hashlib.md5(string.encode()).hexdigest()
