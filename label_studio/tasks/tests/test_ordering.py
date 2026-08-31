"""Tests for tasks.ordering parse helpers."""

import pytest
from django.test import RequestFactory
from tasks.ordering import (
    ANNOTATION_ORDERING_ID_ASC,
    ANNOTATION_ORDERING_ID_DESC,
    parse_annotations_ordering_request,
)


def _req(path):
    return RequestFactory().get(path)


@pytest.mark.parametrize(
    'query, expected',
    [
        ('/?annotations_ordering=-id', ANNOTATION_ORDERING_ID_DESC),
        ('/?annotations_ordering=-pk', ANNOTATION_ORDERING_ID_DESC),
        ('/?annotations_ordering=id', ANNOTATION_ORDERING_ID_ASC),
        ('/?annotations_ordering=pk', ANNOTATION_ORDERING_ID_ASC),
        ('/?annotations_ordering=-ID', ANNOTATION_ORDERING_ID_DESC),
        ('/?annotations_ordering=-id,-created_at', ANNOTATION_ORDERING_ID_DESC),
    ],
)
def test_parse_annotations_ordering_accepts_django_style(query, expected):
    assert parse_annotations_ordering_request(_req(query)) == expected


@pytest.mark.parametrize(
    'query',
    [
        '/',
        '/?annotations_ordering=',
        '/?annotations_ordering=created_at',
        '/?annotations_ordering=-created_at',
    ],
)
def test_parse_annotations_ordering_rejects_unknown(query):
    assert parse_annotations_ordering_request(_req(query)) is None


def test_parse_annotations_ordering_none_request():
    assert parse_annotations_ordering_request(None) is None
