from pathlib import Path

import pytest
from io_storages.localfiles.models import LocalFilesExportStorage, LocalFilesExportStorageLink
from projects.tests.factories import ProjectFactory
from tasks.tests.factories import AnnotationFactory, TaskFactory


@pytest.mark.django_db
def test_annotation_delete_removes_local_file_when_allowed(settings, tmp_path):
    """Ensure annotation deletion removes local export artifacts when permitted.

    Steps validated:
    - Configure LOCAL_FILES_DOCUMENT_ROOT and create an export directory inside it
    - Create a project, task, annotation, and LocalFiles export storage with deletions enabled
    - Persist the annotation to storage to materialize the exported JSON file
    - Delete the annotation, triggering the new pre_delete hook
    - Verify the exported file and its link are removed so disk usage stays in sync
    """

    document_root = tmp_path / 'local-root'
    document_root.mkdir()
    export_dir = document_root / 'exports'
    export_dir.mkdir()

    settings.LOCAL_FILES_DOCUMENT_ROOT = str(document_root)
    settings.LOCAL_FILES_SERVING_ENABLED = True

    project = ProjectFactory()
    storage = LocalFilesExportStorage.objects.create(
        project=project,
        path=str(export_dir),
        can_delete_objects=True,
    )

    task = TaskFactory(project=project)
    annotation = AnnotationFactory(task=task, project=project)

    storage.save_annotation(annotation)

    key = LocalFilesExportStorageLink.get_key(annotation)
    exported_file = Path(storage.path) / key
    assert exported_file.exists()

    annotation.delete()

    assert not exported_file.exists()
    assert not LocalFilesExportStorageLink.objects.filter(storage=storage).exists()


@pytest.mark.django_db
def test_annotation_delete_respects_can_delete_flag(settings, tmp_path):
    """Ensure can_delete_objects=False leaves exported files intact.

    Steps validated:
    - Configure a document root and export directory
    - Create LocalFiles export storage with deletions disabled
    - Save an annotation to disk and confirm the export file exists
    - Delete the annotation and trigger the signal
    - Confirm the export file remains because deletions are disabled
    """

    document_root = tmp_path / 'local-root'
    document_root.mkdir()
    export_dir = document_root / 'exports'
    export_dir.mkdir()

    settings.LOCAL_FILES_DOCUMENT_ROOT = str(document_root)
    settings.LOCAL_FILES_SERVING_ENABLED = True

    project = ProjectFactory()
    storage = LocalFilesExportStorage.objects.create(
        project=project,
        path=str(export_dir),
        can_delete_objects=False,
    )

    task = TaskFactory(project=project)
    annotation = AnnotationFactory(task=task, project=project)
    storage.save_annotation(annotation)

    key = LocalFilesExportStorageLink.get_key(annotation)
    exported_file = Path(storage.path) / key
    assert exported_file.exists()

    annotation.delete()

    assert exported_file.exists()
    # Link still cascades with the annotation deletion, but the disk artifact must remain.
    assert not LocalFilesExportStorageLink.objects.filter(storage=storage).exists()
