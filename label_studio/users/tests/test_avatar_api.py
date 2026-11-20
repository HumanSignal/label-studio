import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from organizations.models import OrganizationMember
from organizations.tests.factories import OrganizationFactory
from PIL import Image
from rest_framework.test import APITestCase
from users.functions import can_read_avatar
from users.tests.factories import UserFactory


def _make_png_bytes(width: int, height: int) -> bytes:
    buf = io.BytesIO()
    Image.new('RGB', (width, height), color='red').save(buf, format='PNG')
    return buf.getvalue()


class TestUserAvatarAPI(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        cls.user = UserFactory(active_organization=cls.organization)

    def test_avatar_upload_too_large_returns_400(self):
        # Reproduces: ENTERPRISE-V2-BACKEND-2HY
        # Posting an image larger than 1200x1200 to /api/users/{pk}/avatar/ must
        # return a clean 4xx response rather than letting forms.ValidationError
        # bubble up and surface as a 500/unhandled exception in Sentry.
        self.client.force_authenticate(user=self.user)

        image_bytes = _make_png_bytes(1500, 1500)
        upload = SimpleUploadedFile('avatar.png', image_bytes, content_type='image/png')

        response = self.client.post(
            f'/api/users/{self.user.id}/avatar/',
            data={'avatar': upload},
            format='multipart',
        )

        assert response.status_code == 400
        assert '1200' in response.json()['detail']


@override_settings(USE_NGINX_FOR_UPLOADS=False)
class TestAvatarFileAccess(APITestCase):
    """GET /storage-data/uploaded/?filepath=avatars/... is limited to the owner's organization."""

    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        cls.owner = UserFactory(active_organization=cls.organization)
        cls.colleague = UserFactory(active_organization=cls.organization)
        cls.outsider = UserFactory(active_organization=OrganizationFactory())

    def setUp(self):
        self.owner.avatar.save('avatar.png', SimpleUploadedFile('avatar.png', _make_png_bytes(10, 10)), save=True)

    def _get_avatar(self, requester):
        self.client.force_authenticate(user=requester)
        return self.client.get('/storage-data/uploaded/', {'filepath': self.owner.avatar.name})

    def test_owner_reads_own_avatar(self):
        assert self._get_avatar(self.owner).status_code == 200

    def test_member_of_same_organization_reads_avatar(self):
        assert self._get_avatar(self.colleague).status_code == 200

    def test_user_of_another_organization_is_forbidden(self):
        assert self._get_avatar(self.outsider).status_code == 403

    def test_removed_member_avatar_is_forbidden_to_former_organization(self):
        """A soft-deleted membership row must not grant access to the owner's avatar."""
        own_organization = OrganizationFactory(created_by=self.owner)
        self.owner.active_organization = own_organization
        self.owner.save(update_fields=['active_organization'])
        OrganizationMember.objects.get(user=self.owner, organization=self.organization).soft_delete()

        assert self._get_avatar(self.colleague).status_code == 403


class TestCanReadAvatar(APITestCase):
    def test_requester_without_active_organization_reads_only_own_avatar(self):
        organization = OrganizationFactory()
        owner = UserFactory(active_organization=organization)
        requester = UserFactory()

        assert can_read_avatar(requester, owner) is False
        assert can_read_avatar(owner, owner) is True
