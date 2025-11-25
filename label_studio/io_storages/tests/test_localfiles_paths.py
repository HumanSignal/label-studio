"""Tests for LocalFiles helpers."""

import os
import tempfile

import pytest
from io_storages.localfiles.models import normalize_storage_path


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
