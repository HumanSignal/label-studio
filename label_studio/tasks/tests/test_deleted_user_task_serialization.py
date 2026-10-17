import io

import pytest
from data_export.serializers import CompletedBySerializer
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from io_storages.serializers import StorageCompletedBySerializer
from organizations.models import OrganizationMember
from organizations.tests.factories import OrganizationFactory
from PIL import Image
from projects.tests.factories import ProjectFactory
from tasks.serializers import (
    AnnotationDraftSerializer,
    AnnotationSerializer,
    AnnotationStubSerializer,
    CompletedByDMSerializer,
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
def test_completed_by_dm_serializer_masks_avatar_when_user_soft_deleted(org_with_members, settings, tmp_path):
    """Data Manager annotators column: a user removed from this org (but still active in another
    org, so their avatar file is kept) must not expose the real picture next to the masked name."""
    settings.MEDIA_ROOT = str(tmp_path)
    ctx = org_with_members
    annotator = ctx['annotator']
    om = ctx['om']
    project = ctx['project']

    buf = io.BytesIO()
    Image.new('RGB', (4, 4), color='red').save(buf, format='PNG')
    annotator.avatar = SimpleUploadedFile('avatar.png', buf.getvalue(), content_type='image/png')
    annotator.save()
    other_org = OrganizationFactory()
    OrganizationMember.objects.create(organization=other_org, user=annotator)

    active_data = CompletedByDMSerializer(annotator, context={'project': project}).data
    assert active_data['avatar'] == annotator.avatar_url
    assert active_data['initials'] == 'JD'

    om.soft_delete()
    annotator.refresh_from_db()
    assert annotator.avatar  # file kept: user is still a member of other_org

    data = CompletedByDMSerializer(annotator, context={'project': project}).data
    assert data['first_name'] == 'Deleted'
    assert data['last_name'] == f'User {annotator.id}'
    assert data['email'] == f'deleted-{annotator.id}-user@example.com'
    assert data['initials'] == 'DU'
    assert data['avatar'] is None


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
