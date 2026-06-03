import pytest
from data_manager.actions.experimental import propagate_annotations
from projects.models import Project
from tasks.models import Annotation, Task


class RequestStub:
    def __init__(self, user, data=None):
        self.user = user
        self.data = data or {}


@pytest.mark.django_db
def test_propagate_annotations_updates_project_summary(business_client):
    project = Project.objects.create(title='Propagated annotations', created_by=business_client.user)
    source_task = Task.objects.create(project=project, data={'text': 'Source task'})
    target_task = Task.objects.create(project=project, data={'text': 'Target task'})
    source_annotation = Annotation.objects.create(
        task=source_task,
        project=project,
        completed_by=business_client.user,
        result=[
            {
                'from_name': 'label',
                'to_name': 'text',
                'type': 'choices',
                'value': {'choices': ['pos']},
            }
        ],
    )
    project.summary.created_labels = {}
    project.summary.save(update_fields=['created_labels'])

    response = propagate_annotations(
        project,
        Task.objects.filter(id__in=[source_task.id, target_task.id]),
        request=RequestStub(business_client.user, {'source_annotation_id': source_annotation.id}),
    )

    assert response['response_code'] == 200
    propagated_annotation = Annotation.objects.get(parent_annotation=source_annotation)
    assert propagated_annotation.result == source_annotation.result

    target_task.refresh_from_db()
    assert target_task.updated_by == business_client.user

    project.summary.refresh_from_db()
    assert project.summary.created_labels == {'label': {'pos': 1}}
