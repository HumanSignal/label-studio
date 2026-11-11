"""Tests for labels_manager/functions.py."""

from datetime import timedelta

import pytest
from django.utils import timezone
from labels_manager.functions import bulk_update_label
from projects.tests.factories import ProjectFactory
from tasks.models import Task
from tasks.tests.factories import AnnotationFactory, TaskFactory


def _choices(label):
    return [{'from_name': 'c', 'to_name': 'text', 'type': 'choices', 'value': {'choices': label}}]


@pytest.mark.django_db
def test_bulk_update_label_bumps_task_updated_at_only_for_rewritten_annotations():
    """FIT-3092: renaming a label rewrites exported results via bulk_update, so the task must enter the next window."""
    project = ProjectFactory()
    renamed = TaskFactory(project=project)
    untouched = TaskFactory(project=project)
    AnnotationFactory(task=renamed, project=project, completed_by=project.created_by, result=_choices('old'))
    AnnotationFactory(task=untouched, project=project, completed_by=project.created_by, result=_choices('other'))
    stale = timezone.now() - timedelta(days=3)
    Task.objects.filter(id__in=[renamed.id, untouched.id]).update(updated_at=stale)

    assert bulk_update_label('old', 'new', project.organization, project=project) == 1

    renamed.refresh_from_db()
    untouched.refresh_from_db()
    assert renamed.annotations.get().result[0]['value']['choices'] == 'new'
    assert renamed.updated_at > stale
    assert untouched.updated_at == stale
