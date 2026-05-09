"""Tests for the cache_labels action."""

import pytest
from data_manager.actions.cache_labels import cache_labels_job
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
