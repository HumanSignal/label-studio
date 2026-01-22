"""
Utility helpers for LocalFiles storage operations.
"""
import os
from pathlib import Path
from typing import Iterable, Optional

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
