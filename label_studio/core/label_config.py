"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging
import re
from collections import OrderedDict, defaultdict
from typing import Tuple, Union
from urllib.parse import urlencode

import defusedxml.ElementTree as etree
import jsonschema
import numpy as np
import pandas as pd
import xmljson
from django.conf import settings
from label_studio_sdk._extensions.label_studio_tools.core import label_config
from label_studio_sdk._legacy.exceptions import LabelStudioValidationErrorSentryIgnored
from label_studio_sdk.label_interface import LabelInterface
from rest_framework.exceptions import ValidationError

from label_studio.core.utils.io import find_file

logger = logging.getLogger(__name__)


_DATA_EXAMPLES = None
_LABEL_TAGS = {'Label', 'Choice', 'Relation'}
SINGLE_VALUED_TAGS = {'choices': str, 'rating': int, 'number': float, 'textarea': str}
_NOT_CONTROL_TAGS = {
    'Filter',
}
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
    logger.warning('Using deprecated method - switch to label_studio.tools.label_config.parse_config!')
    return label_config.parse_config(config_string)


def _fix_choices(config):
    """
    workaround for single choice
    https://github.com/HumanSignal/label-studio/issues/1259
    """
    if 'Choices' in config:
        # for single Choices tag in View
        if 'Choice' in config['Choices'] and not isinstance(config['Choices']['Choice'], list):
            config['Choices']['Choice'] = [config['Choices']['Choice']]
        # for several Choices tags in View
        elif isinstance(config['Choices'], list) and all('Choice' in tag_choices for tag_choices in config['Choices']):
            for n in range(len(config['Choices'])):
                # check that Choices tag has only 1 choice
                if not isinstance(config['Choices'][n]['Choice'], list):
                    config['Choices'][n]['Choice'] = [config['Choices'][n]['Choice']]
    if 'View' in config:
        if isinstance(config['View'], OrderedDict):
            config['View'] = _fix_choices(config['View'])
        else:
            config['View'] = [_fix_choices(view) for view in config['View']]
    return config


def parse_config_to_xml(config_string: Union[str, None], raise_on_empty: bool = False) -> Union[OrderedDict, None]:
    if config_string is None:
        if raise_on_empty:
            raise TypeError('config_string is None')
        return None

    xml = etree.fromstring(config_string, forbid_dtd=True)

    # Remove comments
    for comment in xml.findall('.//comment'):
        comment.getparent().remove(comment)

    return xml


def parse_config_to_json(config_string: Union[str, None]) -> Tuple[Union[OrderedDict, None], Union[str, None]]:
    try:
        xml = parse_config_to_xml(config_string, raise_on_empty=True)
    except TypeError:
        raise etree.ParseError('can only parse strings')
    if xml is None:
        raise etree.ParseError('xml is empty or incorrect')
    config = xmljson.badgerfish.data(xml)
    config = _fix_choices(config)
    return config, etree.tostring(xml, encoding='unicode')


def validate_label_config(config_string: Union[str, None]) -> None:
    # xml and schema
    try:
        config, cleaned_config_string = parse_config_to_json(config_string)
        jsonschema.validate(config, _LABEL_CONFIG_SCHEMA_DATA)
    except (etree.ParseError, ValueError) as exc:
        raise ValidationError(str(exc))
    except jsonschema.exceptions.ValidationError as exc:
        # jsonschema4 validation error now includes all errors from "anyOf" subschemas
        # check https://python-jsonschema.readthedocs.io/en/latest/errors/#jsonschema.exceptions.ValidationError.context
        # we pick the first failed schema and show only its error message
        error_message = exc.context[0].message if len(exc.context) else exc.message
        error_message = 'Validation failed on {}: {}'.format(
            '/'.join(map(str, exc.path)), error_message.replace('@', '')
        )
        raise ValidationError(error_message)

    # unique names in config # FIXME: 'name =' (with spaces) won't work
    all_names = re.findall(r'name="([^"]*)"', cleaned_config_string)
    if len(set(all_names)) != len(all_names):
        raise ValidationError('Label config contains non-unique names')

    # toName points to existent name
    names = set(all_names)
    toNames = re.findall(r'toName="([^"]*)"', cleaned_config_string)
    for toName_ in toNames:
        for toName in toName_.split(','):
            if toName not in names:
                raise ValidationError(f'toName="{toName}" not found in names: {sorted(names)}')

    # Tag attribute validation (e.g. Video playback speed) via SDK
    try:
        li = LabelInterface(config_string)
        if hasattr(li, '_tag_attribute_validation'):
            li._tag_attribute_validation()
    except LabelStudioValidationErrorSentryIgnored as exc:
        raise ValidationError(str(exc))


