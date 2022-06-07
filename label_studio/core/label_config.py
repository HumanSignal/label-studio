"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import json
import pandas as pd
import numpy as np
import os
import xmljson
import jsonschema
import re

from urllib.parse import urlencode
from collections import OrderedDict
import defusedxml.ElementTree as etree
from collections import defaultdict
from django.conf import settings
from label_studio.core.utils.io import find_file
from label_studio.core.utils.exceptions import (
    LabelStudioValidationErrorSentryIgnored, LabelStudioXMLSyntaxErrorSentryIgnored
)
from label_studio_tools.core import label_config

logger = logging.getLogger(__name__)


_DATA_EXAMPLES = None
_LABEL_TAGS = {'Label', 'Choice', 'Relation'}
SINGLE_VALUED_TAGS = {
    'choices': str,
    'rating': int,
    'number': float,
    'textarea': str
}
_NOT_CONTROL_TAGS = {'Filter',}
# TODO: move configs in right place
_LABEL_CONFIG_SCHEMA = find_file('label_config_schema.json')
with open(_LABEL_CONFIG_SCHEMA) as f:
    _LABEL_CONFIG_SCHEMA_DATA = json.load(f)


def parse_config(config_string):
    """
    :param config_string: Label config string
    :return: structured config of the form:
    {
        "<ControlTag>.name": {
            "type": "ControlTag",
            "to_name": ["<ObjectTag1>.name", "<ObjectTag2>.name"],
            "inputs: [
                {"type": "ObjectTag1", "value": "<ObjectTag1>.value"},
                {"type": "ObjectTag2", "value": "<ObjectTag2>.value"}
            ],
            "labels": ["Label1", "Label2", "Label3"] // taken from "alias" if exists or "value"
    }
    """
    logger.warning("Using deprecated method - switch to label_studio.tools.label_config.parse_config!")
    return label_config.parse_config(config_string)


def _fix_choices(config):
    '''
    workaround for single choice
    https://github.com/heartexlabs/label-studio/issues/1259
    '''
    if 'Choices' in config and 'Choice' in config['Choices'] and not isinstance(config['Choices']['Choice'], list):
        config['Choices']['Choice'] = [config['Choices']['Choice']]
    if 'View' in config:
        if isinstance(config['View'], OrderedDict):
            config['View'] = _fix_choices(config['View'])
        else:
            config['View'] = [_fix_choices(view) for view in config['View']]
    return config


def parse_config_to_json(config_string):
    parser = etree.XMLParser()
    try:
        xml = etree.fromstring(config_string, parser)
    except TypeError as error:
        raise etree.ParseError('can only parse strings')
    if xml is None:
        raise etree.ParseError('xml is empty or incorrect')
    config = xmljson.badgerfish.data(xml)
    config = _fix_choices(config)
    return config


def validate_label_config(config_string):
    # xml and schema
    try:
        config = parse_config_to_json(config_string)
        jsonschema.validate(config, _LABEL_CONFIG_SCHEMA_DATA)
    except (etree.ParseError, ValueError) as exc:
        raise LabelStudioValidationErrorSentryIgnored(str(exc))
    except jsonschema.exceptions.ValidationError as exc:
        error_message = exc.context[-1].message if len(exc.context) else exc.message
        error_message = 'Validation failed on {}: {}'.format('/'.join(map(str, exc.path)), error_message.replace('@', ''))
        raise LabelStudioValidationErrorSentryIgnored(error_message)

    # unique names in config # FIXME: 'name =' (with spaces) won't work
    all_names = re.findall(r'name="([^"]*)"', config_string)
    if len(set(all_names)) != len(all_names):
        raise LabelStudioValidationErrorSentryIgnored('Label config contains non-unique names')

    # toName points to existent name
    names = set(all_names)
    toNames = re.findall(r'toName="([^"]*)"', config_string)
    for toName_ in toNames:
        for toName in toName_.split(','):
            if toName not in names:
                raise LabelStudioValidationErrorSentryIgnored(f'toName="{toName}" not found in names: {sorted(names)}')


def extract_data_types(label_config):
    # load config
    parser = etree.XMLParser()
    xml = etree.fromstring(label_config, parser)
    if xml is None:
        raise etree.ParseError('Project config is empty or incorrect')

    # take all tags with values attribute and fit them to tag types
    data_type = {}
    parent = xml.findall('.//*[@value]')
    for match in parent:
        if not match.get('name'):
            continue
        name = match.get('value')
        if len(name) > 1 and name[0] == '$':
            name = name[1:]
            data_type[name] = match.tag

    return data_type


