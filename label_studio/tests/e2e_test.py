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
import requests

# label_studio
from label_studio import server
from label_studio.utils.exceptions import *
from label_studio.tests.base import (
    test_client, captured_templates, goc_project,
)
from label_studio.utils import uploader

#TODO
# label_studio.utils.io.find_file/find_dir

@pytest.fixture(autouse=True)
def default_project(monkeypatch):
    """
        apply patch for
        label_studio.server.project_get_or_create()
        for all tests.
    """
    monkeypatch.setattr(server, 'project_get_or_create', goc_project)


@pytest.fixture
def case_config():
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
        'source': 'local',
        'filepath': os.path.join(os.path.dirname(__file__), '../static/samples/'),
        'filename': 'lorem_ipsum.txt',
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


def prepare(test_client, case_config):
    """
        prepare test project
        make empty?
    """
    goc_project()



def action_config(test_client, case_config):
    """
        action
        set project labeling config
    """
    mimetype = 'multipart/form-data'
    headers = {
        'Content-Type': mimetype,
        'Accept': mimetype
    }
    data = {
        'label_config': case_config['label_config']
    }
    response = test_client.post('/api/save-config', data=data, headers=headers)
    assert response.status_code == 201


def action_config_test(test_client, case_config):
    """
        test
        make sure it matchs config preset name
    """
    project = goc_project()

    with open(project.config.get('label_config', None), 'r') as file:
        data = file.read()
        assert data == case_config['label_config']


def action_import(test_client, case_config):
    """
        action
        import data
    """
    source = case_config['source']
    filepath = case_config['filepath']
    filename = case_config['filename']
    headers = {
        'Content-Type': 'multipart/form-data',
    }
    filepath = os.path.join(filepath, filename)
    with open(filepath, 'rb') as file:
        data = {
            filename: (file, filename),
        }

        response = test_client.post('/api/import', data=data)
    assert response.status_code == 201


def action_import_test(test_client, case_config):
    """
        test
        make sure impoted file is in project directory
        and tasks r created
    """
    project = goc_project()
    with open(project.config.get('input_path', None), 'r') as file:
        data = file.read()


def action_get_all_tasks(test_client, case_config):
    """
        action
        get all tasks
    """
    #TODO get tasks
    response = test_client.get('/api/projects/1/task_ids/')
    data = json.loads(response.data.decode('utf-8'))
    assert isinstance(data, list) == True


def action_get_task(test_client, case_config):
    """
        action
        get task by task_id
    """
    # get task by task_id
    #TODO task_id to case_config
    task_id = 0
    response = test_client.get('/api/tasks/{task_id}/'.format(task_id=task_id))
    assert response.status_code == 200


def action_label(test_client, case_config):
    """
        action
        send labeled data request
    """
    label_data = case_config['label_data']
    #get task_id
    response = test_client.get('/api/projects/1/task_ids/')
    data = json.loads(response.data.decode('utf-8'))
    task_id = data[-1]
    response = test_client.get('/?task_id={task_id}'.format(task_id=task_id))
    assert response.status_code == 200

    headers = {
        'Content-Type': 'application/json',
    }
    response = test_client.post('api/tasks/{task_id}/completions/'.format(task_id=task_id),
                                data=json.dumps(label_data),
                                headers=headers)
    assert response.status_code == 201


def action_label_test(test_client, case_config):
    """
        test
        make sure completion result same as planned
    """
    label_data = case_config['label_data']

    response = test_client.get('/api/projects/1/task_ids/')
    data = json.loads(response.data.decode('utf-8'))
    task_id = data[-1]

    project = goc_project()
    filename = os.path.join(project.config.get('output_dir', None),
                            '{task_id}.json'.format(task_id=task_id))
    with open(filename) as json_file:
        completion = json.load(json_file)
        assert completion.get('completions', {})[0].get('result', []) == label_data['result']


def action_export(test_client, case_config):
    """
        export data
        make sure it is in project directory

    """
    response = test_client.get('/api/export?format=JSON')
    assert response.status_code == 200



def action_export_test(test_client, case_config):
    """
        export data
        make sure it is in project directory

    """
    response = test_client.get('/api/export?format=JSON')
    assert response.status_code == 200


