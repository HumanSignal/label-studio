"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for
copyright information and LICENSE for a copy of the license.
"""

import copy
import json
import tempfile
import zipfile
from pathlib import Path

import pytest
from data_export.models import DataExport
from tests.utils import make_project

IMAGE_CONFIG = (
    '<View><Image name="image" value="$image"/>'
    '<RectangleLabels name="label" toName="image"><Label value="cat"/></RectangleLabels></View>'
)


@pytest.fixture
def export_project(business_client):
    return make_project({'label_config': IMAGE_CONFIG}, business_client.user, use_ml_backend=False)


@pytest.fixture
def export_temp_dir(tmp_path, monkeypatch):
    # Configure the real tempfile factories used by both conversion and the returned file.
    monkeypatch.setattr(tempfile, 'tempdir', str(tmp_path))
    return tmp_path


def _tasks(count):
    return [
        {
            'id': index,
            'data': {'image': f'https://images.example.invalid/image{index}.png'},
            'annotations': [
                {
                    'id': index,
                    'result': [
                        {
                            'id': f'r{index}',
                            'type': 'rectanglelabels',
                            'from_name': 'label',
                            'to_name': 'image',
                            'original_width': 200,
                            'original_height': 100,
                            'value': {
                                'x': 10,
                                'y': 20,
                                'width': 30,
                                'height': 40,
                                'rotation': 0,
                                'rectanglelabels': ['cat'],
                            },
                        }
                    ],
                }
            ],
        }
        for index in range(count)
    ]


def _check_archive(output, output_format, count):
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None
        assert not any(Path(name).name.startswith('project-') for name in archive.namelist())
        if output_format == 'COCO':
            data = json.loads(archive.read('result.json'))
            assert len(data['images']) == count
            assert len(data['annotations']) == count
            assert [category['name'] for category in data['categories']] == ['cat']
            for annotation in data['annotations']:
                assert annotation['bbox'] == [20, 20, 60, 40]
        else:
            assert archive.read('classes.txt').decode().splitlines() == ['cat']
            labels = [name for name in archive.namelist() if name.startswith('labels/') and name.endswith('.txt')]
            assert len(labels) == count
            for name in labels:
                values = [float(value) for value in archive.read(name).decode().split()]
                assert values == pytest.approx([0, 0.25, 0.4, 0.3, 0.4])


@pytest.mark.django_db
@pytest.mark.parametrize('output_format', ['COCO', 'YOLO'])
@pytest.mark.parametrize('count', [0, 1, 3])
def test_export_archive_has_only_the_returned_temporary_file(export_project, export_temp_dir, output_format, count):
    tasks = _tasks(count)
    before = copy.deepcopy(tasks)

    output, content_type, filename = DataExport.generate_export_file(
        export_project, tasks, output_format, False, {}
    )

    with output:
        assert content_type == 'application/zip'
        assert filename.startswith(f'project-{export_project.id}-at-')
        assert filename.endswith('.zip')
        _check_archive(output, output_format, count)
        assert set(export_temp_dir.iterdir()) == {Path(output.name)}
    assert list(export_temp_dir.iterdir()) == []
    assert tasks == before


@pytest.mark.django_db
@pytest.mark.parametrize('output_format', ['COCO', 'YOLO'])
def test_repeated_exports_do_not_accumulate_archives(export_project, export_temp_dir, output_format):
    for count in range(5):
        output, _, _ = DataExport.generate_export_file(export_project, _tasks(count), output_format, False, {})
        with output:
            _check_archive(output, output_format, count)
        assert list(export_temp_dir.iterdir()) == []


@pytest.mark.django_db
def test_open_exports_have_independent_returned_file_lifetimes(export_project, export_temp_dir):
    first, _, _ = DataExport.generate_export_file(export_project, _tasks(1), 'COCO', False, {})
    with first:
        second, _, _ = DataExport.generate_export_file(export_project, _tasks(3), 'YOLO', False, {})
        with second:
            assert Path(first.name) != Path(second.name)
            _check_archive(first, 'COCO', 1)
            _check_archive(second, 'YOLO', 3)
            assert set(export_temp_dir.iterdir()) == {Path(first.name), Path(second.name)}
        assert set(export_temp_dir.iterdir()) == {Path(first.name)}
        _check_archive(first, 'COCO', 1)
    assert list(export_temp_dir.iterdir()) == []


@pytest.mark.django_db
@pytest.mark.parametrize('count', [0, 3])
def test_single_file_json_export_keeps_its_existing_cleanup(export_project, export_temp_dir, count):
    tasks = _tasks(count)
    output, _, filename = DataExport.generate_export_file(export_project, tasks, 'JSON', False, {})

    with output:
        assert filename.endswith('.json')
        assert json.load(output) == tasks
        assert set(export_temp_dir.iterdir()) == {Path(output.name)}
    assert list(export_temp_dir.iterdir()) == []
