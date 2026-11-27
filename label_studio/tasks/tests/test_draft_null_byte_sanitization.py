"""FIT-2353: AnnotationDraft.result must not persist NUL (U+0000) bytes.

PDFs with an embedded OCR/text layer can leak a NUL character into
``value.ocrtext``. Postgres JSONB cannot store ``\\u0000`` even though it is a
valid JSON escape, so saving such a draft raised ``DataError`` and 500'd the
request. The draft write path now strips NUL bytes before persisting.

LSO tests run on SQLite, which tolerates NUL bytes, so these tests assert the
sanitization behaviour (no NUL survives the write) rather than relying on the DB
to reject it.
"""

import json

import pytest
from tasks.models import AnnotationDraft
from tasks.tests.factories import AnnotationDraftFactory, TaskFactory


def _has_nul(value) -> bool:
    # json.dumps escapes a literal NUL character to the 6-char sequence \u0000,
    # so detect that escaped form in the serialized payload.
    return '\\u0000' in json.dumps(value)


@pytest.mark.django_db
def test_draft_save_strips_nul_from_result():
    """AnnotationDraft.objects.create(...) (which calls save()) strips NUL bytes."""
    result = [
        {
            'id': 'ocr-1',
            'from_name': 'transcription',
            'to_name': 'pdf',
            'type': 'textarea',
            'value': {'text': ['DATE 04MAR25\x00 TIME 0927']},
        }
    ]
    assert _has_nul(result)

    draft = AnnotationDraft.objects.create(task=TaskFactory(), user=TaskFactory().project.created_by, result=result)

    draft.refresh_from_db()
    assert not _has_nul(draft.result)
    # The surrounding text is preserved; only the NUL byte is dropped.
    assert draft.result[0]['value']['text'] == ['DATE 04MAR25 TIME 0927']


@pytest.mark.django_db
def test_draft_save_preserves_clean_result():
    """A clean result is stored unchanged."""
    draft = AnnotationDraftFactory()
    draft.refresh_from_db()
    assert draft.result == [
        {
            'value': {'choices': ['neg']},
            'id': 'wMmVN7k_47',
            'from_name': 'sentiment',
            'to_name': 'text',
            'type': 'choices',
        }
    ]


@pytest.mark.django_db
def test_draft_update_strips_nul_from_result():
    """Updating an existing draft with a NUL-laden result also sanitizes on save()."""
    draft = AnnotationDraftFactory()
    draft.result = [{'id': 'r1', 'value': {'text': ['a\x00b']}}]
    draft.save()

    draft.refresh_from_db()
    assert not _has_nul(draft.result)
    assert draft.result[0]['value']['text'] == ['ab']
