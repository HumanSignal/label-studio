from collections import Counter
from itertools import permutations

import pytest
from projects.functions.utils import recalculate_created_annotations_and_labels_from_scratch
from projects.tests.factories import ProjectFactory
from tasks.models import Task
from tasks.tests.factories import TaskFactory


def _expected_columns(data):
    common = set(data[0])
    for row in data[1:]:
        common.intersection_update(row)
    return sorted(common), dict(Counter(key for row in data for key in row))


@pytest.mark.django_db
@pytest.mark.parametrize('order', list(permutations(range(3))))
def test_batch_common_columns_do_not_reappear_after_an_empty_intersection(order):
    project = ProjectFactory()
    data = [{'a': 1}, {'b': 2}, {'a': 3, 'b': 4}]
    data = [data[index] for index in order]
    tasks = Task.objects.bulk_create([Task(project=project, data=row) for row in data])
    project.summary.update_data_columns(tasks)
    project.summary.refresh_from_db()

    common, counts = _expected_columns(data)
    assert project.summary.common_data_columns == common == []
    assert project.summary.all_data_columns == counts == {'a': 2, 'b': 2}


@pytest.mark.django_db
@pytest.mark.parametrize('batch_sizes', [(3,), (1, 2), (2, 1), (1, 1, 1)])
@pytest.mark.parametrize('data', [[{'a': 1}, {'b': 2}, {'b': 3}], [{}, {'a': 1}, {'a': 2}]])
def test_import_batch_boundaries_preserve_the_common_columns(data, batch_sizes):
    project = ProjectFactory()
    start = 0
    for size in batch_sizes:
        rows = data[start : start + size]
        Task.objects.bulk_create([Task(project=project, data=row) for row in rows])
        # Import API supplies serialized data dictionaries rather than model objects.
        project.summary.update_data_columns([{'data': row} for row in rows])
        start += size
    project.summary.refresh_from_db()

    common, counts = _expected_columns(data)
    assert project.summary.common_data_columns == common == []
    assert project.summary.all_data_columns == counts


@pytest.mark.django_db
def test_empty_batch_preserves_populated_summary():
    project = ProjectFactory()
    TaskFactory(project=project, data={'text': 'hello', 'id': 1})
    project.summary.refresh_from_db()
    before = (project.summary.common_data_columns, project.summary.all_data_columns)
    project.summary.update_data_columns(iter(()))
    project.summary.refresh_from_db()
    assert (project.summary.common_data_columns, project.summary.all_data_columns) == before


@pytest.mark.django_db
def test_native_task_signals_keep_an_empty_intersection_empty():
    project = ProjectFactory()
    data = [{'a': 1}, {'b': 2}, {'b': 3}]
    for row in data:
        TaskFactory(project=project, data=row)
    project.summary.refresh_from_db()
    common, counts = _expected_columns(data)
    assert project.summary.common_data_columns == common
    assert project.summary.all_data_columns == counts


@pytest.mark.django_db
def test_summary_recalculation_matches_the_complete_dataset():
    project = ProjectFactory()
    data = [{'text': 'a', 'left': 1}, {'text': 'b'}, {'text': 'c', 'right': 2}]
    Task.objects.bulk_create([Task(project=project, data=row) for row in data])
    recalculate_created_annotations_and_labels_from_scratch(project, project.summary, project.organization_id)
    project.summary.refresh_from_db()
    common, counts = _expected_columns(data)
    assert project.summary.common_data_columns == common == ['text']
    assert project.summary.all_data_columns == counts


@pytest.mark.django_db
def test_nonempty_common_columns_survive_multiple_import_batches():
    project = ProjectFactory()
    data = [{'text': 'a', 'extra': 1}, {'text': 'b'}, {'text': 'c', 'other': 2}]
    for row in data:
        Task.objects.bulk_create([Task(project=project, data=row)])
        project.summary.update_data_columns([row])
    project.summary.refresh_from_db()
    common, counts = _expected_columns(data)
    assert project.summary.common_data_columns == common == ['text']
    assert project.summary.all_data_columns == counts


@pytest.mark.django_db
def test_empty_project_recalculation_persists_cleared_columns():
    project = ProjectFactory()
    summary = project.summary
    summary.all_data_columns = {'old': 3}
    summary.common_data_columns = ['old']
    summary.save()
    assert not project.tasks.exists()
    recalculate_created_annotations_and_labels_from_scratch(project, summary, project.organization_id)
    summary.refresh_from_db()
    assert summary.all_data_columns == {}
    assert summary.common_data_columns == []
