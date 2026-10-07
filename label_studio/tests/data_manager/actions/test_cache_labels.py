"""Tests for the cache_labels action."""

import pytest
from data_manager.actions.cache_labels import cache_labels_job, extract_labels
from django.contrib.auth import get_user_model
from projects.models import Project
from tasks.models import Annotation, Prediction, Task


@pytest.mark.django_db
@pytest.mark.parametrize(
    'source, control_tag, with_counters, expected_cache_column, use_predictions',
    [
        # Test case 1: Annotations, control tag 'ALL', with counters
        ('annotations', 'ALL', 'Yes', 'cache_all', False),
        # Test case 2: Annotations, specific control tag, with counters
        ('annotations', 'label', 'Yes', 'cache_label', False),
        # Test case 3: Annotations, control tag 'ALL', without counters
        ('annotations', 'ALL', 'No', 'cache_all', False),
        # Test case 4: Predictions, control tag 'ALL', with counters
        ('predictions', 'ALL', 'Yes', 'cache_predictions_all', True),
    ],
)
def test_cache_labels_job(source, control_tag, with_counters, expected_cache_column, use_predictions):
    # Initialize a test user and project
    User = get_user_model()
    test_user = User.objects.create(username='test_user')
    project = Project.objects.create(title='Test Project', created_by=test_user)

    # Create a few tasks
    tasks = []
    for i in range(3):
        task = Task.objects.create(project=project, data={'text': f'This is task {i}'})
        tasks.append(task)

    # Add a few annotations or predictions to these tasks
    for i, task in enumerate(tasks):
        result = [
            {
                'from_name': 'label',  # Control tag used in the result
                'to_name': 'text',
                'type': 'labels',
                'value': {'labels': [f'Label_{i % 2 + 1}']},
            }
        ]
        if use_predictions:
            Prediction.objects.create(task=task, project=project, result=result, model_version='v1')
        else:
            Annotation.objects.create(task=task, project=project, completed_by=test_user, result=result)

    # Prepare the request data
    request_data = {'source': source, 'control_tag': control_tag, 'with_counters': with_counters}

    # Get the queryset of tasks to process
    queryset = Task.objects.filter(project=project)

    # Run cache_labels_job
    cache_labels_job(project, queryset, request_data=request_data)

    # Check that the expected cache column is added to task['data']
    for task in tasks:
        task.refresh_from_db()
        cache_column = expected_cache_column
        assert cache_column in task.data
        cached_labels = task.data[cache_column]
        assert cached_labels is not None

        # Verify the contents of the cached labels
        if use_predictions:
            source_objects = Prediction.objects.filter(task=task)
        else:
            source_objects = Annotation.objects.filter(task=task)

        all_labels = []
        for source_obj in source_objects:
            for result in source_obj.result:
                # Apply similar logic as in extract_labels
                from_name = result.get('from_name')
                if control_tag == 'ALL' or control_tag == from_name:
                    value = result.get('value', {})
                    for key in value:
                        if isinstance(value[key], list) and value[key] and isinstance(value[key][0], str):
                            all_labels.extend(value[key])
                            break

        if with_counters.lower() == 'yes':
            expected_cache = ', '.join(sorted([f'{label}: {all_labels.count(label)}' for label in set(all_labels)]))
        else:
            expected_cache = ', '.join(sorted(list(set(all_labels))))

        assert cached_labels == expected_cache


def _annotation(result):
    return Annotation(result=result)


def _region(from_name, value, region_type='labels'):
    return {'from_name': from_name, 'to_name': 'obj', 'type': region_type, 'value': value}


def test_extract_labels_reads_brushlabels_after_rle_mask():
    annotation = _annotation(
        [_region('brush', {'format': 'rle', 'rle': [12, 0, 255, 7], 'brushlabels': ['Tumor']}, 'brushlabels')]
    )
    assert extract_labels(annotation, 'brush') == ['Tumor']


def test_extract_labels_reads_polygonlabels_after_points():
    annotation = _annotation(
        [_region('poly', {'points': [[1.0, 2.0], [3.0, 4.0]], 'polygonlabels': ['Car']}, 'polygonlabels')]
    )
    assert extract_labels(annotation, 'poly') == ['Car']


def test_extract_labels_skips_regions_without_label_strings():
    annotation = _annotation([_region('brush', {'format': 'rle', 'rle': [1, 2, 3]}, 'brushlabels')])
    assert extract_labels(annotation, None) == []


def test_extract_labels_keeps_choices_and_taxonomy_behaviour():
    annotation = _annotation(
        [
            _region('choice', {'choices': ['Yes', 'Maybe']}, 'choices'),
            _region('tax', {'taxonomy': [['Animals', 'Cat'], ['Plants']]}, 'taxonomy'),
        ]
    )
    assert extract_labels(annotation, None) == ['Yes', 'Maybe', 'Animals/Cat', 'Plants']


