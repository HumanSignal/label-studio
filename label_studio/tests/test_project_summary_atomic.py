"""Atomic project summary counter updates must only run on PostgreSQL.

The increment SQL uses jsonb_set and :: casts, which SQLite cannot parse
(OperationalError: unrecognized token: ":"), so on other backends the
counters must go through the original read-modify-write path directly.
"""

from unittest import mock

import pytest
from projects.models import ProjectSummary
from tests.conftest import project_choices
from tests.utils import make_project

pytestmark = pytest.mark.django_db

ANNOTATION = {
    'result': [{'from_name': 'animals', 'to_name': 'image', 'type': 'choices', 'value': {'choices': ['Cat']}}]
}
FLAG = 'fflag_fix_plt_1048_concurrent_project_summary_update_19032026_short'


def _flag_enabled(flag_name, *args, **kwargs):
    return flag_name == FLAG


def test_atomic_update_skipped_on_non_postgres(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    summary = project.summary

    with (
        mock.patch('projects.models.flag_set', side_effect=_flag_enabled),
        mock.patch('projects.models.connection') as connection_mock,
        mock.patch.object(ProjectSummary, '_atomic_update_created_annotations_and_labels') as atomic_annotations,
        mock.patch.object(ProjectSummary, '_atomic_update_created_labels_drafts') as atomic_drafts,
    ):
        connection_mock.vendor = 'sqlite'
        summary.update_created_annotations_and_labels([ANNOTATION])
        summary.update_created_labels_drafts([ANNOTATION])

    atomic_annotations.assert_not_called()
    atomic_drafts.assert_not_called()

    # fallback path still updates the counters
    summary.refresh_from_db()
    assert summary.created_annotations == {'animals|image|choices': 1}
    assert summary.created_labels == {'animals': {'Cat': 1}}
    assert summary.created_labels_drafts == {'animals': {'Cat': 1}}


def test_atomic_update_used_on_postgres(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    summary = project.summary

    with (
        mock.patch('projects.models.flag_set', side_effect=_flag_enabled),
        mock.patch('projects.models.connection') as connection_mock,
        mock.patch.object(ProjectSummary, '_atomic_update_created_annotations_and_labels') as atomic_annotations,
        mock.patch.object(ProjectSummary, '_atomic_update_created_labels_drafts') as atomic_drafts,
    ):
        connection_mock.vendor = 'postgresql'
        summary.update_created_annotations_and_labels([ANNOTATION])
        summary.update_created_labels_drafts([ANNOTATION])

    atomic_annotations.assert_called_once_with([ANNOTATION])
    atomic_drafts.assert_called_once_with([ANNOTATION])