def get_all_labels(label_config):
    outputs = parse_config(label_config)
    labels = defaultdict(list)
    dynamic_labels = defaultdict(bool)
    for control_name in outputs:
        for label in outputs[control_name].get('labels', []):
            labels[control_name].append(label)
        if outputs[control_name].get('dynamic_labels', False):
            dynamic_labels[control_name] = True
    return labels, dynamic_labels


def get_annotation_tuple(from_name, to_name, type):
    if isinstance(to_name, list):
        to_name = ','.join(to_name)
    return '|'.join([from_name, to_name, type.lower()])


def get_all_control_tag_tuples(label_config):
    outputs = parse_config(label_config)
    out = []
    for control_name, info in outputs.items():
        out.append(get_annotation_tuple(control_name, info['to_name'], info['type']))
    return out


def get_all_object_tag_names(label_config):
    return set(extract_data_types(label_config))


def config_line_stipped(c):
    tree = etree.fromstring(c)
    comments = tree.xpath('//comment()')

    for c in comments:
        p = c.getparent()
        if p is not None:
            p.remove(c)
        c = etree.tostring(tree, method='html').decode("utf-8")

    return c.replace('\n', '').replace('\r', '')


def get_task_from_labeling_config(config):
    """ Get task, annotations and predictions from labeling config comment,
        it must start from "<!-- {" and end as "} -->"
    """
    # try to get task data, annotations & predictions from config comment
    task_data, annotations, predictions = {}, None, None
    start = config.find('<!-- {')
    start = start if start >= 0 else config.find('<!--{')
    start += 4
    end = config[start:].find('-->') if start >= 0 else -1
    if 3 < start < start + end:
        try:
            logger.debug('Parse ' + config[start:start + end])
            body = json.loads(config[start:start + end])
        except Exception as exc:
            logger.error(exc, exc_info=True)
            pass
        else:
            logger.debug(json.dumps(body, indent=2))
            dont_use_root = 'predictions' in body or 'annotations' in body
            task_data = body['data'] if 'data' in body else (None if dont_use_root else body)
            predictions = body['predictions'] if 'predictions' in body else None
            annotations = body['annotations'] if 'annotations' in body else None
    return task_data, annotations, predictions


def data_examples(mode):
    """ Data examples for editor preview and task upload examples
    """
    global _DATA_EXAMPLES

    if _DATA_EXAMPLES is None:
        with open(find_file('data_examples.json'), encoding='utf-8') as f:
            _DATA_EXAMPLES = json.load(f)

        roots = ['editor_preview', 'upload']
        for root in roots:
            for key, value in _DATA_EXAMPLES[root].items():
                if isinstance(value, str):
                    _DATA_EXAMPLES[root][key] = value.replace('<HOSTNAME>', settings.HOSTNAME)

    return _DATA_EXAMPLES[mode]


