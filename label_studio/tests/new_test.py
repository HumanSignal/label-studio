# python

# 3rd party
import pytest
import unittest

# label_studio
from label_studio import server
from label_studio.tests.base import (
    test_client, captured_templates, new_project,
)
from label_studio.tests.e2e_test import (
    test_config, test_text_import, test_label, test_export,
)


@pytest.fixture(autouse=True)
def default_project(monkeypatch):
    """
        apply patch for
        label_studio.server.project_get_or_create()
        for all tests.
    """
    monkeypatch.setattr(server, 'project_get_or_create', new_project)


@pytest.fixture(scope='class')
def test_case_config():
    return {
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
        'text_filename': 'lorem_ipsum.txt',
        'label_data' : {
            "lead_time":474.108,
            "result": [{
                    "id":"_qRv9kaetd",
                    "from_name":"sentiment",
                    "to_name":"text",
                    "type":"choices",
                    "value":{"choices":["Neutral"]}
                }]
            }
        }


class MyTest:

    def start(self):
        print('\n'+ '> '*40 +'\n')

        test_config(test_client, test_case_config)
        test_text_import(test_client, test_case_config)
        test_label(test_client, test_case_config)
        test_export(test_client)