@pytest.mark.django_db
def test_cache_labels_job_caches_brushlabels_with_counters():
    User = get_user_model()
    test_user = User.objects.create(username='brush_user')
    project = Project.objects.create(title='Brush Project', created_by=test_user)
    task = Task.objects.create(project=project, data={'image': 'https://example.com/a.png'})
    for label in ('Tumor', 'Tumor', 'Vessel'):
        Annotation.objects.create(
            task=task,
            project=project,
            completed_by=test_user,
            result=[_region('brush', {'format': 'rle', 'rle': [12, 0, 255], 'brushlabels': [label]}, 'brushlabels')],
        )

    cache_labels_job(
        project,
        Task.objects.filter(project=project),
        request_data={'source': 'annotations', 'control_tag': 'brush', 'with_counters': 'Yes'},
    )

    task.refresh_from_db()
    assert task.data['cache_brush'] == 'Tumor: 2, Vessel: 1'


def _brush_project(user, n_tasks, labels=('Tumor', 'Vessel')):
    project = Project.objects.create(title='Batch Project', created_by=user)
    tasks = Task.objects.bulk_create(
        [Task(project=project, data={'image': f'https://example.com/{i}.png'}) for i in range(n_tasks)]
    )
    for i, task in enumerate(tasks):
        Prediction.objects.create(
            task=task,
            project=project,
            model_version='v1',
            result=[
                _region('tag', {'format': 'rle', 'rle': [1, 2, 3], 'brushlabels': [labels[i % 2]]}, 'brushlabels')
            ],
        )
    return project, tasks


@pytest.mark.django_db
def test_cache_labels_enqueues_task_ids_not_a_queryset():
    from types import SimpleNamespace
    from unittest import mock

    from data_manager.actions import cache_labels as cache_labels_module

    user = get_user_model().objects.create(username='enqueue_user')
    project, tasks = _brush_project(user, 3)
    request = SimpleNamespace(data={'source': 'predictions', 'control_tag': 'ALL', 'with_counters': 'Yes'})

    with mock.patch.object(cache_labels_module, 'start_job_async_or_sync') as start_job:
        cache_labels_module.cache_labels(project, Task.objects.filter(project=project), request)

    job_args = start_job.call_args.args
    assert job_args[0] is cache_labels_module.cache_labels_job
    assert job_args[1] == project
    assert sorted(job_args[2]) == sorted(t.id for t in tasks)
    assert all(isinstance(task_id, int) for task_id in job_args[2])


@pytest.mark.django_db
def test_cache_labels_job_processes_task_ids_in_batches(monkeypatch):
    from data_manager.actions import cache_labels as cache_labels_module

    monkeypatch.setattr(cache_labels_module, 'CACHE_LABELS_BATCH_SIZE', 2)
    user = get_user_model().objects.create(username='batch_user')
    project, tasks = _brush_project(user, 5)

    cache_labels_job(
        project,
        [t.id for t in tasks],
        request_data={'source': 'predictions', 'control_tag': 'ALL', 'with_counters': 'Yes'},
    )

    values = [Task.objects.get(id=t.id).data['cache_predictions_all'] for t in tasks]
    assert values == ['Tumor: 1', 'Vessel: 1', 'Tumor: 1', 'Vessel: 1', 'Tumor: 1']


@pytest.mark.django_db
def test_cache_labels_job_query_count_does_not_grow_per_task():
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    user = get_user_model().objects.create(username='query_user')
    request_data = {'source': 'predictions', 'control_tag': 'ALL', 'with_counters': 'Yes'}

    small, small_tasks = _brush_project(user, 2)
    with CaptureQueriesContext(connection) as small_ctx:
        cache_labels_job(small, [t.id for t in small_tasks], request_data=request_data)

    large, large_tasks = _brush_project(user, 20)
    with CaptureQueriesContext(connection) as large_ctx:
        cache_labels_job(large, [t.id for t in large_tasks], request_data=request_data)

    assert len(large_ctx.captured_queries) == len(small_ctx.captured_queries)


@pytest.mark.django_db
def test_cache_labels_job_streams_sources_instead_of_holding_a_whole_batch(monkeypatch):
    """Real brush masks are ~1-2 MB each once loaded; a batch must not hold all of them at once."""
    import tracemalloc

    from data_manager.actions import cache_labels as cache_labels_module

    monkeypatch.setattr(cache_labels_module, 'CACHE_LABELS_SOURCE_CHUNK_SIZE', 2)
    user = get_user_model().objects.create(username='stream_user')
    project = Project.objects.create(title='Big Mask Project', created_by=user)
    tasks = Task.objects.bulk_create(
        [Task(project=project, data={'image': f'https://example.com/{i}.png'}) for i in range(20)]
    )
    big_rle = list(range(100_000))  # ~1 MB of Python ints per mask once deserialized
    Prediction.objects.bulk_create(
        [
            Prediction(
                task=task,
                project=project,
                model_version='v1',
                result=[_region('tag', {'format': 'rle', 'rle': big_rle, 'brushlabels': ['Tumor']}, 'brushlabels')],
            )
            for task in tasks
        ]
    )
    del big_rle
    one_mask_bytes = 100_000 * 36

    tracemalloc.start()
    try:
        cache_labels_job(
            project,
            [t.id for t in tasks],
            request_data={'source': 'predictions', 'control_tag': 'ALL', 'with_counters': 'Yes'},
        )
        _, peak = tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()

    assert Task.objects.get(id=tasks[-1].id).data['cache_predictions_all'] == 'Tumor: 1'
    # All 20 masks at once would be ~20 masks; streaming in chunks of 2 keeps it to a handful
    assert peak < one_mask_bytes * 8, f'peak {peak / 1e6:.1f} MB looks like the whole batch was held'
