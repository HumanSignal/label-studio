# python
import json
from io import BytesIO, StringIO
import os

# 3rd party
import pytest
import unittest
from flask import (
    jsonify,
)


# label_studio
from label_studio import server
from label_studio.utils.exceptions import *
from label_studio.tests.base import (
    test_client, captured_templates, new_project,
)
from label_studio.utils import uploader


@pytest.fixture(autouse=True)
def default_project(monkeypatch):
    """
        apply patch for
        label_studio.server.project_get_or_create()
        for all tests.
    """
    monkeypatch.setattr(server, 'project_get_or_create', new_project)


@pytest.fixture
def test_case_config():
    return {
        'label_config': """\
            <View>
                <Text name="text" value="$text"/>
                <Choices name="sentiment" toName="text" choice="single">
                    <Choice value="Positive"/>
                    <Choice value="Negative"/>
                    <Choice value="Neutral"/>
                <Choice value="XXX"/>
                </Choices>
            </View>
            """,
        'text_filename': 'lorem_ipsum.txt',
        'label_data' : {
            "lead_time":474.108,
            "result": [{
                    "id":"_qRv9kaetd",
                    "from_name":"sentiment",
                    "to_name":"text",
                    "type":"choices",
                    "value":{"choices":["Neutral"]}
                }]
            }
        }


def prepare():
    """
        prepare test project - empty ?
    """
    pass


def test_config(test_client, test_case_config):
    """
        set project labeling config
        make sure it matchs config preset name
    """
    mimetype = 'multipart/form-data'
    headers = {
        'Content-Type': mimetype,
        'Accept': mimetype
    }
    data = {
        'label_config': test_case_config['label_config']
    }
    response = test_client.post('/api/save-config',
                                data=data, headers=headers)
    #print('\nresponse\n', response)
    project = new_project()

    #print('\nproject.config\n', project.config)
    #print('\nproject._storagn', project._storage)

    with open(project.config.get('label_config', None), 'r') as file:
        data = file.read()
        print(data)
        assert data == test_case_config['label_config']


"""
Content-Disposition: form-data; name="lorem_ipsum.txt"; filename="lorem_ipsum.txt"
Content-Type: text/plain

Lorem ipsum dolor sit amet,
consectetur adipiscing elit,
sed do eiusmod tempor incididunt
ut labore et dolore magna aliqua.
"""

def test_text_import(test_client, test_case_config):
    """
        import data
        make sure it is in project directory
        and tasks r created

    """
    text_filename = test_case_config['text_filename']
    mimetype = 'multipart/form-data'
    #mimetype = 'application/json'
    #mimetype = 'application/x-www-form-urlencoded'
    headers = {
        'Content-Type': mimetype,
        'Accept': mimetype
    }
    filepath = os.path.join(os.path.dirname(__file__), '../static/samples/', text_filename)
    with open(filepath, 'rb') as file:
        file_data = file.read()
    data = {
        'file': (BytesIO(b'test text for labeling'), text_filename),
    }
    response = test_client.post('/api/import',
                                data=data, headers=headers)
    #print('\ntest_text_import >> response\n', response)
    #print('\ntest_text_import >> response\n', response.data)
    project = new_project()

    with open(project.config.get('input_path', None), 'r') as file:
        data = file.read()
        print('\ntest_text_import >> data\n',data)


def test_label(test_client, test_case_config):
    """
        import data
        make sure it is in project directory

    """
    label_data = test_case_config['label_data']
    #get task_id
    task_id = 71
    response = test_client.get(f'/?task={task_id}')
    #print('\n test_label >> response\n', response.data)

    response = test_client.post(
        f'api/tasks/{task_id}/completions/', data=json.dumps(label_data))

    project = new_project()
    filename = os.path.join(project.config.get('output_dir', None), f'{task_id}.json')
    print('\n test_label >> filename\n', filename)
    with open(filename) as json_file:
        completion = json.load(json_file)
        print('completion', completion)
        assert completion.get('completions', {})[0].get('result', []) == label_data['result']


def test_export(test_client):
    """
        export data
        make sure it is in project directory

    """
    response = test_client.get('api/export')
    assert response.status_code == 200

