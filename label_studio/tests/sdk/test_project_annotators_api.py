import pytest
from label_studio_sdk.client import LabelStudio
from tasks.models import Annotation

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db


def test_project_annotators_sdk(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

    # Create project via SDK
    proj = ls.projects.create(title='Annotators Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    # Import two tasks
    ls.projects.import_tasks(
        id=proj.id,
        request=[
            {'data': {'my_text': 't1'}},
            {'data': {'my_text': 't2'}},
        ],
    )

    # Get created tasks
    tasks = list(ls.tasks.list(project=proj.id))

    # Create two users via SDK
    u2 = ls.users.create(email='a2@example.com', username='annotator2', first_name='A', last_name='Two')
    u3 = ls.users.create(email='a3@example.com', username='annotator3', first_name='A', last_name='Three')

    # Add annotations directly (SDK doesn't expose annotation create easily with arbitrary user)
    # Use ORM for completed_by set to the two users
    Annotation.objects.create(
        task_id=tasks[0].id, project_id=proj.id, completed_by_id=business_client.user.id, result=[{'r': 1}]
    )
    Annotation.objects.create(task_id=tasks[1].id, project_id=proj.id, completed_by_id=u2.id, result=[{'r': 2}])

    # Call annotators API via SDK wrapper
    resp = list(ls.projects.list_unique_annotators(id=proj.id))

    returned_ids = [u.id for u in resp]
    assert sorted(returned_ids) == sorted([business_client.user.id, u2.id])
    assert returned_ids == sorted(returned_ids)
    assert u3.id not in returned_ids  # no annotations created for this user
