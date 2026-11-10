"""Incremental-export watermark coverage for prediction bulk paths (FIT-3092)."""

import json
from datetime import timedelta
from unittest.mock import patch

import pytest
from data_manager.actions.basic import delete_tasks_predictions
from django.utils import timezone
from projects.models import Project
from tasks.models import Prediction, Task


@pytest.mark.django_db
def test_delete_tasks_predictions_bumps_task_updated_at(business_client):
    project = Project.objects.create(title='Delete predictions watermark', created_by=business_client.user)
    task = Task.objects.create(project=project, data={'text': 't'})
    Prediction.objects.create(task=task, project=project, result=[], model_version='v1')
    old = timezone.now() - timedelta(days=3)
    Task.objects.filter(pk=task.pk).update(updated_at=old)

    delete_tasks_predictions(project, Task.objects.filter(id=task.id))

    task.refresh_from_db()
    assert Prediction.objects.filter(task=task).count() == 0
    assert task.updated_at > old


@pytest.mark.django_db
@pytest.mark.parametrize('memory_efficient', [True, False])
def test_import_predictions_api_bumps_task_updated_at(business_client, memory_efficient):
    """POST /import/predictions bulk_creates (skipping Prediction.save()); both code paths must bump the task."""
    project = Project.objects.create(title='Import predictions watermark', created_by=business_client.user)
    task = Task.objects.create(project=project, data={'text': 't'})
    untouched = Task.objects.create(project=project, data={'text': 'u'})
    old = timezone.now() - timedelta(days=3)
    Task.objects.filter(pk__in=[task.pk, untouched.pk]).update(updated_at=old)

    with patch(
        'data_import.api.flag_set',
        side_effect=lambda name, *a, **kw: (
            memory_efficient
            if name == 'fflag_fix_back_4620_memory_efficient_predictions_import_08012025_short'
            else False
        ),
    ):
        response = business_client.post(
            f'/api/projects/{project.id}/import/predictions',
            data=json.dumps([{'task': task.id, 'result': [], 'model_version': 'imported'}]),
            content_type='application/json',
        )

    assert response.status_code == 201, response.content
    task.refresh_from_db()
    untouched.refresh_from_db()
    assert Prediction.objects.filter(task=task).count() == 1
    assert task.updated_at > old
    assert untouched.updated_at == old


@pytest.mark.django_db
def test_import_predictions_bumps_committed_batches_when_a_later_batch_fails(business_client, settings):
    """Memory-efficient import commits batch by batch; a later batch's 400 must not leave earlier ones unbumped."""
    settings.PREDICTION_IMPORT_BATCH_SIZE = 1
    project = Project.objects.create(title='Partial import watermark', created_by=business_client.user)
    task = Task.objects.create(project=project, data={'text': 't'})
    old = timezone.now() - timedelta(days=3)
    Task.objects.filter(pk=task.pk).update(updated_at=old)

    with patch(
        'data_import.api.flag_set',
        side_effect=lambda name, *a, **kw: (
            name == 'fflag_fix_back_4620_memory_efficient_predictions_import_08012025_short'
        ),
    ):
        response = business_client.post(
            f'/api/projects/{project.id}/import/predictions',
            data=json.dumps(
                [
                    {'task': task.id, 'result': [], 'model_version': 'imported'},
                    {'task': 999999999, 'result': [], 'model_version': 'imported'},
                ]
            ),
            content_type='application/json',
        )

    assert response.status_code == 400, response.content
    task.refresh_from_db()
    assert Prediction.objects.filter(task=task).count() == 1
    assert task.updated_at > old


@pytest.mark.django_db
def test_move_annotations_bumps_destination_task_updated_at(business_client):
    """remove_duplicates reassigns annotations via QuerySet.update; destination must bump."""
    from data_manager.actions.remove_duplicates import move_annotations

    project = Project.objects.create(title='Move annotations watermark', created_by=business_client.user)
    dest = Task.objects.create(project=project, data={'image': 'dup.jpg'}, total_annotations=1)
    src = Task.objects.create(project=project, data={'image': 'dup.jpg'}, total_annotations=1)
    from tasks.models import Annotation

    Annotation.objects.create(task=src, project=project, result=[], completed_by=business_client.user)
    Annotation.objects.create(task=dest, project=project, result=[], completed_by=business_client.user)
    old = timezone.now() - timedelta(days=4)
    Task.objects.filter(pk=dest.pk).update(updated_at=old)

    duplicates = {
        'dup.jpg': [
            {
                'id': dest.id,
                'total_annotations': 1,
                'cancelled_annotations': 0,
            },
            {
                'id': src.id,
                'total_annotations': 1,
                'cancelled_annotations': 0,
            },
        ]
    }
    move_annotations(duplicates)

    dest.refresh_from_db()
    assert Annotation.objects.filter(task=dest).count() == 2
    assert dest.updated_at > old
