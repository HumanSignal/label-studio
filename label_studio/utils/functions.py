# big chunks of code
import os
import numpy as np

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
    task_data, completions, predictions = None, None, None
    start = config.find('<!-- {')
    start = start if start >= 0 else config.find('<!--{')
    start += 4
    end = config[start:].find('-->') if start >= 0 else -1
    if 3 < start < start + end:
        try:
            body = json.loads(config[start:start + end])
        except:
            task_data = None
        else:
            task_data = body['data'] if 'data' in body else body
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
    ts_names = defaultdict(list)
    for p in parent:
        value = p.get('value')
        value_type = p.get('valueType', p.get('valuetype', None))

        # process List
        if p.tag == 'List':
            key = p.get('elementValue').replace('$', '')
            examples['List'] = [{key: 'Hello world'}, {key: 'Goodbye world'}]

        # valueType="url"
        examples['Text'] = examples['TextUrl'] if value_type == 'url' else examples['TextRaw']
        examples['TimeSeries'] = examples['TimeSeriesUrl'] if value_type == 'url' else examples['TimeSeriesRaw']

        if value and value[0] == '$':
            # try get example by variable name
            by_name = examples.get(value, None)
            # not found by name, try get example by type
            task[value[1:]] = examples.get(p.tag, 'Something') if by_name is None else by_name

    # TimeSeries special case
    for ts_tag in xml.findall('.//TimeSeries'):
        time_column = ts_tag.get('timeValue')
        if time_column and isinstance(time_column, str) and time_column.startswith('#'):
            time_column = time_column[1:]
        value_columns = []
        for ts_child in ts_tag:
            if ts_child.tag != 'TimeSeriesChannel':
                continue
            value_col = ts_child.get('value')
            if value_col and isinstance(value_col, str) and value_col.startswith('#'):
                # TODO: add headless #column#N support
                value_col = value_col[1:]
            value_columns.append(value_col)

        tag_value = ts_tag.attrib['value'].lstrip('$')
        ts_task = task[tag_value]
        if isinstance(ts_task, str):
            # data is URL
            task[tag_value] += '/static/samples/time-series.csv?time=' + \
                               '?' + urlencode({'time': time_column, 'values': ','.join(value_columns)})

        elif isinstance(ts_task, dict):
            # data is JSON
            task[tag_value] = generate_time_series_json(time_column, value_columns)
    return task


def generate_time_series_json(time_column, value_columns):
    n = 100
    ts = {time_column: np.arange(n).tolist()}
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
