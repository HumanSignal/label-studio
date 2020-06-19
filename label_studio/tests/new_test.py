# python
import os

# 3rd party
import pytest
import unittest

# label_studio
from label_studio import server
from label_studio.tests.base import (
    test_client, captured_templates, goc_project,
)
from label_studio.tests.e2e_test import (
    prepare,
    action_config, action_config_test,
    action_import, action_import_test,
    action_get_all_tasks,
    action_get_task,
    action_label, action_label_test,
    action_export, action_export_test,
)

ACTIONS = {
    'prepare': prepare,
    'config': action_config,
    'import': action_import,
    'get_task': action_get_task,
    'label': action_label,
    'export': action_export
}


@pytest.fixture(autouse=True)
def default_project(monkeypatch):
    """
        apply patch for
        label_studio.server.project_get_or_create()
        for all tests.
    """
    monkeypatch.setattr(server, 'project_get_or_create', goc_project)


@pytest.fixture(scope='class')
def case_config():
    return {
        'actions':[
                'prepare',
                'config',
                'import',
                'get_task',
                'label',
                'export'
        ],
        'label_config': """\
            <View>
                <Text name="text" value="$text"/>
                <Choices name="sentiment" toName="text" choice="single">
                    <Choice value="Positive"/>
                    <Choice value="Negative"/>
                    <Choice value="Neutral"/>
                <Choice value="YYY"/>
                </Choices>
            </View>
            """,
        'source': 'local',
        'filepath': os.path.join(os.path.dirname(__file__), '../','static/samples/'),
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
        },
    }


class TestDefault:

    def test_start(self, test_client, case_config):
        # prepare
        prepare(test_client, case_config)
        # config
        action_config(test_client, case_config)
        action_config_test(test_client, case_config)
        # import
        action_import(test_client, case_config)
        action_import_test(test_client, case_config)
        # tasks
        action_get_all_tasks(test_client, case_config)
        action_get_task(test_client, case_config)
        # label
        action_label(test_client, case_config)
        action_label_test(test_client, case_config)
        # export
        action_export(test_client, case_config)



class TestCaseOne:

    def test_start(self, test_client, case_config):
        actions = case_config['actions']
        for a in actions:
            ACTIONS[a](test_client, case_config)



