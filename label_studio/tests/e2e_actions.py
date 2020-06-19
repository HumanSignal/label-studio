# python
import json
import os

# label_studio
from label_studio.tests.base import goc_project


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
    task_id = case_config['task_id']
    response = test_client.get('/api/tasks/{task_id}/'.format(task_id=task_id))
    assert response.status_code == 200


def action_label(test_client, case_config):
    """
        action
        send labeled data request
    """
    completion = case_config['completion']
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
                                data=json.dumps(completion),
                                headers=headers)
    assert response.status_code == 201


def action_label_test(test_client, case_config):
    """
        test
        make sure completion result same as planned
    """
    completion = case_config['completion']

    response = test_client.get('/api/projects/1/task_ids/')
    data = json.loads(response.data.decode('utf-8'))
    task_id = data[-1]

    project = goc_project()
    filename = os.path.join(project.config.get('output_dir', None),
                            '{task_id}.json'.format(task_id=task_id))
    with open(filename) as json_file:
        completion = json.load(json_file)
        assert completion.get('completions', {})[0].get('result', []) == completion['result']


def action_export(test_client, case_config):
    """
        export data
        make sure it is in project directory
    """
    export_format = case_config['format']
    response = test_client.get('/api/export?format={export_format}'.format(
        export_format=export_format))
    assert response.status_code == 200


def action_export_test(test_client, case_config):
    """
        export data
        make sure it is in project directory
    """
    export_format = case_config['format']
    response = test_client.get('/api/export?format={export_format}'.format(
        export_format=export_format))
    assert response.status_code == 200
