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
from label_studio.tests.e2e_actions import (
    prepare,
    action_config, action_config_test,
    action_import, action_import_test,
    action_get_all_tasks,
    action_get_task,
    action_label, action_label_test,
    action_export, action_export_test,
)
from label_studio.tests.suits import Scenarios


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


def idfn(test_val):
    return list(test_val.keys())[0]


class TestCase:
    """
        Test case parametrised factory
        to run different scenarios
        from Scenarios class
    """

    test_case_config = [
        Scenarios.__getattribute__(Scenarios, x) for x in
        [attr for attr in dir(Scenarios) if not attr.startswith('__')]
    ]

    @pytest.mark.parametrize('test_case_config', test_case_config, ids=idfn)
    def test_start(self, test_client, test_case_config):
        case = list(test_case_config.values())[0]
        actions = case['actions']
        for a in actions:
            ACTIONS[a](test_client, case)
