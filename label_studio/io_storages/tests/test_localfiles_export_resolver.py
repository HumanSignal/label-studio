"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for
copyright information and LICENSE for a copy of the license.
"""

import zipfile

import pytest
from data_export.models import DataExport
from io_storages.localfiles.functions import project_local_files_resolver
from io_storages.localfiles.models import LocalFilesImportStorage
from tests.utils import make_project

IMAGE_CONFIG = (
    '<View><Image name="image" value="$image"/>'
    '<RectangleLabels name="label" toName="image"><Label value="cat"/></RectangleLabels></View>'
)


@pytest.fixture
def document_root(settings, tmp_path):
    settings.LOCAL_FILES_SERVING_ENABLED = True
    settings.LOCAL_FILES_DOCUMENT_ROOT = str(tmp_path)
    (tmp_path / 'dataset').mkdir()
    (tmp_path / 'dataset' / 'cat.jpg').write_bytes(b'project image')
    # Sibling directory: a plain string prefix of the project's storage path
    (tmp_path / 'dataset-private').mkdir()
    (tmp_path / 'dataset-private' / 'secret.txt').write_bytes(b'other project')
    return tmp_path


def _task(task_id, image):
    return {
        'id': task_id,
        'data': {'image': image},
        'annotations': [
            {
                'id': task_id,
                'result': [
                    {
                        'id': f'r{task_id}',
                        'type': 'rectanglelabels',
                        'from_name': 'label',
                        'to_name': 'image',
                        'original_width': 100,
                        'original_height': 100,
                        'value': {'x': 1, 'y': 1, 'width': 5, 'height': 5, 'rotation': 0, 'rectanglelabels': ['cat']},
                    }
                ],
            }
        ],
    }


@pytest.mark.django_db
def test_resolver_returns_only_files_of_project_storages(business_client, document_root):
    project = make_project({}, business_client.user, use_ml_backend=False)
    other_project = make_project({}, business_client.user, use_ml_backend=False)
    LocalFilesImportStorage.objects.create(project=project, path=str(document_root / 'dataset'))
    LocalFilesImportStorage.objects.create(project=other_project, path=str(document_root / 'dataset-private'))

    resolve = project_local_files_resolver(project)

    assert resolve('dataset/cat.jpg') == str(document_root / 'dataset' / 'cat.jpg')
    # A leading slash is relative to the document root, as in the /data/local-files/ view
    assert resolve('/dataset/cat.jpg') == str(document_root / 'dataset' / 'cat.jpg')
    assert resolve('dataset-private/secret.txt') is None
    assert resolve('dataset/../dataset-private/secret.txt') is None
    assert resolve(str(document_root / 'dataset-private' / 'secret.txt')) is None
    assert resolve('../../etc/passwd') is None
    assert resolve('dataset/missing.jpg') is None


@pytest.mark.django_db
def test_resolver_returns_nothing_when_serving_is_disabled(business_client, document_root, settings):
    settings.LOCAL_FILES_SERVING_ENABLED = False
    project = make_project({}, business_client.user, use_ml_backend=False)
    LocalFilesImportStorage.objects.create(project=project, path=str(document_root / 'dataset'))

    assert project_local_files_resolver(project)('dataset/cat.jpg') is None


@pytest.mark.django_db
def test_export_with_images_copies_only_project_storage_files(business_client, document_root):
    project = make_project({'label_config': IMAGE_CONFIG}, business_client.user, use_ml_backend=False)
    LocalFilesImportStorage.objects.create(project=project, path=str(document_root / 'dataset'))
    tasks = [
        _task(1, '/data/local-files/?d=dataset/cat.jpg'),
        _task(2, '/data/local-files/?d=dataset-private/secret.txt'),
        _task(3, f'/data/local-files/?d={document_root / "dataset-private" / "secret.txt"}'),
        _task(4, '/data/local-files/?d=/proc/self/environ'),
    ]

    out, _, _ = DataExport.generate_export_file(project, tasks, 'COCO_WITH_IMAGES', False, {})

    with out, zipfile.ZipFile(out) as archive:
        files = [name for name in archive.namelist() if not name.endswith('/')]
        images = [archive.read(name) for name in files if name.startswith('images/')]
    assert images == [b'project image']
