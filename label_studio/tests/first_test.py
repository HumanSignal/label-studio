# python

# 3rd party
import pytest

# label_studio
from label_studio.server import (
    app,
    validation_error_handler,
)
from label_studio.tests.base import (
    test_client, new_project
)


#def test_project_get_or_create():


def test_validation_error_handler():
    assert validation_error_handler('error') == ('error', 500)


def test_labeling_page(test_client):
    response = test_client.get('/')
    assert response.status_code == 200


def test_welcome(test_client):
    response = test_client.get('/welcome')
    assert response.status_code == 200


def test_welcome_no_post(test_client):
    response = test_client.post('/welcome')
    assert response.status_code == 405

def test_tasks_page(test_client):
    response = test_client.get('/welcome')
    assert response.status_code == 200


def test_setup_page(test_client):
    response = test_client.get('/setup')
    assert response.status_code == 200


def test_import_page(test_client):
    response = test_client.get('/import')
    assert response.status_code == 200


def test_export_page(test_client):
    response = test_client.get('/export')
    assert response.status_code == 200


def test_model_page(test_client):
    response = test_client.get('/model')
    assert response.status_code == 200

#def api_render_label_studio():
#def api_validate_config():
#def api_save_config():
#def api_import_example():
#def api_import_example_file():
#def api_import():
#def api_export():
#def api_generate_next_task():
#def api_project():
#def api_project_storage_settings():
#def api_all_task_ids():
#def api_all_tasks():
#def api_tasks(task_id):
#def api_tasks_delete():
#def api_all_completion_ids():
#def api_completions(task_id):
#def api_tasks_cancel(task_id):
#def api_completion_by_id(task_id, completion_id):
#def api_completion_update(task_id, completion_id):
#def api_instruction():
#def api_remove_ml_backend():
#def api_predict():
#def api_train():
#def api_predictions():
#def get_data_file(filename):
#def str2datetime(timestamp_str):
#def start_browser(ls_url, no_browser):
