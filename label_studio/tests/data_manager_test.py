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


def project_init_source():
    project = goc_project()
    ids = range(0, 16)
    values = [{'data': {'image': '123', 'text': '123' + str(i)}, 'id': i} for i in range(0, 16)]
    project.source_storage.remove_all()
    project.source_storage.set_many(ids, values)
    return project


def project_init_target():
    project = goc_project()
    ids = range(0, 16)
    project.target_storage.remove_all()
    for i in ids:
        value = {
            'id': i,
            'data': {'image': '123', 'text': '123'},
            'completions': [{'id': 1001 + i}]
        }
        project.target_storage.set(i, value)
    return project


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
        project_init_source()

        # post
        response = test_client.post('/api/project/tabs/1/selected-items', json={"all": False, "included": [1, 2, 3]})
        assert response.status_code == 201

        # get
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == {'all': False, 'included': [1, 2, 3]}

        # patch
        response = test_client.patch('/api/project/tabs/1/selected-items', json={"all": False, "included": [4, 5]})
        assert response.status_code == 201
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == {'all': False, 'included': [1, 2, 3, 4, 5]}

        # delete
        response = test_client.delete('/api/project/tabs/1/selected-items', json={"all": False, "included": [3]})
        assert response.status_code == 204
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == {'all': False, 'included': [1, 2, 4, 5]}

        # check TAB has selectedItems
        response = test_client.get('/api/project/tabs/1/')
        assert response.status_code == 200
        assert response.json['selectedItems'] == {'all': False, 'included': [1, 2, 4, 5]}

        # select all
        response = test_client.post('/api/project/tabs/1/selected-items', json={'all': True, 'excluded': []})
        assert response.status_code == 201
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == {'all': True, 'excluded': []}

        # delete all
        response = test_client.delete('/api/project/tabs/1/selected-items', json={'all': True, 'excluded': []})
        assert response.status_code == 204
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == {'all': True, 'excluded': []}

    def test_selected_items_excluded(self, test_client, captured_templates):
        project_init_source()

        # post
        response = test_client.post('/api/project/tabs/1/selected-items', json={"all": True, "excluded": [1, 2, 3]})
        assert response.status_code == 201

        # get
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == {'all': True, 'excluded': [1, 2, 3]}

        # patch
        response = test_client.patch('/api/project/tabs/1/selected-items',
                                     json={"all": True, "excluded": [1, 2]})
        assert response.status_code == 201
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == {'all': True, 'excluded': [1, 2, 3]}

        # delete
        response = test_client.delete('/api/project/tabs/1/selected-items', json={"all": True, "excluded": [4, 5]})
        assert response.status_code == 204
        response = test_client.get('/api/project/tabs/1/selected-items')
        assert response.status_code == 200
        assert response.json == {'all': True, 'excluded': [1, 2, 3]}


class TestActions:

    def test_get_actions(self, test_client, captured_templates):
        # GET: check action list
        response = test_client.get('/api/project/actions')
        assert response.status_code == 200
        assert response.json == [
            {
                "dialog": {
                    "text": "You are going to delete selected tasks. Please, confirm your action.",
                    "type": "confirm"
                },
                "id": "delete_tasks",
                "order": 100,
                "permissions": "project.can_delete_tasks",
                "title": "Delete tasks"
            },
            {
                "dialog": {
                    "text": "You are going to delete all completions from selected tasks. Please, confirm your action.",
                    "type": "confirm"
                },
                "id": "delete_tasks_completions",
                "order": 101,
                "permissions": "project.can_manage_completions",
                "title": "Delete completions"
            }
        ]

    @staticmethod
    def action_tasks_delete(test_client, captured_templates, key):
        """ Remove tasks by ids
        """
        project = project_init_source()

        # POST: delete 3 tasks
        before_task_ids = set(project.source_storage.ids())
        data = {'all': key == 'excluded', key: [4, 5, 6]}
        response = test_client.post('/api/project/tabs/1/selected-items', json=data)
        assert response.status_code == 201

        response = test_client.post('/api/project/tabs/1/actions?id=delete_tasks')
        assert response.status_code == 200

        after_task_ids = set(project.source_storage.ids())
        return before_task_ids, after_task_ids, set(data[key])

    def test_action_tasks_delete_included(self, test_client, captured_templates):
        before, after, result = self.action_tasks_delete(test_client, captured_templates, 'included')
        assert before - result == after, 'Tasks after deletion are incorrect'

    def test_action_tasks_delete_excluded(self, test_client, captured_templates):
        before, after, result = self.action_tasks_delete(test_client, captured_templates, 'excluded')
        assert result == after, 'Tasks after deletion are incorrect'

    def test_action_tasks_completions_delete(self, test_client, captured_templates):
        """ Remove all completions for task ids
        """
        project = project_init_target()

        """# POST: delete 3 tasks
        before_ids = set(project.target_storage.ids())
        items = [4, 5, 6]
        response = test_client.post('/api/project/tabs/1/selected-items', json=items)
        assert response.status_code == 201
        response = test_client.post('/api/project/tabs/1/actions?id=delete_tasks_completions')
        assert response.status_code == 200
        after_ids = set(project.source_storage.ids())
        assert before_ids - set(items) == after_ids, 'Completions after deletion are incorrect'"""


class TestTasksAndAnnotations:
    """ Test tasks on tabs
    """

    def test_tasks(self, test_client, captured_templates):
        project = project_init_source()
        project.target_storage.remove_all()
        data = {
            'filters': {
                'conjunction': 'and',
                'items': [{
                    'filter': 'filters:tasks:id',
                    'operator': 'in',
                    'value': {'min': 2, 'max': 5},
                    'type': 'Number'
                },
                    {
                        'filter': 'filters:tasks:data.text',
                        'operator': 'contains',
                        'value': '123',
                        'type': 'String'
                    }]
            }
        }
        response = test_client.get('/api/tasks', json=data)
        assert response.status_code == 200
        assert response.json == {
            'tasks': [{'cancelled_completions': 0, 'completed_at': None, 'completions_results': '',
                       'data': {'image': '123', 'text': '1232'}, 'id': 2, 'total_completions': 0,
                       'total_predictions': 0, 'predictions_results': ''},
                      {'cancelled_completions': 0, 'completed_at': None, 'completions_results': '',
                       'data': {'image': '123', 'text': '1233'}, 'id': 3, 'total_completions': 0,
                       'total_predictions': 0, 'predictions_results': ''},
                      {'cancelled_completions': 0, 'completed_at': None, 'completions_results': '',
                       'data': {'image': '123', 'text': '1234'}, 'id': 4, 'total_completions': 0,
                       'total_predictions': 0, 'predictions_results': ''},
                      {'cancelled_completions': 0, 'completed_at': None, 'completions_results': '',
                       'data': {'image': '123', 'text': '1235'}, 'id': 5, 'total_completions': 0,
                       'total_predictions': 0, 'predictions_results': ''}], 'total': 4, 'total_completions': 0, 'total_predictions': 0}

    def test_annotations(self, test_client, captured_templates):
        response = test_client.get('/api/project/tabs/1/annotations')
        assert response.status_code == 200
