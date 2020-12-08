# python
import os

# 3rd party
import pytest

# label_studio
from label_studio import blueprint as server
from label_studio.blueprint import (
    validation_error_handler,
)
from label_studio.tests.base import goc_project


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
        response = test_client.get("/tasks")
        template, context = captured_templates[0]
        assert template.name == 'tasks.html'
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

        assert template.name == 'import_new.html'
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
