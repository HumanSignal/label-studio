import mock
import pytest
from data_manager.actions.predictions_to_annotations import predictions_to_annotations, predictions_to_annotations_form
from projects.models import Project
from tasks.models import Annotation, Prediction, Task
from users.models import User


class RequestStub:
    def __init__(self, user, data=None):
        self.user = user
        self.data = data or {}


def test_predictions_to_annotations_form():
    project = Project()
    user = User()

    with mock.patch('projects.models.Project.get_model_versions') as mock_get_model_versions:
        project.model_version = ''
        mock_get_model_versions.return_value = ['undefined']
        assert predictions_to_annotations_form(user, project)[0]['fields'][0]['options'] == ['undefined']

        project.model_version = None
        mock_get_model_versions.return_value = ['undefined']
        assert predictions_to_annotations_form(user, project)[0]['fields'][0]['options'] == ['undefined']

        project.model_version = 'undefined'
        mock_get_model_versions.return_value = ['undefined']
        assert predictions_to_annotations_form(user, project)[0]['fields'][0]['options'] == ['undefined']

        project.model_version = ''
        mock_get_model_versions.return_value = []
        assert predictions_to_annotations_form(user, project)[0]['fields'][0]['options'] == []

        project.model_version = None
        mock_get_model_versions.return_value = []
        assert predictions_to_annotations_form(user, project)[0]['fields'][0]['options'] == []

        project.model_version = 'undefined'
        mock_get_model_versions.return_value = []
        assert predictions_to_annotations_form(user, project)[0]['fields'][0]['options'] == ['undefined']


@pytest.mark.django_db
def test_predictions_to_annotations_updates_project_summary(business_client):
    project = Project.objects.create(title='Bulk prediction annotations', created_by=business_client.user)
    task = Task.objects.create(project=project, data={'text': 'Task'})
    prediction = Prediction.objects.create(
        task=task,
        project=project,
        result=[
            {
                'from_name': 'label',
                'to_name': 'text',
                'type': 'choices',
                'value': {'choices': ['pos']},
            }
        ],
        model_version='v1',
    )
    project.summary.created_labels = {}
    project.summary.save(update_fields=['created_labels'])

    response = predictions_to_annotations(
        project,
        Task.objects.filter(id=task.id),
        request=RequestStub(business_client.user),
    )

    assert response['response_code'] == 200
    annotation = Annotation.objects.get(parent_prediction=prediction)
    assert annotation.result == prediction.result

    task.refresh_from_db()
    assert task.updated_by == business_client.user

    project.summary.refresh_from_db()
    assert project.summary.created_labels == {'label': {'pos': 1}}