def extract_data_types(label_config):
    # load config
    xml = parse_config_to_xml(label_config)
    if xml is None:
        raise etree.ParseError('Project config is empty or incorrect')

    # take all tags with values attribute and fit them to tag types
    data_type = {}
    parent = xml.findall('.//*[@value]')
    for match in parent:
        if not match.get('name'):
            continue
        name = match.get('value')

        # simple one
        if len(name) > 1 and (name[0] == '$'):
            name = name[1:]
            # video has highest priority, e.g.
            # for <Video value="url"/> <Audio value="url"> it must be data_type[url] = Video
            if data_type.get(name) != 'Video':
                data_type[name] = match.tag

        # regex
        else:
            pattern = r'\$\w+'  # simple one: r'\$\w+'
            regex = re.findall(pattern, name)
            first = regex[0][1:] if len(regex) > 0 else ''

            if first:
                if data_type.get(first) != 'Video':
                    data_type[first] = match.tag

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
    xml = parse_config_to_xml(c)
    if xml is None:
        return None

    return etree.tostring(xml, encoding='unicode').replace('\n', '').replace('\r', '')


def get_task_from_labeling_config(config):
    """Get task, annotations and predictions from labeling config comment,
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
            logger.debug('Parse ' + config[start : start + end])
            body = json.loads(config[start : start + end])
        except Exception:
            logger.error("Can't parse task from labeling config", exc_info=True)
            pass
        else:
            logger.debug(json.dumps(body, indent=2))
            dont_use_root = 'predictions' in body or 'annotations' in body
            task_data = body['data'] if 'data' in body else (None if dont_use_root else body)
            predictions = body['predictions'] if 'predictions' in body else None
            annotations = body['annotations'] if 'annotations' in body else None
    return task_data, annotations, predictions


def data_examples(mode):
    """Data examples for editor preview and task upload examples"""
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
    """Generate sample task only"""
    # load config
    xml = parse_config_to_xml(label_config)
    if xml is None:
        raise etree.ParseError('Project config is empty or incorrect')

    # make examples pretty
    examples = data_examples(mode=mode)

    # iterate over xml tree and find elements with 'value' or 'valueList' attributes
    task = {}
    # Include both 'value' and 'valueList' attributes in the search
    parent = xml.findall('.//*[@value]') + xml.findall('.//*[@valueList]')
    for p in parent:
        # Extract data placeholder key
        value = p.get('value') or p.get('valueList')
        if not value or not value.startswith('$'):
            continue
        value = value[1:]
        is_value_list = 'valueList' in p.attrib  # Check if the attribute is 'valueList'

        # detect secured mode - objects served as URLs
        value_type = p.get('valueType') or p.get('valuetype')

        only_urls = value_type == 'url'
        if secure_mode and p.tag in ['Paragraphs', 'HyperText', 'Text']:
            # In secure mode default valueType for Paragraphs and RichText is "url"
            only_urls = only_urls or value_type is None
        if p.tag == 'TimeSeries':
            # for TimeSeries default valueType is "url"
            only_urls = only_urls or value_type is None

        example_from_field_name = examples.get('$' + value)
        if example_from_field_name:
            # Get example by variable name
            task[value] = [example_from_field_name] if is_value_list else example_from_field_name

        elif value == 'video' and p.tag == 'HyperText':
            task[value] = examples.get('$videoHack')
        # List with a matching Ranker tag pair
        elif p.tag == 'List':
            task[value] = examples.get('List')
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
            if hasattr(p, 'findall'):
                channels = p.findall('.//Channel[@column]')
                for ts_child in channels:
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
        elif p.tag.lower() == 'choices':
            allow_nested = p.get('allowNested') or p.get('allownested') or 'false'
            if allow_nested == 'true':
                task[value] = examples['NestedChoices']
            else:
                task[value] = examples['Choices']
        else:
            # Patch for valueType="url"
            examples['Text'] = examples['TextUrl'] if only_urls else examples['TextRaw']
            # Not found by name, try to get example by type
            example_value = examples.get(p.tag, 'Something')
            task[value] = [example_value] if is_value_list else example_value

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


def _get_smallest_time_freq(time_format):
    """Determine the smallest time component in strftime format and return pandas frequency"""
    if not time_format:
        return 'D'  # default to daily

    # Order from smallest to largest (we want the smallest one)
    time_components = [
        ('%S', 's'),  # second
        ('%M', 'min'),  # minute
        ('%H', 'h'),  # hour
        ('%d', 'D'),  # day
        ('%m', 'MS'),  # month start
        ('%Y', 'YS'),  # year start
    ]

    # Find the smallest time component present in the format
    for strftime_code, pandas_freq in time_components:
        if strftime_code in time_format:
            return pandas_freq

    return 'D'  # default to daily if no time components found


def generate_time_series_json(time_column, value_columns, time_format=None):
    """Generate sample for time series"""
    n = 100
    if time_format is not None and not _is_strftime_string(time_format):
        time_fmt_map = {'yyyy-MM-dd': '%Y-%m-%d'}
        time_format = time_fmt_map.get(time_format)

    if time_format is None:
        times = np.arange(n).tolist()
    else:
        # Automatically determine the appropriate frequency based on time format
        freq = _get_smallest_time_freq(time_format)
        times = pd.date_range('2020-01-01', periods=n, freq=freq)
        new_times = []
        prev_time_str = None
        for time in times:
            time_str = time.strftime(time_format)

            # Check if formatted string is monotonic (to handle cycling due to format truncation)
            if prev_time_str is not None and time_str <= prev_time_str:
                break

            new_times.append(time_str)
            prev_time_str = time_str  # Update prev_time_str for next iteration

        times = new_times

    ts = {time_column: times}
    for value_col in value_columns:
        ts[value_col] = np.random.randn(len(times)).tolist()
    return ts


def get_sample_task(label_config, secure_mode=False):
    """Get sample task from labeling config and combine it with generated sample task"""
    predefined_task, annotations, predictions = get_task_from_labeling_config(label_config)
    generated_task = generate_sample_task_without_check(label_config, mode='editor_preview', secure_mode=secure_mode)
    if predefined_task is not None:
        generated_task.update(predefined_task)
    return generated_task, annotations, predictions


def config_essential_data_has_changed(new_config_str, old_config_str):
    """Detect essential changes of the labeling config"""
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
    """Use first key is passed (for speed up) or project.data.types.keys()[0]"""
    # assign undefined key name from data to the first key from config, e.g. for txt loading
    if settings.DATA_UNDEFINED_NAME in data and (first_key or project.data_types.keys()):
        key = first_key or list(project.data_types.keys())[0]
        data[key] = data[settings.DATA_UNDEFINED_NAME]
        del data[settings.DATA_UNDEFINED_NAME]


def check_control_in_config_by_regex(config_string, control_type, filter=None):
    """
    Check if control type is in config including regex filter
    """
    c = parse_config(config_string)
    if filter is not None and len(filter) == 0:
        return False
    if filter:
        c = {key: c[key] for key in filter}
    for control in c:
        item = c[control].get('regex', {})
        expression = control
        for key in item:
            expression = expression.replace(key, item[key])
        pattern = re.compile(expression)
        full_match = pattern.fullmatch(control_type)
        if full_match:
            return True
    return False


def check_toname_in_config_by_regex(config_string, to_name, control_type=None):
    """
    Check if to_name is in config including regex filter
    :return: True if to_name is fullmatch to some pattern ion config
    """
    c = parse_config(config_string)
    if control_type:
        check_list = [control_type]
    else:
        check_list = list(c.keys())
    for control in check_list:
        item = c[control].get('regex', {})
        for to_name_item in c[control]['to_name']:
            expression = to_name_item
            for key in item:
                expression = expression.replace(key, item[key])
            pattern = re.compile(expression)
            full_match = pattern.fullmatch(to_name)
            if full_match:
                return True
    return False


def get_original_fromname_by_regex(config_string, fromname):
    """
    Get from_name from config on from_name key from data after applying regex search or original fromname
    """
    c = parse_config(config_string)
    for control in c:
        item = c[control].get('regex', {})
        expression = control
        for key in item:
            expression = expression.replace(key, item[key])
        pattern = re.compile(expression)
        full_match = pattern.fullmatch(fromname)
        if full_match:
            return control
    return fromname


def get_all_types(label_config):
    """
    Get all types from label_config
    """
    outputs = parse_config(label_config)
    out = []
    for control_name, info in outputs.items():
        out.append(info['type'].lower())
    return out
