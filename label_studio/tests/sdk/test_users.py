import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db

from label_studio_sdk.client import LabelStudio


def test_add_user(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    test_member_email = 'test_member@example.com'
    u = ls.users.create(
        **{
            'email': test_member_email,
            'username': test_member_email,
            'first_name': 'Test',
            'last_name': 'Member',
        }
    )

    assert u.id in [u.id for u in ls.users.list()]
