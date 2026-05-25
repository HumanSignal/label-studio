"""Tests for BROS-1092: async import path attributes unknown completed_by to importer.

Async import (LSE / non-Community) used to construct
``ImportApiSerializer(... context={'project': project})`` without ``user``,
falling back to ``project.created_by`` for any unknown annotator. The fix passes
``user`` (the importer) when the FF is enabled. These tests cover both the
streaming and non-streaming async paths.
"""

from unittest.mock import patch

import pytest
from data_import.functions import _async_import_background_streaming, async_import_background
from data_import.models import FileUpload
from django.core.files.base import ContentFile
from organizations.models import OrganizationMember
from organizations.tests.factories import OrganizationFactory
from projects.models import ProjectImport
from projects.tests.factories import ProjectFactory
from rest_framework.exceptions import ValidationError
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
def importer(organization):
    """A different org member who actually triggers the import."""
    user = UserFactory()
    OrganizationMember.objects.create(user=user, organization=organization)
    user.active_organization = organization
    user.save(update_fields=['active_organization'])
    return user


@pytest.fixture
def project(project_creator, organization):
    return ProjectFactory(
        title='BROS-1092 async import test',
        organization=organization,
        created_by=project_creator,
        label_config='<View><Text name="text" value="$text"/></View>',
    )


def _create_upload(user, project, body: bytes, name: str = 'tasks.json'):
    return FileUpload.objects.create(user=user, project=project, file=ContentFile(body, name=name))


# Snapshot with one annotation whose completed_by id does not exist in the receiving org.
UNKNOWN_COMPLETED_BY_TASKS = b'[{"data":{"text":"A"},"annotations":[{"completed_by": 99999, "result": []}]}]'


class TestAsyncImportBackgroundStreaming:
    """Streaming async import (FF ``fflag_fix_back_plt_902_*`` on by default).

    With FF on, unknown ``completed_by`` must be re-attributed to the importer
    (``user`` argument), not ``project.created_by``.
    """

    def test_unknown_completed_by_attributes_to_importer(self, importer, project):
        """Streaming path: importer ≠ project.created_by, unknown id should pick importer."""
        fu = _create_upload(importer, project, UNKNOWN_COMPLETED_BY_TASKS)

        pimport = ProjectImport.objects.create(project=project, file_upload_ids=[fu.id], commit_to_project=True)

        _async_import_background_streaming(pimport, importer)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.COMPLETED
        # Find the imported annotation and check attribution.
        from tasks.models import Annotation

        annotations = list(Annotation.objects.filter(project=project))
        assert len(annotations) == 1
        assert annotations[0].completed_by_id == importer.id
        assert annotations[0].completed_by_id != project.created_by_id


class TestAsyncImportBackgroundNonStreaming:
    """Legacy (non-streaming) async import path, gated by the OOM-fix FF.

    The OOM-fix FF (``fflag_fix_back_plt_902_*``) is mocked off so we exercise
    the legacy branch and confirm the BROS-1092 fix passes ``user`` there too.
    """

    @patch('data_import.functions.flag_set')
    def test_unknown_completed_by_attributes_to_importer(self, mock_flag_set, importer, project):
        # Disable OOM streaming FF; keep BROS-1092 FF enabled.
        def fake_flag_set(name, *args, **kwargs):
            if name == 'fflag_fix_back_plt_902_async_import_background_oom_fix_22092025_short':
                return False
            return True

        mock_flag_set.side_effect = fake_flag_set

        fu = _create_upload(importer, project, UNKNOWN_COMPLETED_BY_TASKS)
        pimport = ProjectImport.objects.create(project=project, file_upload_ids=[fu.id], commit_to_project=True)

        async_import_background(pimport.id, importer.id)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.COMPLETED

        from tasks.models import Annotation

        annotations = list(Annotation.objects.filter(project=project))
        assert len(annotations) == 1
        assert annotations[0].completed_by_id == importer.id
        assert annotations[0].completed_by_id != project.created_by_id


class TestAsyncImportFFOff:
    """With BROS-1092 FF disabled, async import retains its old strict behavior.

    The legacy ``_insert_valid_completed_by`` raises ``ValidationError`` for
    unknown ids; ``_async_import_background_streaming`` catches it, marks the
    ``ProjectImport`` as ``FAILED``, and re-raises.
    """

    @patch('tasks.serializers.flag_set')
    @patch('data_import.functions.flag_set')
    def test_streaming_keeps_legacy_validation(self, mock_functions_flag, mock_serializers_flag, importer, project):
        """FF off in both namespaces -> legacy ValidationError, FAILED status."""

        # Both namespaces consult the same FF; only ours is forced off.
        def fake_flag_set(name, *args, **kwargs):
            if name == 'fflag_fix_back_bros_1092_import_unknown_completed_by_short':
                return False
            return True

        mock_functions_flag.side_effect = fake_flag_set
        mock_serializers_flag.side_effect = fake_flag_set

        fu = _create_upload(importer, project, UNKNOWN_COMPLETED_BY_TASKS)
        pimport = ProjectImport.objects.create(project=project, file_upload_ids=[fu.id], commit_to_project=True)

        with pytest.raises(ValidationError):
            _async_import_background_streaming(pimport, importer)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.FAILED