def generate_sample_task_without_check(label_config, mode='upload', secure_mode=False):
    """ Generate sample task only
    """
    # load config
    parser = etree.XMLParser()
    xml = etree.fromstring(label_config, parser)
    if xml is None:
        raise etree.ParseError('Project config is empty or incorrect')

    # make examples pretty
    examples = data_examples(mode=mode)

    # iterate over xml tree and find values with '$'
    task = {}
    parent = xml.findall('.//*[@value]')  # take all tags with value attribute
    for p in parent:

        # Make sure it is a real object tag, extract data placeholder key
        value = p.get('value')
        if not value or not value.startswith('$'):
            continue
        value = value[1:]

        # detect secured mode - objects served as URLs
        value_type = p.get('valueType') or p.get('valuetype')
        only_urls = secure_mode or value_type == 'url'

        example_from_field_name = examples.get('$' + value)
        if example_from_field_name:
            # try to get example by variable name
            task[value] = example_from_field_name

        elif value == 'video' and p.tag == 'HyperText':
            task[value] = examples.get('$videoHack')

        elif p.tag == 'Paragraphs':
            # Paragraphs special case - replace nameKey/textKey if presented
            name_key = p.get('nameKey') or p.get('namekey') or 'author'
            text_key = p.get('textKey') or p.get('textkey') or 'text'
            if only_urls:
                params = {'nameKey': name_key, 'textKey': text_key}
                task[value] = examples['ParagraphsUrl'] + urlencode(params)
            else:
                task[value] = []
                for item in examples[p.tag]:
                    task[value].append({name_key: item['author'], text_key: item['text']})

        elif p.tag == 'TimeSeries':
            # TimeSeries special case - generate signals on-the-fly
            time_column = p.get('timeColumn')
            value_columns = []
            for ts_child in p:
                if ts_child.tag != 'Channel':
                    continue
                value_columns.append(ts_child.get('column'))
            sep = p.get('sep')
            time_format = p.get('timeFormat')

            if only_urls:
                # data is URL
                params = {'time': time_column, 'values': ','.join(value_columns)}
                if sep:
                    params['sep'] = sep
                if time_format:
                    params['tf'] = time_format
                task[value] = '/samples/time-series.csv?' + urlencode(params)
            else:
                # data is JSON
                task[value] = generate_time_series_json(time_column, value_columns, time_format)
        elif p.tag == 'HyperText':
            if only_urls:
                task[value] = examples['HyperTextUrl']
            else:
                task[value] = examples['HyperText']
        elif p.tag.lower().endswith('labels'):
            task[value] = examples['Labels']
        elif p.tag.lower() == "choices":
            allow_nested = p.get('allowNested') or p.get('allownested') or "false"
            if allow_nested == "true":
                task[value] = examples['NestedChoices']
            else:
                task[value] = examples['Choices']
        else:
            # patch for valueType="url"
            examples['Text'] = examples['TextUrl'] if only_urls else examples['TextRaw']
            # not found by name, try get example by type
            task[value] = examples.get(p.tag, 'Something')

        # support for Repeater tag
        if '[' in value:
            base = value.split('[')[0]
            child = value.split(']')[1]

            # images[{{idx}}].url => { "images": [ {"url": "test.jpg"} ] }
            if child.startswith('.'):
                child_name = child[1:]
                task[base] = [{child_name: task[value]}, {child_name: task[value]}]
            # images[{{idx}}].url => { "images": [ "test.jpg", "test.jpg" ] }
            else:
                task[base] = [task[value], task[value]]

            # remove unused "images[{{idx}}].url"
            task.pop(value, None)

    return task


def _is_strftime_string(s):
    # simple way to detect strftime format
    return '%' in s


def generate_time_series_json(time_column, value_columns, time_format=None):
    """ Generate sample for time series
    """
    n = 100
    if time_format is not None and not _is_strftime_string(time_format):
        time_fmt_map = {
            'yyyy-MM-dd': '%Y-%m-%d'
        }
        time_format = time_fmt_map.get(time_format)

    if time_format is None:
        times = np.arange(n).tolist()
    else:
        times = pd.date_range('2020-01-01', periods=n, freq='D').strftime(time_format).tolist()
    ts = {time_column: times}
    for value_col in value_columns:
        ts[value_col] = np.random.randn(n).tolist()
    return ts


def get_sample_task(label_config, secure_mode=False):
    """ Get sample task from labeling config and combine it with generated sample task
    """
    predefined_task, annotations, predictions = get_task_from_labeling_config(label_config)
    generated_task = generate_sample_task_without_check(label_config, mode='editor_preview', secure_mode=secure_mode)
    if predefined_task is not None:
        generated_task.update(predefined_task)
    return generated_task, annotations, predictions


def config_essential_data_has_changed(new_config_str, old_config_str):
    """ Detect essential changes of the labeling config
    """
    new_config = parse_config(new_config_str)
    old_config = parse_config(old_config_str)

    for tag, new_info in new_config.items():
        if tag not in old_config:
            return True
        old_info = old_config[tag]
        if new_info['type'] != old_info['type']:
            return True
        if new_info['inputs'] != old_info['inputs']:
            return True
        if not set(old_info['labels']).issubset(new_info['labels']):
            return True


def replace_task_data_undefined_with_config_field(data, project, first_key=None):
    """ Use first key is passed (for speed up) or project.data.types.keys()[0]
    """
    # assign undefined key name from data to the first key from config, e.g. for txt loading
    if settings.DATA_UNDEFINED_NAME in data and (first_key or project.data_types.keys()):
        key = first_key or list(project.data_types.keys())[0]
        data[key] = data[settings.DATA_UNDEFINED_NAME]
        del data[settings.DATA_UNDEFINED_NAME]
