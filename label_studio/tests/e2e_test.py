# python
import os

# 3rd party
import pytest
import unittest

# label_studio
from label_studio import blueprint as server
from label_studio.tests.base import goc_project
from label_studio.tests.e2e_actions import (
    prepare,
    action_config, action_config_test,
    action_import, action_import_test,
    action_get_task,
    action_next_task,
    action_delete_task, action_delete_all_tasks,
    action_cancel_task,
    action_label, action_label_test,
    action_get_all_completions,
    action_get_change_completion,
    action_export, action_export_test,
)
from label_studio.tests.scenarios import scenarios


ACTIONS = {
    'prepare': prepare,
    'config': action_config,
    'import': action_import,
    'get_task': action_get_task,
    'next_task': action_next_task,
    'delete_task': action_delete_task,
    'delete_all_tasks': action_delete_all_tasks,
    'cancel_task': action_cancel_task,
    'label': action_label,
    'get_all_completions': action_get_all_completions,
    'change_completion': action_get_change_completion,
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
        from scenarios
    """

    test_case_config = scenarios

    @pytest.mark.parametrize('test_case_config', test_case_config, ids=idfn)
    def test_start(self, test_client, test_case_config):
        case = list(test_case_config.values())[0]
        for a, data in case:
            ACTIONS[a](test_client, data)
