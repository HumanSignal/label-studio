# python
import os
import json
import io

# 3rd party
import pytest

# label_studio
from label_studio import server
from label_studio.server import (
    input_args,
    validation_error_handler,
)
from label_studio.tests.base import (
    test_client, captured_templates, goc_project,
)
from label_studio.utils.uri_resolver import resolve_task_data_uri


@pytest.fixture(autouse=True)
def default_project(monkeypatch):
    """
        apply patch for
        label_studio.server.project_get_or_create()
        for all tests.
    """
    monkeypatch.setattr(server, 'project_get_or_create', goc_project)


class TestUtilities:

    def test_validation_error_handler(self):
        assert validation_error_handler('error') == ('error', 500)


class TestMain:
    """/ Main"""

    def test_labeling_page(self, test_client, captured_templates):

        response = test_client.get('/')
        # tasks exists
        if response.status_code == 200:
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


class TestCompletions:
    """Completions"""

    def test_create_task(self, test_client):
        filename = 'lores_impsum.txt'
        headers = {
            'Content-Type': 'multipart/form-data',
        }
        data = {
            filename: (io.BytesIO(b'ut labore et dolore magna aliqua.'), filename)
        }
        response = test_client.post('/api/import', data=data)
        assert response.status_code == 201


    def test_send_new_autosave(self, test_client):
        task_id = 0
        url = '/api/tasks/{task_id}/completions/'.format(task_id=task_id)
        headers={
            'Content-Type': 'application/json',
        }
        data = {
            'lead_time':79.583,
            'result':[{'id':'MGK92Ogo4t','from_name':'sentiment',
                       'to_name':'text','type':'choices',
                       'value':{'choices':['Positive']}}],
            'draft':True,
        }
        data = json.dumps(data)
        response = test_client.post(url, data=data, headers=headers)
        assert response.status_code == 201

    def test_send_existed_autosave(self, test_client):
        task_id = 0
        completion_id = '000001'
        url = '/api/tasks/{task_id}/completions/{completion_id}/'.format(
            task_id=task_id, completion_id=completion_id)
        headers={
            'Content-Type': 'application/json',
        }
        data = {
            'lead_time':79.583,
            'result':[{'id':'MGK92Ogo4t','from_name':'sentiment',
                       'to_name':'text','type':'choices',
                       'value':{'choices':['Neutral']}}],
            'draft':True,
        }
        data = json.dumps(data)
        response = test_client.patch(url, data=data, headers=headers)
        assert response.status_code == 201

    def test_tasks_returns_200(self, test_client, captured_templates):
        response = test_client.get("/api/tasks")
        assert response.status_code == 200

    def test_this_task_returns_200(self, test_client, captured_templates):
        task_id = 0
        url = "/?task_id={task_id}".format(task_id=task_id)
        response = test_client.get(url)
        assert response.status_code == 200

