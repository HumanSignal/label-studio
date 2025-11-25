"""Tests for LocalFiles helpers."""

import os

import pytest

from io_storages.localfiles.models import normalize_storage_path


@pytest.mark.parametrize(
    'raw, expected',
    [
        (None, None),
        ('', ''),
        ('/tmp/dataset', os.path.normpath('/tmp/dataset')),
        ('/tmp/dataset/', os.path.normpath('/tmp/dataset')),
        ('  /tmp/dataset/  ', os.path.normpath('/tmp/dataset')),
        (os.path.join('tmp', 'dataset', ''), os.path.join('tmp', 'dataset')),
        ('tmp\\dataset\\', os.path.join('tmp', 'dataset')),
    ],
)
def test_normalize_storage_path_basic_cases(raw, expected):
    assert normalize_storage_path(raw) == expected


def test_normalize_storage_path_windows_drive():
    raw = 'C:\\data\\set\\'
    expected = 'C:/data/set' if os.name != 'nt' else 'C:\\data\\set'
    assert normalize_storage_path(raw) == expected

