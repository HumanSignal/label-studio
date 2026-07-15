from unittest.mock import patch

import pytest
from ml.models import MLBackend
from projects.tests.factories import ProjectFactory
from tasks.serializers import NextTaskSerializer
from tasks.tests.factories import TaskFactory


@pytest.mark.django_db
def test_get_predictions_with_int_model_version_from_ml_backend():
    # Reproduces: ENTERPRISE-V2-BACKEND-64G
    #
    # When collaborative pre-labeling is enabled and the project's ML backend
    # returns predictions, Task.get_predictions_for_prelabeling() forwards
    # whatever MLBackend.predict_tasks() returns straight to the serializer
    # unless it's a `str` (the model_version fast-path). If the ML backend's
    # setup response reports `model_version` as an integer, predict_tasks()
    # returns that int (when every task already has a matching prediction),
    # get_predictions_for_prelabeling() returns it as-is, and the serializer
    # tries to iterate over it with many=True.
    #
    # On unpatched code this raises the exact Sentry error:
    #   TypeError: 'int' object is not iterable
    # Once fixed, get_predictions() should degrade gracefully to a list.
    project = ProjectFactory(show_collab_predictions=True, model_version='mymodel')
    # ml_backend_in_model_version is True when a backend's title matches model_version
    MLBackend.objects.create(project=project, url='http://ml.test', title='mymodel')
    task = TaskFactory(project=project)

    serializer = NextTaskSerializer(task, context={})

    # Simulate the ML backend reporting an integer model_version, which
    # propagates back through predict_tasks() unchanged.
    with patch.object(MLBackend, 'predict_tasks', return_value=1):
        predictions = serializer.get_predictions(task)

    # Serialized predictions must always be an iterable list of prediction dicts.
    assert isinstance(predictions, list)
