"""FIT-1669 RED: unit tests for the annotation result dedupe helper.

The helper lives at `label_studio.tasks.result_utils.dedupe_annotation_result_list`
and collapses entries that share the full `(id, from_name, type)` key. It is used
by serializer validators (Annotation, AnnotationDraft, AnnotationReview) and by
`annotation_history` persistence to keep duplicate-id result rows out of storage.

These tests are expected to FAIL on baseline because the module does not exist
yet - that is the initial RED.
"""

# Import fails on baseline (module not yet created). That is the first red.
import pytest
from tasks.result_utils import dedupe_annotation_result_list, sanitize_null_bytes

FIT_1669_DUPLICATE_RESULT = [
    {
        'id': 'region-A',
        'from_name': 'tax',
        'to_name': 'txt',
        'type': 'taxonomy',
        'value': {'taxonomy': [['A1_term_inexact', 'B2_diff_trads_var']]},
    },
    {
        'id': 'region-A',
        'from_name': 'tax',
        'to_name': 'txt',
        'type': 'taxonomy',
        'value': {'taxonomy': [['E1_explicitation', 'F3_err_collocation']]},
    },
    {
        'id': 'region-B',
        'from_name': 'tax',
        'to_name': 'txt',
        'type': 'taxonomy',
        'value': {'taxonomy': [['A1_term_inexact', 'B2_diff_trads_var']]},
    },
    {
        'id': 'region-C',
        'from_name': 'tax',
        'to_name': 'txt',
        'type': 'taxonomy',
        'value': {'taxonomy': [['Magnetisme']]},
    },
]


def test_dedupe_noop_when_all_unique():
    """Every (id, from_name, type) is unique — the list is returned as-is."""
    payload = [
        {'id': 'r1', 'from_name': 'label', 'to_name': 'text', 'type': 'labels', 'value': {'labels': ['A']}},
        {'id': 'r2', 'from_name': 'label', 'to_name': 'text', 'type': 'labels', 'value': {'labels': ['B']}},
    ]
    assert dedupe_annotation_result_list(payload) == payload


def test_dedupe_collapses_full_key_collision_keeping_first():
    """Two entries sharing (id, from_name, type) collapse to the first occurrence."""
    deduped = dedupe_annotation_result_list(FIT_1669_DUPLICATE_RESULT)

    assert len(deduped) == 3
    ids = [entry['id'] for entry in deduped]
    assert ids == ['region-A', 'region-B', 'region-C']
    # First occurrence wins — we keep the earlier taxonomy value, not the later one.
    assert deduped[0]['value']['taxonomy'] == [['A1_term_inexact', 'B2_diff_trads_var']]


def test_dedupe_preserves_distinct_from_name_on_same_id():
    """Two results sharing `id` but with different `from_name` must both be kept."""
    payload = [
        {'id': 'shared', 'from_name': 'tax', 'to_name': 'txt', 'type': 'taxonomy', 'value': {'taxonomy': [['A']]}},
        {'id': 'shared', 'from_name': 'rating', 'to_name': 'txt', 'type': 'rating', 'value': {'rating': 4}},
    ]
    assert dedupe_annotation_result_list(payload) == payload


def test_dedupe_returns_non_list_input_unchanged():
    """Non-list / None inputs are returned unchanged (validators call this defensively)."""
    assert dedupe_annotation_result_list(None) is None
    assert dedupe_annotation_result_list({'not': 'a list'}) == {'not': 'a list'}
    assert dedupe_annotation_result_list('') == ''


def test_dedupe_keeps_entries_without_an_id():
    """Entries without a usable id pass through in order and don't collide with each other."""
    payload = [
        {'from_name': 'label', 'to_name': 'text', 'type': 'labels', 'value': {'labels': ['A']}},
        {'from_name': 'label', 'to_name': 'text', 'type': 'labels', 'value': {'labels': ['B']}},
    ]
    assert dedupe_annotation_result_list(payload) == payload


# ---------------------------------------------------------------------------
# FIT-2353: NUL (U+0000) sanitization for JSONB result payloads
# ---------------------------------------------------------------------------


def test_sanitize_null_bytes_strips_literal_nul_from_nested_result():
    """A NUL char anywhere in a nested result structure is removed, shape preserved."""
    payload = [
        {
            'id': 'r1',
            'from_name': 'ocr',
            'to_name': 'image',
            'type': 'textarea',
            'value': {'text': ['page 1\x00 line 2', 'clean']},
        }
    ]
    cleaned = sanitize_null_bytes(payload)
    assert cleaned == [
        {
            'id': 'r1',
            'from_name': 'ocr',
            'to_name': 'image',
            'type': 'textarea',
            'value': {'text': ['page 1 line 2', 'clean']},
        }
    ]


def test_sanitize_null_bytes_strips_nul_from_dict_keys():
    """NUL characters embedded in dict keys are also removed."""
    assert sanitize_null_bytes({'a\x00b': 'c\x00d'}) == {'ab': 'cd'}


def test_sanitize_null_bytes_noop_when_clean():
    """Clean payloads are returned unchanged (and equal)."""
    payload = [{'id': 'r1', 'value': {'choices': ['neg']}}]
    assert sanitize_null_bytes(payload) == payload


@pytest.mark.parametrize('text', [r'\u0000', r'\u0000n', r'\u0000t', r'\u0000b', r'\u0000a'])
def test_sanitize_null_bytes_preserves_literal_escapes(text: str) -> None:
    """Literal backslash text is clean and must retain its value and identity."""
    payload = [{'id': 'r1', 'type': 'textarea', 'value': {'text': [text]}}]
    cleaned = sanitize_null_bytes(payload)
    assert cleaned[0]['value']['text'] == [text]
    assert cleaned is payload


@pytest.mark.parametrize('backslashes', [0, 1, 2, 3])
def test_sanitize_null_bytes_removes_nul_after_backslashes(backslashes: int) -> None:
    """Remove actual NUL characters without consuming neighboring backslashes."""
    prefix = '\\' * backslashes
    payload = {'text': 'before' + prefix + '\x00after'}
    assert sanitize_null_bytes(payload) == {'text': 'before' + prefix + 'after'}


def test_sanitize_null_bytes_preserves_escapes_in_mixed_keys_and_values() -> None:
    """Only actual NULs are removed from mixed literal and escaped content."""
    literal = r'JSON escape: \u0000n'
    other = 'quotes: "\n雪'
    payload = {r'key\u0000n' + '\x00': [literal, 'actual\x00NUL', other]}
    assert sanitize_null_bytes(payload) == {r'key\u0000n': [literal, 'actualNUL', other]}


def test_sanitize_null_bytes_passthrough_for_none_and_non_serializable():
    """None and non-JSON-serializable inputs are returned as-is without raising."""
    assert sanitize_null_bytes(None) is None

    class NotSerializable:
        pass

    obj = NotSerializable()
    assert sanitize_null_bytes(obj) is obj
