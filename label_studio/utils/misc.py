import os
import logging
import traceback as tb
from flask import request, jsonify, make_response
import json  # it MUST be included after flask!
import pkg_resources
import hashlib
import calendar
import pytz
import flask

from json import JSONEncoder
from collections import defaultdict, OrderedDict
from lxml import etree, objectify
from datetime import datetime
from dateutil.tz import tzlocal

from .io import find_dir

logger = logging.getLogger(__name__)


# settings from django analogue
class Settings:
    TASKS_MAX_NUMBER = 250000
    TASKS_MAX_FILE_SIZE = 200 * 1024 * 1024
    UPLOAD_DATA_UNDEFINED_NAME = '$undefined$'


# make an answer to client
def answer(status=0, msg='', result=None):
    if status == 0 and not msg and result is None:
        status = -1000
        msg = "nothing happened"

    if status == 200 and not msg:
        msg = 'ok'

    a = {"status": status, "detail": msg}
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

            if 'traceback' not in e.result:
                e.result['traceback'] = traceback
            if hasattr(exception_f, 'request_id') and not e.result['request_id']:
                e.result['request_id'] = exception_f.request_id
            return answer(e.status, e.msg, e.result)

        except Exception as e:
            traceback = tb.format_exc()
            logger.debug(traceback)
            body = {'traceback': traceback}
            if hasattr(exception_f, 'request_id'):
                body['request_id'] = exception_f.request_id
            return answer(500, str(e), body)

    exception_f.__name__ = f.__name__
    return exception_f


# standard exception treatment for any page function
def exception_treatment_page(f):
    def exception_f(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            error = str(e)
            traceback = tb.format_exc()
            logger.debug(traceback)
            return flask.render_template(
                'includes/error.html',
                error=error, header="Project loading error", traceback=traceback)

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


def get_app_version():
    return pkg_resources.get_distribution('label-studio').version


def parse_config(config_string):

    LABEL_TAGS = {'Label', 'Choice'}
    NOT_CONTROL_TAGS = {'Filter',}

    def _is_input_tag(tag):
        return tag.attrib.get('name') and tag.attrib.get('value')

    def _is_output_tag(tag):
        return tag.attrib.get('name') and tag.attrib.get('toName') and tag.tag not in NOT_CONTROL_TAGS

    def _get_parent_output_tag_name(tag, outputs):
        # Find parental <Choices> tag for nested tags like <Choices><View><View><Choice>...
        parent = tag
        while True:
            parent = parent.getparent()
            if parent is None:
                return
            name = parent.attrib.get('name')
            if name in outputs:
                return name

    xml_tree = etree.fromstring(config_string)

    inputs, outputs, labels = {}, {}, defaultdict(set)
    for tag in xml_tree.iter():
        if _is_output_tag(tag):
            outputs[tag.attrib['name']] = {'type': tag.tag, 'to_name': tag.attrib['toName'].split(',')}
        elif _is_input_tag(tag):
            inputs[tag.attrib['name']] = {'type': tag.tag, 'value': tag.attrib['value'].lstrip('$')}
        if tag.tag not in LABEL_TAGS:
            continue
        parent_name = _get_parent_output_tag_name(tag, outputs)
        if parent_name is not None:
            actual_value = tag.attrib.get('alias') or tag.attrib.get('value')
            if not actual_value:
                logger.debug(
                    'Inspecting tag {tag_name}... found no "value" or "alias" attributes.'.format(
                        tag_name=etree.tostring(tag, encoding='unicode').strip()[:50]))
            else:
                labels[parent_name].add(actual_value)
    for output_tag, tag_info in outputs.items():
        tag_info['inputs'] = []
        for input_tag_name in tag_info['to_name']:
            if input_tag_name not in inputs:
                raise KeyError('to_name={input_tag_name} is specified for output tag name={output_tag}, '
                               'but we can\'t find it among input tags'
                               .format(input_tag_name=input_tag_name, output_tag=output_tag))
            tag_info['inputs'].append(inputs[input_tag_name])
        tag_info['labels'] = list(labels[output_tag])
    logger.debug('Parsed config:\n' + json.dumps(outputs, indent=2))
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
    from collections import defaultdict, OrderedDict
    templates = defaultdict(lambda: defaultdict(list))

    for i, path in enumerate(iter_config_templates()):
        # open and check xml
        code = open(path).read()
        try:
            objectify.fromstring(code)
        except Exception as e:
            logger.error("Can't parse XML for label config template from " + path + ':' + str(e))
            continue

        # extract fields from xml and pass them to template
        try:
            json_string = code.split('<!--')[1].split('-->')[0]
            meta = json.loads(json_string)
        except Exception as e:
            logger.error("Can't parse meta info from label config " + path + ': ' + str(e))
            continue

        meta['pk'] = i
        meta['label_config'] = '-->\n'.join(code.split('-->\n')[1:])  # remove all comments at the beginning of code

        meta['category'] = meta['category'] if 'category' in meta else 'no category'
        meta['complexity'] = meta['complexity'] if 'complexity' in meta else 'no complexity'
        templates[meta['complexity']][meta['category']].append(meta)

    # sort by title
    ordering = {
        'basic': ['audio', 'image', 'text', 'html', 'other'],
        'advanced': ['layouts', 'nested', 'per-region', 'other']
    }
    ordered_templates = OrderedDict()
    for complexity in ['basic', 'advanced']:
        ordered_templates[complexity] = OrderedDict()
        # add the rest from categories not presented in manual ordering
        x, y = ordering[complexity], templates[complexity].keys()
        ordering[complexity] = x + list((set(x) | set(y)) - set(x))
        for category in ordering[complexity]:
            sort = sorted(templates[complexity][category], key=lambda z: z.get('order', None) or z['title'])
            ordered_templates[complexity][category] = sort

    return ordered_templates


def convert_string_to_hash(string):
    return hashlib.md5(string.encode()).hexdigest()


def datetime_to_timestamp(dt):
    if dt.tzinfo:
        dt = dt.astimezone(pytz.UTC)
    return calendar.timegm(dt.timetuple())


def timestamp_to_datetime(timestamp, tz=pytz.UTC):
    return datetime.fromtimestamp(timestamp, tz)


def timestamp_to_local_datetime(timestamp):
    return timestamp_to_datetime(timestamp, tzlocal())


def timestamp_now():
    return datetime_to_timestamp(datetime.utcnow())


def serialize_class(class_instance, keys=None):
    """ Serialize class instance

    param keys: list of fields to serialize
    """
    keys = [d for d in dir(class_instance) if not d.startswith('_')] \
        if keys is None else keys

    # execute fields
    dictionary = {key: getattr(class_instance, key) for key in keys}

    # convert fields
    output = OrderedDict()
    for key in keys:
        value = dictionary[key]
        if isinstance(value, str) or isinstance(value, bool) \
                or isinstance(value, int) or isinstance(value, float) \
                or value is None:
            output[key] = dictionary[key]

    return output
