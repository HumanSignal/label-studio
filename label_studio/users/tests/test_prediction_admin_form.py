"""An invalid prediction result in Django admin must be a form error, not a 500 from Prediction.save()."""

import json

import pytest
from tasks.tests.factories import TaskFactory
from users.admin import PredictionAdminForm

pytestmark = pytest.mark.django_db


def _form(task, result):
    return PredictionAdminForm(
        data={
            'task': task.id,
            'project': task.project_id,
            'result': json.dumps(result),
            'model_version': '',
            'mislabeling': 0.0,
        }
    )


@pytest.mark.parametrize('result', [[1], 1.5])
def test_invalid_result_is_a_form_error(result):
    form = _form(TaskFactory(), result)

    assert not form.is_valid()
    assert 'result' in form.errors


def test_valid_result_has_no_result_error():
    form = _form(TaskFactory(), [{'from_name': 'label', 'to_name': 'text', 'type': 'choices', 'value': {}}])

    form.is_valid()
    assert 'result' not in form.errors
