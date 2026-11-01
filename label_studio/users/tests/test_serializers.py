import io
import os

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from organizations.models import OrganizationMember
from organizations.tests.factories import OrganizationFactory
from PIL import Image
from users.serializers import UserSerializer, UserSimpleSerializer
from users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


def _png_upload(name='avatar.png') -> SimpleUploadedFile:
    buf = io.BytesIO()
    Image.new('RGB', (4, 4), color='red').save(buf, format='PNG')
    return SimpleUploadedFile(name, buf.getvalue(), content_type='image/png')


@pytest.fixture
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    return tmp_path


@pytest.fixture
def multi_org_user_with_avatar(media_root):
    """User A belongs to org1 and org2 and has an avatar; removed from org1 only."""
    org1 = OrganizationFactory()
    org2 = OrganizationFactory()
    user = UserFactory(first_name='John', last_name='Doe', email='john.doe@example.com')
    user.avatar = _png_upload()
    user.save()
    om1 = OrganizationMember.objects.create(organization=org1, user=user)
    OrganizationMember.objects.create(organization=org2, user=user)
    user.active_organization = org1
    user.save(update_fields=['active_organization'])

    om1.soft_delete()
    user.refresh_from_db()
    return {'user': user, 'org1': org1, 'org2': org2}


@pytest.mark.parametrize('serializer_class', [UserSerializer, UserSimpleSerializer])
def test_deleted_user_avatar_is_null_in_removed_org(multi_org_user_with_avatar, serializer_class):
    ctx = multi_org_user_with_avatar
    user = ctx['user']

    # the avatar file is kept because the user still belongs to org2
    assert user.avatar
    assert user.avatar_url

    data = serializer_class(user, context={'organization_id': ctx['org1'].id}).data
    assert data['first_name'] == 'Deleted'
    assert data['last_name'] == f'User {user.id}'
    assert data['email'] == f'deleted-{user.id}-user@example.com'
    assert data['avatar'] is None


def test_deleted_user_initials_stay_masked(multi_org_user_with_avatar):
    ctx = multi_org_user_with_avatar
    data = UserSerializer(ctx['user'], context={'organization_id': ctx['org1'].id}).data
    assert data['initials'] == 'DU'


@pytest.mark.parametrize('serializer_class', [UserSerializer, UserSimpleSerializer])
def test_multi_org_user_keeps_real_avatar_in_other_org(multi_org_user_with_avatar, serializer_class):
    ctx = multi_org_user_with_avatar
    user = ctx['user']

    data = serializer_class(user, context={'organization_id': ctx['org2'].id}).data
    assert data['first_name'] == 'John'
    assert data['email'] == 'john.doe@example.com'
    assert data['avatar'] == user.avatar_url
    assert data['avatar'] is not None


def test_deleted_user_avatar_masked_per_org_within_shared_context(multi_org_user_with_avatar):
    """The per-request user cache must not leak the real avatar across org-scoped contexts."""
    ctx = multi_org_user_with_avatar
    user = ctx['user']

    shared_context = {'organization_id': ctx['org1'].id}
    first = UserSimpleSerializer(user, context=shared_context).data
    second = UserSimpleSerializer(user, context=shared_context).data
    assert first['avatar'] is None
    assert second['avatar'] is None


def test_user_removed_from_last_org_has_avatar_file_deleted_and_null(media_root):
    org = OrganizationFactory()
    user = UserFactory(first_name='Jane', last_name='Roe', email='jane.roe@example.com')
    user.avatar = _png_upload('last.png')
    user.save()
    om = OrganizationMember.objects.create(organization=org, user=user)
    user.active_organization = org
    user.save(update_fields=['active_organization'])
    avatar_path = user.avatar.path
    assert os.path.exists(avatar_path)

    om.soft_delete()
    user.refresh_from_db()

    assert not user.avatar
    assert not os.path.exists(avatar_path)
    data = UserSerializer(user, context={'organization_id': org.id}).data
    assert data['first_name'] == 'Deleted'
    assert data['avatar'] is None
