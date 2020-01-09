# big chunks of code
import os
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
                    _DATA_EXAMPLES[root][key] = value.replace('<HOSTNAME>', '')

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

        # process List
        if p.tag == 'List':
            key = p.get('elementValue').replace('$', '')
            examples['List'] = [{key: 'Hello world'}, {key: 'Goodbye world'}]

        if value and value[0] == '$':
            task[value[1:]] = examples.get(p.tag, 'Something')

    return task


def generate_sample_task(project):
    """ Generate task example for upload and check it with serializer validation

    :param project: project with label config
    :return: task dict
    """
    task = generate_sample_task_without_check(project.label_config)

    # check generated task
    '''if project:
        try:
            TaskSerializer.check_data(project, task)
        except ValidationError as e:
            raise ValidationError(str(e) + ': task example = ' + json.dumps(task) +
                                  ', project config = ' + project.label_config +
                                  ', project data_types = ' + json.dumps(project.data_types))'''
    return task
