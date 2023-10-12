import logging

import pytest

pytestmark = pytest.mark.django_db
from label_studio_sdk import Client
from tests.sdk.utils import sdk_logs


def test_upload_and_list_tasks_does_not_log_to_stderr(django_live_url, business_client, caplog):
    caplog.set_level(logging.ERROR)

    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])
    p.import_tasks(LABEL_CONFIG_AND_TASKS['tasks_for_import'])

    tasks = p.get_tasks()

    assert len(tasks) == 1
    assert len(tasks[0]['annotations']) == 1
    assert len(tasks[0]['predictions']) == 1
    assert not sdk_logs(caplog)


def test_get_empty_tasks_does_not_log_to_stderr(django_live_url, business_client, caplog):
    caplog.set_level(logging.ERROR)

    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    tasks = p.get_tasks()

    assert not tasks
    assert not sdk_logs(caplog)


# source: https://labelstud.io/guide/tasks.html#Basic-Label-Studio-JSON-format
LABEL_CONFIG_AND_TASKS = {
    'label_config': """
    <View>
    <Text name="message" value="$my_text"/>
    <Choices name="sentiment_class" toName="message">
        <Choice value="Positive"/>
        <Choice value="Neutral"/>
        <Choice value="Negative"/>
    </Choices>
    </View>
    """,
    'tasks_for_import': [
        {
            'data': {
                'my_text': 'Opossums are great',
                'ref_id': 456,
                'meta_info': {'timestamp': '2020-03-09 18:15:28.212882', 'location': 'North Pole'},
            },
            'annotations': [
                {
                    'result': [
                        {
                            'from_name': 'sentiment_class',
                            'to_name': 'message',
                            'type': 'choices',
                            'readonly': False,
                            'hidden': False,
                            'value': {'choices': ['Positive']},
                        }
                    ]
                }
            ],
            'predictions': [
                {
                    'result': [
                        {
                            'from_name': 'sentiment_class',
                            'to_name': 'message',
                            'type': 'choices',
                            'readonly': False,
                            'hidden': False,
                            'value': {'choices': ['Neutral']},
                        }
                    ],
                    'score': 0.95,
                }
            ],
        }
    ],
}
