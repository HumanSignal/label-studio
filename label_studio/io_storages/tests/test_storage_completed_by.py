"""Tests for BROS-1092: storage sync re-attributes unknown completed_by.

Storage sync used to feed annotations straight into ``AnnotationSerializer``
which validates ``completed_by`` against ``User.objects.all()``. Two failure
modes existed:

- ``completed_by = <unknown int>`` -> ValidationError, annotation skipped.
- ``completed_by = <id of foreign-org user>`` -> silently kept the foreign id.
- ``completed_by = {"email": ...}`` -> ValidationError on dict.

Under FF on, ``ImportStorage.add_task`` now resolves ``completed_by`` against
the project organization first and falls back to ``project.created_by`` (or
``organization.created_by``) for anything that doesn't belong.
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
def foreign_user():
    foreign_org = OrganizationFactory()
    return foreign_org.created_by


@pytest.fixture
def project(project_creator, organization):
    return ProjectFactory(
        title='BROS-1092 storage sync test',
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


def _add_task_with_completed_by(project, storage, completed_by):
    """Run a single ``add_task`` call carrying one annotation with the given completed_by."""
    task_data = {
        'data': {'text': 'storage sync sample'},
        'annotations': [{'completed_by': completed_by, 'result': []}],
    }
    params = StorageObject(key=f'sample-{id(completed_by)}.json', task_data=task_data)
    return S3ImportStorage.add_task(project, 1, 1, storage, params, S3ImportStorageLink)


class TestStorageSyncFFOn:
    """FF on: re-attribute unknown completed_by to project.created_by."""

    def test_unknown_int_attributes_to_project_creator(self, project, storage):
        """An int id outside the org becomes project.created_by."""
        task = _add_task_with_completed_by(project, storage, completed_by=99999)
        annotation = task.annotations.get()
        assert annotation.completed_by_id == project.created_by_id

    def test_foreign_org_user_id_attributes_to_project_creator(self, project, storage, foreign_user):
        """User id from a different org must not silently leak in.

        Without the fix AnnotationSerializer kept ``foreign_user.id`` because the
        underlying PK field validates against ``User.objects.all()``.
        """
        task = _add_task_with_completed_by(project, storage, completed_by=foreign_user.id)
        annotation = task.annotations.get()
        assert annotation.completed_by_id == project.created_by_id
        assert annotation.completed_by_id != foreign_user.id

    def test_dict_unknown_email_attributes_to_project_creator(self, project, storage):
        """Dict-shaped completed_by with unknown email falls back to project.created_by."""
        task = _add_task_with_completed_by(project, storage, completed_by={'email': 'ghost@example.com'})
        annotation = task.annotations.get()
        assert annotation.completed_by_id == project.created_by_id

    def test_dict_export_shape_unknown_falls_back(self, project, storage):
        """Export-API-shaped dict with non-member id+email falls back."""
        task = _add_task_with_completed_by(project, storage, completed_by={'id': 99999, 'email': 'ghost@example.com'})
        annotation = task.annotations.get()
        assert annotation.completed_by_id == project.created_by_id

    def test_known_member_preserved(self, project, storage, member):
        """Known org-member id is kept verbatim — no false fallbacks."""
        task = _add_task_with_completed_by(project, storage, completed_by=member.id)
        annotation = task.annotations.get()
        assert annotation.completed_by_id == member.id


class TestStorageSyncFFOff:
    """FF off: storage sync keeps the legacy AnnotationSerializer behavior.

    Legacy semantics:
      - unknown id -> ValidationError (suppressed under
        ``ff_fix_back_dev_3342_storage_scan_with_invalid_annotations``,
        annotation just skipped);
      - foreign-org id -> silently kept (validates against ``User.objects.all()``);
      - dict -> ValidationError because PK field cannot parse a dict.

    We only assert the foreign-org silent-attribution and that a known member is
    preserved — these are the two stable legacy behaviors.
    """

    @staticmethod
    def _flag_set_off(name, *args, **kwargs):
        if name == 'fflag_fix_back_bros_1092_import_unknown_completed_by_short':
            return False
        return True

    def test_foreign_org_user_id_kept_silently_legacy(self, project, storage, foreign_user):
        """Legacy bug we explicitly fix: foreign-org id silently attributed."""
        with patch('io_storages.base_models.flag_set', side_effect=self._flag_set_off):
            task = _add_task_with_completed_by(project, storage, completed_by=foreign_user.id)
            annotation = task.annotations.get()
            assert annotation.completed_by_id == foreign_user.id

    def test_known_member_preserved_legacy(self, project, storage, member):
        """Legacy: known member's id is preserved (regression guard)."""
        with patch('io_storages.base_models.flag_set', side_effect=self._flag_set_off):
            task = _add_task_with_completed_by(project, storage, completed_by=member.id)
            annotation = task.annotations.get()
            assert annotation.completed_by_id == member.id


class TestStorageSyncMissingCreator:
    """Defensive case: project.created_by_id is NULL (FK is SET_NULL, nullable)."""

    def test_missing_creator_falls_back_to_org_owner(self, project, storage, organization):
        """If project.created_by is wiped, default falls back to organization.created_by."""
        # Detach project from its creator (mirrors what happens with on_delete=SET_NULL).
        project.created_by = None
        project.save(update_fields=['created_by'])

        task = _add_task_with_completed_by(project, storage, completed_by=99999)
        annotation = task.annotations.get()
        # OrganizationFactory sets the org owner; that's our second-tier fallback.
        assert annotation.completed_by_id == organization.created_by_id
