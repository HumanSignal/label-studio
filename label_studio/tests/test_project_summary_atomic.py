"""Atomic project summary counter updates must only run on PostgreSQL.

The increment SQL uses jsonb_set and :: casts, which SQLite cannot parse
(OperationalError: unrecognized token: ":"), so on other backends the
counters must go through the original read-modify-write path directly.
"""

from unittest import mock

import pytest
from projects.models import ProjectSummary
from tasks.models import _task_data_is_not_updated
from tests.conftest import project_choices
from tests.utils import make_project

pytestmark = pytest.mark.django_db

ANNOTATION = {
    'result': [{'from_name': 'animals', 'to_name': 'image', 'type': 'choices', 'value': {'choices': ['Cat']}}]
}


def test_atomic_update_skipped_on_non_postgres(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    summary = project.summary

    with (
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
        mock.patch('projects.models.connection') as connection_mock,
        mock.patch.object(ProjectSummary, '_atomic_update_created_annotations_and_labels') as atomic_annotations,
        mock.patch.object(ProjectSummary, '_atomic_update_created_labels_drafts') as atomic_drafts,
    ):
        connection_mock.vendor = 'postgresql'
        summary.update_created_annotations_and_labels([ANNOTATION])
        summary.update_created_labels_drafts([ANNOTATION])

    atomic_annotations.assert_called_once_with([ANNOTATION])
    atomic_drafts.assert_called_once_with([ANNOTATION])


@pytest.mark.parametrize(
    'update_fields,expected_skip',
    [
        (None, False),  # full save always recomputes
        ([], False),
        (['data'], False),
        (['data', 'is_labeled'], False),
        (['is_labeled'], True),
        (['total_predictions'], True),
        (['is_labeled', 'total_annotations', 'cancelled_annotations'], True),
        (['updated_at', 'updated_by'], True),
        (['inner_id', 'total_predictions'], True),
    ],
)
def test_summary_recompute_only_for_data_writes(update_fields, expected_skip):
    assert bool(_task_data_is_not_updated(update_fields)) is expected_skip


def test_prediction_update_does_not_inflate_total_predictions(business_client):
    """post_save fires on updates too, so the counter must only move on create/delete."""
    from tasks.models import Prediction, Task

    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    task = Task.objects.create(project=project, data={'image': 'http://example.com/1.jpg'})

    prediction = Prediction.objects.create(
        task=task,
        project=project,
        result=[{'from_name': 'animals', 'to_name': 'image', 'type': 'choices', 'value': {'choices': ['Cat']}}],
        score=0.9,
        model_version='v1',
    )
    task.refresh_from_db()
    assert task.total_predictions == 1

    # Storage import seeds total_predictions then creates the rows; recount must not double.
    seeded = Task.objects.create(project=project, data={'image': 'http://example.com/2.jpg'}, total_predictions=1)
    Prediction.objects.create(task=seeded, project=project, result=[], score=0.1, model_version='v1')
    seeded.refresh_from_db()
    assert seeded.total_predictions == 1

    prediction.score = 0.95
    prediction.save(update_fields=['score'])
    task.refresh_from_db()
    assert task.total_predictions == 1

    prediction.delete()
    task.refresh_from_db()
    assert task.total_predictions == 0

    # a delete with the counter already at zero must not go negative
    extra = Prediction.objects.create(task=task, project=project, result=[], score=0.1, model_version='v1')
    Task.objects.filter(pk=task.pk).update(total_predictions=0)
    extra.delete()
    task.refresh_from_db()
    assert task.total_predictions == 0
