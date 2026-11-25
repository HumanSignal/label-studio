"""Utilities shared by the annotation-result write paths.

FIT-1669: Label Studio serializer validators and the `annotation_history`
snapshot helpers all need the same contract when a client sends a `result`
payload with colliding `(id, from_name, type)` keys: collapse them to the
first occurrence so duplicate-id rows never land in `Annotation.result` or
`AnnotationHistory.result`.
"""

from __future__ import annotations

import json
import re
from typing import Any


def sanitize_null_bytes(value: Any) -> Any:
    """Return ``value`` with NUL (``U+0000``) characters stripped.

    PostgreSQL ``jsonb``/``text`` columns cannot store U+0000, so a stray NUL
    byte copied from a PDF's OCR/text layer into an annotation result can
    raise ``django.db.utils.DataError``. Strip actual NUL characters while
    preserving literal backslash text such as ``\\u0000``. See FIT-2353
    (mirrors the ActivityLog fix in FIT-2145 and the ML-prediction sanitizer
    in ``lse_ml_models``).

    The value is only re-parsed when a NUL is actually present, so the common
    (clean) path pays a single ``json.dumps`` and returns the input unchanged.
    Non-serializable inputs are returned as-is so callers can use this
    defensively without masking upstream type errors.
    """
    if value is None:
        return value
    try:
        # JSON encoding escapes both actual NUL characters and backslashes.
        raw = json.dumps(value)
    except (TypeError, ValueError):
        return value
    if '\\u0000' not in raw:
        return value
    # Consume escaped backslashes in pairs before matching actual NUL escapes.
    sanitized = re.sub(r'(\\\\)|\\u0000', r'\1', raw)
    return value if sanitized == raw else json.loads(sanitized)


def dedupe_annotation_result_list(result: Any) -> Any:
    """Return `result` with entries sharing `(id, from_name, type)` collapsed.

    The first occurrence wins (matches the frontend's "last-write-wins on
    submit, first-wins on validate" intent: the serializer sees the payload
    in submission order, and collapsing to the first entry keeps the shape
    deterministic regardless of how many duplicates the client stacked).

    Entries without a usable `id` are passed through in order — taxonomy /
    rating controls that omit `id` are valid and must not be merged with
    each other just because they share `from_name`/`type`.

    Non-list inputs (None, dicts, strings) are returned unchanged so the
    function can be used defensively inside DRF `validate_<field>` methods
    without masking upstream type errors.
    """
    if not isinstance(result, list):
        return result

    seen: set[tuple[Any, Any, Any]] = set()
    deduped: list[Any] = []
    for entry in result:
        if not isinstance(entry, dict):
            deduped.append(entry)
            continue

        entry_id = entry.get('id')
        if entry_id is None:
            deduped.append(entry)
            continue

        key = (entry_id, entry.get('from_name'), entry.get('type'))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(entry)

    return deduped
