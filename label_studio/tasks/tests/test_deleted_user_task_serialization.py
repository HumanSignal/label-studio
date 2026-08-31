import pytest
from data_export.serializers import CompletedBySerializer
from django.utils import timezone
from io_storages.serializers import StorageCompletedBySerializer
from organizations.models import OrganizationMember
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from tasks.serializers import (
    AnnotationDraftSerializer,
    AnnotationSerializer,
    AnnotationStubSerializer,
    TaskWithAnnotationsAndPredictionsAndDraftsSerializer,
)
from tasks.tests.factories import AnnotationDraftFactory, AnnotationFactory, TaskFactory
from users.tests.factories import UserFactory


@pytest.fixture
def org_with_members():
    org = OrganizationFactory()
    owner = UserFactory(
        first_name='OwnerFirst',
        last_name='OwnerLast',
        email='owner@example.com',
    )
    OrganizationMember.objects.create(organization=org, user=owner)

    annotator = UserFactory(
        first_name='John',
        last_name='Doe',
        email='john.doe@example.com',
    )
    om = OrganizationMember.objects.create(organization=org, user=annotator)

    project = ProjectFactory(organization=org)
    task = TaskFactory(project=project)
    annotation = AnnotationFactory(task=task, project=project, completed_by=annotator)
    draft = AnnotationDraftFactory(task=task, user=annotator)

    return {
        'org': org,
        'owner': owner,
        'annotator': annotator,
        'om': om,
        'project': project,
        'task': task,
        'annotation': annotation,
        'draft': draft,
    }


@pytest.mark.django_db
def test_annotation_serializer_created_username_masked_when_user_soft_deleted(org_with_members):
    ctx = org_with_members
    annotator = ctx['annotator']
    om = ctx['om']
    annotation = ctx['annotation']
    project = ctx['project']

    # Active user: created_username includes real name, email, and ID
    active_data = AnnotationSerializer(annotation, context={'project': project}).data
    assert 'John Doe' in active_data['created_username']
    assert 'john.doe@example.com' in active_data['created_username']

    # Soft-delete the user
    om.deleted_at = timezone.now()
    om.save()

    # Soft-deleted user: created_username must be masked
    deleted_data = AnnotationSerializer(annotation, context={'project': project}).data
    expected_username = f'Deleted User {annotator.id} deleted-{annotator.id}-user@example.com, {annotator.id}'
    assert deleted_data['created_username'] == expected_username
    assert 'John' not in deleted_data['created_username']
    assert 'john.doe@example.com' not in deleted_data['created_username']


@pytest.mark.django_db
def test_annotation_stub_serializer_created_username_masked_when_user_soft_deleted(org_with_members):
    ctx = org_with_members
    annotator = ctx['annotator']
    om = ctx['om']
    annotation = ctx['annotation']
    project = ctx['project']

    # Soft-delete the user
    om.deleted_at = timezone.now()
    om.save()

    deleted_data = AnnotationStubSerializer(annotation, context={'project': project}).data
    expected_username = f'Deleted User {annotator.id} deleted-{annotator.id}-user@example.com, {annotator.id}'
    assert deleted_data['created_username'] == expected_username
    assert 'John' not in deleted_data['created_username']
    assert 'john.doe@example.com' not in deleted_data['created_username']


@pytest.mark.django_db
def test_annotation_draft_serializer_created_username_masked_when_user_soft_deleted(org_with_members):
    ctx = org_with_members
    annotator = ctx['annotator']
    om = ctx['om']
    draft = ctx['draft']
    project = ctx['project']

    # Soft-delete the user
    om.deleted_at = timezone.now()
    om.save()

    deleted_data = AnnotationDraftSerializer(draft, context={'project': project}).data
    expected_username = f'Deleted User {annotator.id} deleted-{annotator.id}-user@example.com, {annotator.id}'
    assert deleted_data['created_username'] == expected_username
    assert 'John' not in deleted_data['created_username']
    assert 'john.doe@example.com' not in deleted_data['created_username']


@pytest.mark.django_db
def test_data_export_completed_by_serializer_masked_when_user_soft_deleted(org_with_members):
    ctx = org_with_members
    annotator = ctx['annotator']
    om = ctx['om']
    project = ctx['project']

    # Soft-delete the user
    om.deleted_at = timezone.now()
    om.save()

    data = CompletedBySerializer(annotator, context={'project': project}).data
    assert data['first_name'] == 'Deleted'
    assert data['last_name'] == f'User {annotator.id}'
    assert data['email'] == f'deleted-{annotator.id}-user@example.com'
    assert 'John' not in data.values()
    assert 'john.doe@example.com' not in data.values()


@pytest.mark.django_db
def test_storage_completed_by_serializer_masked_when_user_soft_deleted(org_with_members):
    ctx = org_with_members
    annotator = ctx['annotator']
    om = ctx['om']
    project = ctx['project']

    # Soft-delete the user
    om.deleted_at = timezone.now()
    om.save()

    data = StorageCompletedBySerializer(annotator, context={'project': project}).data
    assert data['first_name'] == 'Deleted'
    assert data['last_name'] == f'User {annotator.id}'
    assert data['email'] == f'deleted-{annotator.id}-user@example.com'
    assert 'John' not in data.values()
    assert 'john.doe@example.com' not in data.values()


@pytest.mark.django_db
def test_task_serializer_masks_soft_deleted_annotator(org_with_members):
    ctx = org_with_members
    annotator = ctx['annotator']
    om = ctx['om']
    task = ctx['task']
    project = ctx['project']

    # Soft-delete the user
    om.deleted_at = timezone.now()
    om.save()

    task_data = TaskWithAnnotationsAndPredictionsAndDraftsSerializer(task, context={'project': project}).data
    annotations = task_data.get('annotations', [])
    assert len(annotations) == 1
    ann = annotations[0]
    expected_username = f'Deleted User {annotator.id} deleted-{annotator.id}-user@example.com, {annotator.id}'
    assert ann['created_username'] == expected_username
    assert 'John' not in ann['created_username']
    assert 'john.doe@example.com' not in ann['created_username']
