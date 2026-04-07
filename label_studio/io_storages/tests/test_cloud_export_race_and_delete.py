from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from django.db.utils import IntegrityError
from io_storages.azure_blob.models import (
    AzureBlobExportStorage,
    AzureBlobExportStorageLink,
    async_export_annotation_to_azure_storages,
    delete_annotation_from_azure_storages,
)
from io_storages.gcs.models import (
    GCSExportStorage,
    GCSExportStorageLink,
    async_export_annotation_to_gcs_storages,
    delete_annotation_from_gcs_storages,
)
from projects.tests.factories import ProjectFactory
from tasks.models import Annotation
from tasks.tests.factories import AnnotationFactory, TaskFactory

pytestmark = pytest.mark.django_db


def test_create_or_skip_missing_annotation_skips_deleted_annotation():
    project = ProjectFactory()
    task = TaskFactory(project=project)
    annotation = AnnotationFactory(project=project, task=task)

    with patch.object(GCSExportStorageLink, 'create', side_effect=IntegrityError('fk violation')):
        with patch('io_storages.base_models.Annotation.objects.filter') as mock_filter:
            mock_filter.return_value.exists.return_value = False
            result = GCSExportStorageLink.create_or_skip_missing_annotation(annotation, SimpleNamespace(pk=101))

    assert result is None


def test_create_or_skip_missing_annotation_reraises_for_existing_annotation():
    project = ProjectFactory()
    task = TaskFactory(project=project)
    annotation = AnnotationFactory(project=project, task=task)

    with patch.object(GCSExportStorageLink, 'create', side_effect=IntegrityError('fk violation')):
        with pytest.raises(IntegrityError):
            GCSExportStorageLink.create_or_skip_missing_annotation(annotation, SimpleNamespace(pk=102))


@patch('io_storages.gcs.models.GCSExportStorage.get_bucket')
@patch('io_storages.gcs.models.GCSExportStorageLink.create_or_skip_missing_annotation')
def test_gcs_export_uses_race_safe_link_create(mock_create_link, mock_get_bucket):
    mock_bucket = MagicMock()
    mock_get_bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = MagicMock()

    project = ProjectFactory()
    task = TaskFactory(project=project)
    annotation = AnnotationFactory(project=project, task=task)
    storage = GCSExportStorage.objects.create(project=project, bucket='bucket')

    storage.save_annotation(annotation)

    mock_create_link.assert_called_once_with(annotation, storage)


@patch('io_storages.azure_blob.models.AzureBlobExportStorage.get_container')
@patch('io_storages.azure_blob.models.AzureBlobExportStorageLink.create_or_skip_missing_annotation')
def test_azure_export_uses_race_safe_link_create(mock_create_link, mock_get_container):
    mock_container = MagicMock()
    mock_get_container.return_value = mock_container
    mock_container.get_blob_client.return_value = MagicMock()

    project = ProjectFactory()
    task = TaskFactory(project=project)
    annotation = AnnotationFactory(project=project, task=task)
    storage = AzureBlobExportStorage.objects.create(
        project=project,
        account_name='acc',
        account_key='key',
        container='c',
    )

    storage.save_annotation(annotation)

    mock_create_link.assert_called_once_with(annotation, storage)


@patch('io_storages.gcs.models.GCSExportStorage.delete_annotation')
def test_gcs_pre_delete_signal_calls_delete_when_enabled(mock_delete):
    project = ProjectFactory()
    task = TaskFactory(project=project)
    annotation = AnnotationFactory(project=project, task=task)
    storage = GCSExportStorage.objects.create(project=project, bucket='bucket', can_delete_objects=True)
    GCSExportStorageLink.objects.create(storage=storage, annotation=annotation)

    delete_annotation_from_gcs_storages(sender=Annotation, instance=annotation)

    mock_delete.assert_called_once_with(annotation)


@patch('io_storages.gcs.models.GCSExportStorage.delete_annotation')
def test_gcs_pre_delete_signal_skips_when_disabled(mock_delete):
    project = ProjectFactory()
    task = TaskFactory(project=project)
    annotation = AnnotationFactory(project=project, task=task)
    storage = GCSExportStorage.objects.create(project=project, bucket='bucket', can_delete_objects=False)
    GCSExportStorageLink.objects.create(storage=storage, annotation=annotation)

    delete_annotation_from_gcs_storages(sender=Annotation, instance=annotation)

    mock_delete.assert_not_called()


@patch('io_storages.azure_blob.models.AzureBlobExportStorage.delete_annotation')
def test_azure_pre_delete_signal_calls_delete_when_enabled(mock_delete):
    project = ProjectFactory()
    task = TaskFactory(project=project)
    annotation = AnnotationFactory(project=project, task=task)
    storage = AzureBlobExportStorage.objects.create(
        project=project,
        account_name='acc',
        account_key='key',
        container='c',
        can_delete_objects=True,
    )
    AzureBlobExportStorageLink.objects.create(storage=storage, annotation=annotation)

    delete_annotation_from_azure_storages(sender=Annotation, instance=annotation)

    mock_delete.assert_called_once_with(annotation)


@patch('io_storages.gcs.models.GCSExportStorage.save_annotation')
def test_async_gcs_export_skips_deleted_annotation(mock_save):
    project = ProjectFactory()
    task = TaskFactory(project=project)
    annotation = AnnotationFactory(project=project, task=task)
    annotation_id = annotation.id
    annotation.delete()

    async_export_annotation_to_gcs_storages(annotation_id)

    mock_save.assert_not_called()


@patch('io_storages.azure_blob.models.AzureBlobExportStorage.save_annotation')
def test_async_azure_export_skips_deleted_annotation(mock_save):
    project = ProjectFactory()
    task = TaskFactory(project=project)
    annotation = AnnotationFactory(project=project, task=task)
    annotation_id = annotation.id
    annotation.delete()

    async_export_annotation_to_azure_storages(annotation_id)

    mock_save.assert_not_called()
