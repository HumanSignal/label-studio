import os
import time
from io import StringIO

import pytest
from data_export.models import ConvertedFormat, Export
from django.core.files.base import ContentFile
from django.core.management import call_command
from projects.tests.factories import ProjectFactory

pytestmark = pytest.mark.django_db

OLD = time.time() - 48 * 3600


@pytest.fixture
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path / 'media')
    return tmp_path / 'media'


@pytest.fixture
def export_dir(settings, tmp_path):
    settings.EXPORT_DIR = str(tmp_path / 'export')
    os.makedirs(settings.EXPORT_DIR)
    return tmp_path / 'export'


def _write(path, mtime=OLD):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write('[]')
    os.utime(path, (mtime, mtime))
    return path


def _run(*args):
    out = StringIO()
    call_command('cleanup_orphaned_export_files', *args, stdout=out)
    return out.getvalue()


@pytest.fixture
def tracked_files(media_root):
    project = ProjectFactory()
    export = Export.objects.create(project=project, status=Export.Status.COMPLETED)
    export.file.save(f'{project.id}/snapshot.json', ContentFile(b'[]'))
    converted = ConvertedFormat.objects.create(project=project, export=export, export_type='CSV')
    converted.file.save(f'{project.id}/snapshot.csv', ContentFile(b'id\n'))
    for path in (export.file.path, converted.file.path):
        os.utime(path, (OLD, OLD))

    export_root = media_root / 'export'
    return {
        'referenced': [export.file.path, converted.file.path],
        'orphan_in_project': _write(str(export_root / str(project.id) / 'orphan.json')),
        'orphan_deleted_project': _write(str(export_root / '999999' / 'orphan.csv')),
        'orphan_recent': _write(str(export_root / str(project.id) / 'recent.json'), mtime=time.time()),
    }


def test_dry_run_reports_orphans_without_deleting(tracked_files):
    output = _run()

    assert 'orphan.json' in output
    assert 'orphan.csv' in output
    assert 'recent.json' not in output
    assert 'snapshot.json' not in output
    for path in [*tracked_files['referenced'], tracked_files['orphan_in_project'], tracked_files['orphan_recent']]:
        assert os.path.isfile(path)
    assert os.path.isfile(tracked_files['orphan_deleted_project'])


def test_delete_removes_only_old_unreferenced_files(tracked_files):
    _run('--delete')

    assert not os.path.exists(tracked_files['orphan_in_project'])
    assert not os.path.exists(tracked_files['orphan_deleted_project'])
    assert os.path.isfile(tracked_files['orphan_recent'])
    for path in tracked_files['referenced']:
        assert os.path.isfile(path)


def test_min_age_hours_zero_includes_recent_files(tracked_files):
    _run('--delete', '--min-age-hours', '0')

    assert not os.path.exists(tracked_files['orphan_recent'])
    for path in tracked_files['referenced']:
        assert os.path.isfile(path)


def test_legacy_sweeps_only_paired_files_in_export_dir(media_root, export_dir):
    name = 'project-1-at-2024-01-01-10-00-abcdef12'
    legacy_json = _write(str(export_dir / f'{name}.json'))
    legacy_info = _write(str(export_dir / f'{name}-info.json'))
    # A lone file has no -info.json sibling (e.g. a CLI `label-studio export` output) and must be kept
    lone = _write(str(export_dir / 'project-2-at-2024-01-01-10-00-12345678.json'))
    recent_name = 'project-3-at-2024-01-01-10-00-87654321'
    recent_json = _write(str(export_dir / f'{recent_name}.json'), mtime=time.time())
    recent_info = _write(str(export_dir / f'{recent_name}-info.json'), mtime=time.time())

    _run('--delete')  # legacy files are only touched with --legacy
    assert os.path.isfile(legacy_json) and os.path.isfile(legacy_info)

    _run('--delete', '--legacy')

    assert not os.path.exists(legacy_json)
    assert not os.path.exists(legacy_info)
    assert os.path.isfile(lone)
    assert os.path.isfile(recent_json) and os.path.isfile(recent_info)
