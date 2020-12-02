import pytest

# label_studio
from label_studio import blueprint as server
from label_studio.tests.base import goc_project


@pytest.fixture(autouse=True)
def default_project(monkeypatch):
    """
        apply patch for
        label_studio.server.project_get_or_create()
        for all tests.
    """
    monkeypatch.setattr(server, 'project_get_or_create', goc_project)


class TestColumns:
    """ Table Columns
    """
    def test_import_page(self, test_client, captured_templates):
        response = test_client.get('/api/project/columns')
        assert response.status_code == 200


class TestTabs:
    """ Table Tabs
    """

    def test_tabs(self, test_client, captured_templates):
        response = test_client.get('/api/project/tabs')
        assert response.status_code == 200

    def test_selected_items(self, test_client, captured_templates):
        # post
        response = test_client.post('/api/project/tabs/1/selected-items', json=[1, 2, 3])
        assert response.status_code == 201

        # get
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == [1, 2, 3]

        # patch
        response = test_client.patch('/api/project/tabs/1/selected-items', json=[4, 5])
        assert response.status_code == 201
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == [1, 2, 3, 4, 5]

        # delete
        response = test_client.delete('/api/project/tabs/1/selected-items', json=[3])
        assert response.status_code == 204
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == [1, 2, 4, 5]

        # check tab has selectedItems
        response = test_client.get('/api/project/tabs/1/')
        assert response.status_code == 200
        assert response.json['selectedItems'] == [1, 2, 4, 5]

        # select all
        response = test_client.post('/api/project/tabs/1/selected-items', json='all')
        assert response.status_code == 201
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json['selectedItems'] == list(range(0, 32))

        # delete all
        response = test_client.delete('/api/project/tabs/1/selected-items', json='all')
        assert response.status_code == 204
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == []


class TestTasksAndAnnotations:
    """ Test tasks on tabs
    """
    def test_tasks(self, test_client, captured_templates):
        response = test_client.get('/api/project/tabs/1/tasks')
        assert response.status_code == 200

    def test_annotations(self, test_client, captured_templates):
        response = test_client.get('/api/project/tabs/1/annotations')
        assert response.status_code == 200
