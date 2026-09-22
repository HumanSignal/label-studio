"""ModelRun.delete_predictions must keep task.total_predictions in sync.

_raw_delete skips Prediction pre_delete signals, so without an explicit recount
the Data Manager counter stays inflated after a prompt/model-run wipe.
"""

import pytest
from ml_models.models import ModelInterface, ThirdPartyModelVersion
from ml_models.tests.factories import ModelRunFactory
from projects.tests.factories import ProjectFactory
from tasks.models import Prediction
from tasks.tests.factories import TaskFactory


def _model_run_for(project):
    interface = ModelInterface.objects.create(
        title='test-interface',
        organization=project.organization,
        created_by=project.created_by,
        input_fields=['text'],
        output_classes=['positive', 'negative'],
    )
    version = ThirdPartyModelVersion.objects.create(
        title='v1',
        parent_model=interface,
        prompt='classify',
        provider_model_id='gpt-test',
        organization=project.organization,
        created_by=project.created_by,
    )
    return ModelRunFactory(project=project, model_version=version)


@pytest.mark.django_db
def test_delete_predictions_recounts_task_total_predictions():
    project = ProjectFactory()
    task = TaskFactory(project=project)
    model_run = _model_run_for(project)

    Prediction.objects.create(
        task=task,
        project=project,
        model_run=model_run,
        result=[],
        model_version='v1',
    )
    # Unrelated prediction on the same task must survive the model-run wipe.
    Prediction.objects.create(
        task=task,
        project=project,
        model_run=None,
        result=[],
        model_version='other',
    )
    task.refresh_from_db()
    assert task.total_predictions == 2

    model_run.delete_predictions()

    task.refresh_from_db()
    assert Prediction.objects.filter(task=task).count() == 1
    assert task.total_predictions == 1


@pytest.mark.django_db
def test_model_run_delete_recounts_task_total_predictions():
    project = ProjectFactory()
    task = TaskFactory(project=project)
    model_run = _model_run_for(project)

    Prediction.objects.create(
        task=task,
        project=project,
        model_run=model_run,
        result=[],
        model_version='v1',
    )
    task.refresh_from_db()
    assert task.total_predictions == 1

    model_run.delete()

    task.refresh_from_db()
    assert Prediction.objects.filter(task=task).count() == 0
    assert task.total_predictions == 0
