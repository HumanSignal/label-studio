import mock
from data_manager.actions.predictions_to_annotations import predictions_to_annotations_form
from projects.models import Project
from users.models import User


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
