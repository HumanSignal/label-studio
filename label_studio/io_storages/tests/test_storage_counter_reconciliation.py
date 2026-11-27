"""Storage sync must not leave stale task annotation counters.

``ImportStorage.add_task`` seeds ``Task.total_annotations`` /
``cancelled_annotations`` / ``total_predictions`` from the *payload* before the
annotations/predictions are persisted. Rows can be skipped when invalid (under
``ff_fix_back_dev_3342_storage_scan_with_invalid_annotations`` we log-and-skip
instead of raising), which previously left a task with ``total_annotations=1``
but zero annotation rows — a stale counter surfaced directly in the Data Manager
(per-task Annotations column and the tab totals). These tests pin the counter to
what actually persisted.
"""

from unittest.mock import patch

import pytest
from io_storages.models import S3ImportStorage
from io_storages.s3.models import S3ImportStorageLink
from io_storages.utils import StorageObject
from organizations.models import OrganizationMember
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def project_creator():
    return UserFactory()


@pytest.fixture
def organization(project_creator):
    org = OrganizationFactory(created_by=project_creator)
    project_creator.active_organization = org
    project_creator.save(update_fields=['active_organization'])
    return org


@pytest.fixture
def member(organization):
    user = UserFactory()
    OrganizationMember.objects.create(user=user, organization=organization)
    return user


@pytest.fixture
def project(project_creator, organization):
    return ProjectFactory(
        title='storage counter reconciliation test',
        organization=organization,
        created_by=project_creator,
        label_config='<View><Text name="text" value="$text"/></View>',
    )


@pytest.fixture
def storage(project):
    s = S3ImportStorage(
        project=project,
        bucket='example',
        aws_access_key_id='example',
        aws_secret_access_key='example',
        use_blob_urls=False,
    )
    s.save()
    return s


def _flag_set_off(name, *args, **kwargs):
    # BROS-1092 off -> unknown dict completed_by is NOT re-attributed, so the annotation
    # fails validation and is skipped. ff_fix_back_dev_3342 stays True -> skip, don't raise.
    if name == 'fflag_fix_back_bros_1092_import_unknown_completed_by_short':
        return False
    return True


def _add_task(project, storage, task_data, key='sample.json'):
    params = StorageObject(key=key, task_data=task_data)
    return S3ImportStorage.add_task(project, 1, 1, storage, params, S3ImportStorageLink)


def test_skipped_annotation_does_not_leave_stale_counter(project, storage):
    """A task whose only annotation is skipped must have total_annotations == 0."""
    task_data = {
        'data': {'text': 'sample'},
        'annotations': [{'completed_by': {'id': 99999, 'email': 'ghost@example.com'}, 'result': []}],
    }
    with patch('io_storages.base_models.flag_set', side_effect=_flag_set_off):
        task = _add_task(project, storage, task_data)

    task.refresh_from_db()
    assert task.annotations.count() == 0
    assert task.total_annotations == 0
    assert task.cancelled_annotations == 0
    assert task.is_labeled is False


def test_valid_annotation_counter_is_correct(project, storage, member):
    """Regression guard: a valid synced annotation still yields total_annotations == 1."""
    task_data = {
        'data': {'text': 'sample'},
        'annotations': [{'completed_by': member.id, 'result': []}],
    }
    task = _add_task(project, storage, task_data)

    task.refresh_from_db()
    assert task.annotations.count() == 1
    assert task.total_annotations == 1
    assert task.cancelled_annotations == 0


def test_task_without_annotations_has_zero_counter(project, storage):
    """Regression guard: a plain synced task (no annotations) stays at 0."""
    task = _add_task(project, storage, {'data': {'text': 'sample'}})

    task.refresh_from_db()
    assert task.annotations.count() == 0
    assert task.total_annotations == 0
