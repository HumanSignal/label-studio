# python
import os

# 3rd party
import pytest

# label_studio
from label_studio import server
from label_studio.server import (
    input_args,
    validation_error_handler,
)
from label_studio.tests.base import (
    test_client, captured_templates, new_project,
)


@pytest.fixture(autouse=True)
def default_project(monkeypatch):
    """
        apply patch for
        label_studio.server.project_get_or_create()
        for all tests.
    """
    monkeypatch.setattr(server, 'project_get_or_create', new_project)


class TestUtilities:

    def test_validation_error_handler(self):
        assert validation_error_handler('error') == ('error', 500)


class TestMain:
    """/ Main"""

    def test_labeling_page(self, test_client, captured_templates):

        response = test_client.get('/')
        # tasks exists
        if response.status_code == 200:
            print('\n captured_templates', captured_templates)
            template, context = captured_templates[0]
            assert template.name == 'labeling.html'
            assert context.get('label_config_line', None) != None
        else:
            #no tasks
            assert response.status_code == 302


class TestWelcome:
    """Welcome"""

    def test_welcome_returns_200(self, test_client, captured_templates):
        """Login successful."""
        response = test_client.get("/welcome")
        template, context = captured_templates[0]

        assert template.name == 'welcome.html'
        assert response.status_code == 200

    def test_welcome_no_post(self, test_client):
        response = test_client.post('/welcome')
        assert response.status_code == 405


class TestTasks:
    """Tasks"""

    def test_tasks_returns_200(self, test_client, captured_templates):
        response = test_client.get("/api/tasks")
        #assert template.name == 'tasks.html'
        assert response.status_code == 200


class TestSetup:
    """Setup"""
    def test_setup_page(self, test_client, captured_templates):
        response = test_client.get('/setup')
        template, context = captured_templates[0]

        #assert template.name == 'setup.html'
        assert response.status_code == 200


class TestImport:
    """Import"""
    def test_import_page(self, test_client, captured_templates):
        response = test_client.get('/import')
        template, context = captured_templates[0]

        assert template.name == 'import.html'
        assert response.status_code == 200


class TestExport:
    """Export"""
    def test_export_page(self, test_client, captured_templates):
        response = test_client.get('/export')
        template, context = captured_templates[0]

        assert template.name == 'export.html'
        assert response.status_code == 200


class TestModel:
    """Model"""
    def test_model_page(self, test_client,  captured_templates):
        response = test_client.get('/model')
        template, context = captured_templates[0]

        assert template.name == 'model.html'
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
