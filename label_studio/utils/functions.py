# big chunks of code
import os
import numpy as np
import pandas as pd

from collections import defaultdict
from urllib.parse import urlencode
from lxml import etree
try:
    import ujson as json
except:
    import json

# examples for import tasks
_DATA_EXAMPLES = None

# label config validation schema
_LABEL_CONFIG_SCHEMA = os.path.join(os.path.dirname(__file__), 'schema', 'label_config_schema.json')
with open(_LABEL_CONFIG_SCHEMA) as f:
    _LABEL_CONFIG_SCHEMA_DATA = json.load(f)


PROTOCOL = ''
HOSTNAME = ''


def get_task_from_labeling_config(config):
    # try to get task data, completions & predictions from config comment
    task_data, completions, predictions = {}, None, None
    start = config.find('<!-- {')
    start = start if start >= 0 else config.find('<!--{')
    start += 4
    end = config[start:].find('-->') if start >= 0 else -1
    if 3 < start < start + end:
        try:
            body = json.loads(config[start:start + end])
        except:
            pass
        else:
            dont_use_root = 'predictions' in body or 'completions' in body
            task_data = body['data'] if 'data' in body else (None if dont_use_root else body)
            predictions = body['predictions'] if 'predictions' in body else None
            completions = body['completions'] if 'completions' in body else None
    return task_data, completions, predictions


def data_examples(mode):
    """ Data examples for editor preview and task upload examples
    """
    global _DATA_EXAMPLES

    if _DATA_EXAMPLES is None:
        with open(os.path.join(os.path.dirname(__file__), 'schema', 'data_examples.json')) as f:
            _DATA_EXAMPLES = json.load(f)

        roots = ['editor_preview', 'upload']
        for root in roots:
            for key, value in _DATA_EXAMPLES[root].items():
                if isinstance(value, str):
                    _DATA_EXAMPLES[root][key] = value.replace('<HOSTNAME>', HOSTNAME)

    return _DATA_EXAMPLES[mode]


def generate_sample_task_without_check(label_config, mode='upload'):
    """ Generate sample task only
    """
    # load config
    parser = etree.XMLParser()
    xml = etree.fromstring(label_config, parser)
    if xml is None:
        raise etree.XMLSchemaParseError('Project config is empty or incorrect')

    # make examples pretty
    examples = data_examples(mode=mode)

    # iterate over xml tree and find values with '$'
    task = {}
    parent = xml.findall('.//*[@value]')  # take all tags with value attribute
    for p in parent:
        value = p.get('value')
        value_type = p.get('valueType', p.get('valuetype', None))

        # process List
        if p.tag == 'List':
            key = p.get('elementValue').replace('$', '')
            examples['List'] = [{key: 'Hello world'}, {key: 'Goodbye world'}]

        # valueType="url"
        examples['Text'] = examples['TextUrl'] if value_type == 'url' else examples['TextRaw']
        examples['TimeSeries'] = examples['TimeSeriesUrl'] if value_type == 'url' or value_type is None else examples['TimeSeriesRaw']

        if value and value[0] == '$':
            # try get example by variable name
            by_name = examples.get(value, None)
            # not found by name, try get example by type
            task[value[1:]] = examples.get(p.tag, 'Something') if by_name is None else by_name

    # TimeSeries special case
    for ts_tag in xml.findall('.//TimeSeries'):
        time_column = ts_tag.get('timeColumn')
        value_columns = []
        for ts_child in ts_tag:
            if ts_child.tag != 'Channel':
                continue
            value_columns.append(ts_child.get('column'))
        sep = ts_tag.get('sep')
        time_format = ts_tag.get('timeFormat')

        tag_value = ts_tag.attrib['value'].lstrip('$')
        ts_task = task[tag_value]
        if isinstance(ts_task, str):
            # data is URL
            params = {'time': time_column, 'values': ','.join(value_columns)}
            if sep:
                params['sep'] = sep
            if time_format:
                params['tf'] = time_format
            task[tag_value] = '/samples/time-series.csv?' + urlencode(params)

        elif isinstance(ts_task, dict):
            # data is JSON
            task[tag_value] = generate_time_series_json(time_column, value_columns, time_format)
    return task


def _is_strftime_string(s):
    # very dumb but works
    return '%' in s


def generate_time_series_json(time_column, value_columns, time_format=None):
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


def generate_sample_task(project):
    """ Generate task example for upload and check it with serializer validation

    :param project: project with label config
    :return: task dict
    """
    task = generate_sample_task_without_check(project.label_config)
    return task


def set_full_hostname(hostname):
    global HOSTNAME
    HOSTNAME = hostname


def get_full_hostname():
    global HOSTNAME
    return HOSTNAME


def get_web_protocol():
    """ http or https
    """
    global PROTOCOL
    return PROTOCOL


def set_web_protocol(protocol):
    """ http or https
    """
    global PROTOCOL
    PROTOCOL = protocol
