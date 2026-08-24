"""Tests for FIT-1962: storage sync accepts exported annotation unique_id.

Manual import ignores ``unique_id`` from export JSON and generates fresh UUIDs.
Storage sync used to pass ``unique_id`` through ``AnnotationSerializer``, causing
``AnnotationDuplicateError`` when the UUID already existed in the database.
"""

import uuid

import pytest
from io_storages.models import S3ImportStorage
from io_storages.s3.models import S3ImportStorageLink
from io_storages.utils import StorageObject
from organizations.models import OrganizationMember
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from tasks.models import Annotation
from tasks.tests.factories import AnnotationFactory, TaskFactory
from users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

EXPORTED_UNIQUE_ID = uuid.UUID('550e8400-e29b-41d4-a716-446655440000')
EXPORT_ANNOTATION_ID = 4242


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
        title='FIT-1962 storage sync test',
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


def _add_task_with_export_annotation(
    project, storage, *, unique_id=EXPORTED_UNIQUE_ID, export_id=EXPORT_ANNOTATION_ID
):
    task_data = {
        'data': {'text': 'storage sync sample'},
        'annotations': [
            {
                'id': export_id,
                'unique_id': str(unique_id),
                'completed_by': project.created_by_id,
                'result': [],
            }
        ],
    }
    params = StorageObject(key=f'sample-{unique_id}.json', task_data=task_data)
    return S3ImportStorage.add_task(project, 1, 1, storage, params, S3ImportStorageLink)


class TestStorageSyncExportedUniqueId:
    def test_export_unique_id_does_not_raise_duplicate(self, project, storage, member):
        """Cloud sync succeeds when export JSON reuses a UUID already in the DB."""
        source_task = TaskFactory(project=project)
        AnnotationFactory(
            task=source_task,
            project=project,
            completed_by=member,
            unique_id=EXPORTED_UNIQUE_ID,
        )

        task = _add_task_with_export_annotation(project, storage)

        synced = task.annotations.get()
        assert synced.unique_id != EXPORTED_UNIQUE_ID
        assert Annotation.objects.filter(unique_id=EXPORTED_UNIQUE_ID).count() == 1

    def test_export_id_mapped_to_import_id(self, project, storage):
        """Export annotation id is stored as import_id, matching manual import."""
        task = _add_task_with_export_annotation(project, storage)

        synced = task.annotations.get()
        assert synced.import_id == EXPORT_ANNOTATION_ID

    def test_export_id_mapped_when_import_id_null_in_export(self, project, storage):
        """Export JSON may include import_id: null; export id should still map."""
        task_data = {
            'data': {'text': 'storage sync sample'},
            'annotations': [
                {
                    'id': EXPORT_ANNOTATION_ID,
                    'import_id': None,
                    'unique_id': str(uuid.uuid4()),
                    'completed_by': project.created_by_id,
                    'result': [],
                }
            ],
        }
        params = StorageObject(key='sample-import-id-null.json', task_data=task_data)
        task = S3ImportStorage.add_task(project, 1, 1, storage, params, S3ImportStorageLink)

        synced = task.annotations.get()
        assert synced.import_id == EXPORT_ANNOTATION_ID
