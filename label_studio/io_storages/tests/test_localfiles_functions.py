import os
import tempfile

import pytest
from io_storages.localfiles.functions import autodetect_local_files_root, normalize_storage_path


def test_autodetect_local_files_root_returns_first_candidate(tmp_path, monkeypatch):
    project_dir = tmp_path / 'project'
    project_dir.mkdir()
    target_dir = project_dir / 'mydata'
    target_dir.mkdir()
    (project_dir / 'label-studio-data').mkdir()

    monkeypatch.chdir(project_dir)

    detected = autodetect_local_files_root()

    assert detected == str(target_dir.resolve())


def test_autodetect_local_files_root_returns_none_when_missing(tmp_path):
    base_dir = tmp_path / 'project'
    base_dir.mkdir()

    detected = autodetect_local_files_root(base_dir=str(base_dir))

    assert detected is None


_TMP_DIR = tempfile.gettempdir()
_DATASET_DIR = os.path.join(_TMP_DIR, 'dataset')


@pytest.mark.parametrize(
    'raw, expected',
    [
        (None, None),
        ('', ''),
        (_DATASET_DIR, os.path.normpath(_DATASET_DIR)),
        (_DATASET_DIR + os.sep, os.path.normpath(_DATASET_DIR)),
        (f'  {_DATASET_DIR}{os.sep}  ', os.path.normpath(_DATASET_DIR)),
        (os.path.join(_TMP_DIR, 'dataset', ''), os.path.join(_TMP_DIR, 'dataset')),
        (_DATASET_DIR.replace(os.sep, '\\') + '\\', os.path.join(_TMP_DIR, 'dataset')),
    ],
)
def test_normalize_storage_path_basic_cases(raw, expected):
    assert normalize_storage_path(raw) == expected


def test_normalize_storage_path_windows_drive():
    raw = 'C:\\data\\set\\'
    expected = 'C:/data/set' if os.name != 'nt' else 'C:\\data\\set'
    assert normalize_storage_path(raw) == expected
