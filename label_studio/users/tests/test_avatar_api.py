import io

from django.core.files.uploadedfile import SimpleUploadedFile
from organizations.tests.factories import OrganizationFactory
from PIL import Image
from rest_framework.test import APITestCase
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
