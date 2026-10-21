"""
Utility helpers for LocalFiles storage operations.
"""

import os
import posixpath
from pathlib import Path
from typing import Callable, Iterable, Optional

from django.conf import settings
from django.core.exceptions import SuspiciousFileOperation
from django.utils._os import safe_join

AUTO_ROOT_CANDIDATES: tuple[str, ...] = ('mydata', 'label-studio-data')


def autodetect_local_files_root(
    base_dir: Optional[str] = None, candidates: Iterable[str] = AUTO_ROOT_CANDIDATES
) -> Optional[str]:
    """Return the first existing candidate directory relative to ``base_dir``."""
    search_root = Path(base_dir or os.getcwd())
    for candidate_name in candidates:
        candidate = (search_root / candidate_name).expanduser()
        if candidate.is_dir():
            return str(candidate.resolve())

    return None


def normalize_storage_path(raw_path: str | None) -> str | None:
    """Return a canonical representation for LocalFiles paths.

    We need consistent paths because permission checks compare the requested
    directory with storage.path prefixes. Users often enter trailing slashes or
    Windows separators; normalizing here prevents mismatches.
    """
    if raw_path is None:
        return None

    trimmed = raw_path.strip()
    if trimmed == '':
        return ''

    collapsed = trimmed.replace('\\', os.sep)
    normalized = os.path.normpath(collapsed)
    return normalized


def build_local_files_path(relative_path: str) -> str:
    """Map a ``/data/local-files/?d=`` value to a path under LOCAL_FILES_DOCUMENT_ROOT.

    Raises SuspiciousFileOperation when the value escapes the document root.
    """
    # Normalize the incoming relative path so we don't depend on trailing slashes
    normalized = posixpath.normpath(relative_path).lstrip('/')
    return safe_join(settings.LOCAL_FILES_DOCUMENT_ROOT, normalized)


def is_within_storage(directory: str, storage_path: str) -> bool:
    # SQL startswith is a plain string prefix: storage /data/ds would also match /data/ds-private
    root = storage_path.rstrip(os.sep)
    return directory == root or directory.startswith(root + os.sep)


def storage_directories_overlap(path_a: str, path_b: str) -> bool:
    """Return whether two local storage directories share a directory boundary.

    Responsibility: detect equal paths and a directory that contains the other
    after ``normalize_storage_path``.

    Boundary: a sibling whose name only shares a string prefix does not overlap.
    This does not read the filesystem or decide which user may save a storage.
    """
    left = normalize_storage_path(path_a)
    right = normalize_storage_path(path_b)
    if not left or not right:
        return False
    return is_within_storage(left, right) or is_within_storage(right, left)


def key_within_prefix(key: str, prefix: str) -> bool:
    """Return whether an object key stays inside a cloud storage prefix.

    Responsibility: decide if one object key is the prefix itself or a child of it.

    Boundary: an empty prefix, a key or prefix containing ``..``, an absolute
    key, or a key that leaves the prefix returns False. A sibling prefix such as
    ``project-a-private`` is not inside ``project-a``. This does not sign a URL
    or read the object.
    """
    if not isinstance(key, str) or not isinstance(prefix, str):
        return False
    if prefix.strip() == '' or key.strip() == '':
        return False
    key_text = key.replace('\\', '/')
    prefix_text = prefix.replace('\\', '/')
    if key_text.startswith('/') or prefix_text.startswith('/'):
        return False
    key_parts = [part for part in key_text.split('/') if part != '']
    prefix_parts = [part for part in prefix_text.split('/') if part != '']
    if not key_parts or not prefix_parts:
        return False
    if '..' in key_parts or '..' in prefix_parts:
        return False
    if len(key_parts) < len(prefix_parts):
        return False
    return key_parts[: len(prefix_parts)] == prefix_parts


def project_local_files_resolver(project) -> Callable[[str], Optional[str]]:
    """Build the SDK converter's Local Storage resolver for exports of ``project``.

    Uses the path rules of the /data/local-files/ view: nothing is readable while local files serving
    is off, otherwise only files under one of this project's Local Files storages.
    """
    # Imported lazily: this module is loaded by settings before the app registry is ready
    from io_storages.localfiles.models import LocalFilesImportStorage

    storage_paths = []
    if settings.LOCAL_FILES_SERVING_ENABLED:
        storage_paths = list(LocalFilesImportStorage.objects.filter(project=project).values_list('path', flat=True))

    def resolve(relative_path: str) -> Optional[str]:
        try:
            full_path = build_local_files_path(relative_path)
        except SuspiciousFileOperation:
            return None
        directory = os.path.normpath(os.path.dirname(full_path))
        if any(is_within_storage(directory, path) for path in storage_paths) and os.path.isfile(full_path):
            return full_path
        return None

    return resolve
