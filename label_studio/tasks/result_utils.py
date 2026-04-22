"""Utilities shared by the annotation-result write paths.

FIT-1669: Label Studio serializer validators and the `annotation_history`
snapshot helpers all need the same contract when a client sends a `result`
payload with colliding `(id, from_name, type)` keys: collapse them to the
first occurrence so duplicate-id rows never land in `Annotation.result` or
`AnnotationHistory.result`.
"""

from __future__ import annotations

from typing import Any


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
