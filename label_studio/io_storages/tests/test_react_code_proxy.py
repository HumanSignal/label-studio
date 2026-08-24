import base64
import time
import unittest
from unittest.mock import MagicMock, patch

import jwt
import pytest
from django.test import override_settings
from io_storages.react_code_proxy import (
    REACT_CODE_TOKEN_AUDIENCE,
    REACT_CODE_TOKEN_TTL_DEFAULT,
    REACT_CODE_TOKEN_TTL_MAX,
    REACT_CODE_TOKEN_TTL_MIN,
    ReactCodeResolveView,
    ReactCodeTokenView,
    _add_cors_headers,
    decode_react_code_token,
    generate_react_code_token,
)
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate

TEST_SECRET_KEY = 'test-secret-key-for-react-code-proxy'


class TestGenerateReactCodeToken(unittest.TestCase):
    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_generates_valid_jwt_with_default_ttl(self):
        user = MagicMock()
        user.id = 42
        user.active_organization_id = 7

        token, expires_in = generate_react_code_token(user, project_id=10)

        assert expires_in == REACT_CODE_TOKEN_TTL_DEFAULT
        payload = jwt.decode(token, TEST_SECRET_KEY, algorithms=['HS256'], audience=REACT_CODE_TOKEN_AUDIENCE)
        assert payload['sub'] == '42'
        assert payload['prj'] == 10
        assert payload['org'] == 7
        assert payload['aud'] == REACT_CODE_TOKEN_AUDIENCE
        assert 'jti' in payload
        assert 'iat' in payload
        assert 'exp' in payload

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_token_has_correct_default_expiry(self):
        user = MagicMock()
        user.id = 1
        user.active_organization_id = 1

        token, _ = generate_react_code_token(user, project_id=1)
        payload = jwt.decode(token, TEST_SECRET_KEY, algorithms=['HS256'], audience=REACT_CODE_TOKEN_AUDIENCE)

        expected_exp = payload['iat'] + REACT_CODE_TOKEN_TTL_DEFAULT
        assert payload['exp'] == expected_exp

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_custom_ttl(self):
        user = MagicMock()
        user.id = 1
        user.active_organization_id = 1

        token, expires_in = generate_react_code_token(user, project_id=1, ttl=600)

        assert expires_in == 600
        payload = jwt.decode(token, TEST_SECRET_KEY, algorithms=['HS256'], audience=REACT_CODE_TOKEN_AUDIENCE)
        assert payload['exp'] == payload['iat'] + 600

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_ttl_clamped_to_min(self):
        user = MagicMock()
        user.id = 1
        user.active_organization_id = 1

        _, expires_in = generate_react_code_token(user, project_id=1, ttl=5)
        assert expires_in == REACT_CODE_TOKEN_TTL_MIN

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_ttl_clamped_to_max(self):
        user = MagicMock()
        user.id = 1
        user.active_organization_id = 1

        _, expires_in = generate_react_code_token(user, project_id=1, ttl=999999)
        assert expires_in == REACT_CODE_TOKEN_TTL_MAX


class TestDecodeReactCodeToken(unittest.TestCase):
    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_decodes_valid_token(self):
        user = MagicMock()
        user.id = 5
        user.active_organization_id = 3
        token, _ = generate_react_code_token(user, project_id=8)

        payload = decode_react_code_token(token)
        assert payload['sub'] == '5'
        assert payload['prj'] == 8

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_rejects_expired_token(self):
        payload = {
            'sub': '1',
            'prj': 1,
            'org': 1,
            'exp': int(time.time()) - 100,
            'iat': int(time.time()) - 3700,
            'jti': 'abc',
            'aud': REACT_CODE_TOKEN_AUDIENCE,
        }
        token = jwt.encode(payload, TEST_SECRET_KEY, algorithm='HS256')

        with pytest.raises(jwt.ExpiredSignatureError):
            decode_react_code_token(token)

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_rejects_wrong_audience(self):
        payload = {
            'sub': '1',
            'prj': 1,
            'exp': int(time.time()) + 3600,
            'iat': int(time.time()),
            'jti': 'abc',
            'aud': 'wrong-audience',
        }
        token = jwt.encode(payload, TEST_SECRET_KEY, algorithm='HS256')

        with pytest.raises(jwt.InvalidAudienceError):
            decode_react_code_token(token)

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_rejects_tampered_token(self):
        user = MagicMock()
        user.id = 1
        user.active_organization_id = 1
        token, _ = generate_react_code_token(user, project_id=1)

        tampered = token[:-5] + 'XXXXX'
        with pytest.raises(jwt.PyJWTError):
            decode_react_code_token(tampered)

    def test_rejects_wrong_secret(self):
        payload = {
            'sub': '1',
            'prj': 1,
            'exp': int(time.time()) + 3600,
            'iat': int(time.time()),
            'jti': 'abc',
            'aud': REACT_CODE_TOKEN_AUDIENCE,
        }
        token = jwt.encode(payload, 'different-secret', algorithm='HS256')

        with override_settings(SECRET_KEY=TEST_SECRET_KEY):
            with pytest.raises(jwt.PyJWTError):
                decode_react_code_token(token)


class TestAddCorsHeaders(unittest.TestCase):
    def test_adds_all_cors_headers(self):
        from django.http import HttpResponse

        response = HttpResponse()
        result = _add_cors_headers(response)

        assert result['Access-Control-Allow-Origin'] == '*'
        assert 'GET' in result['Access-Control-Allow-Methods']
        assert 'OPTIONS' in result['Access-Control-Allow-Methods']
        assert 'Range' in result['Access-Control-Allow-Headers']
        assert 'Content-Range' in result['Access-Control-Expose-Headers']
        assert 'Content-Length' in result['Access-Control-Expose-Headers']


class TestReactCodeTokenView:
    @pytest.fixture
    def setup(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock()
        self.user.id = 42
        self.user.active_organization_id = 7
        self.view = ReactCodeTokenView.as_view()

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    @patch('io_storages.react_code_proxy.Project.objects.get')
    def test_post_returns_token(self, mock_project_get, setup):
        mock_project = MagicMock()
        mock_project.has_permission.return_value = True
        mock_project_get.return_value = mock_project

        request = self.factory.post('/api/react-code/token/', {'project_id': 10}, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)

        assert response.status_code == status.HTTP_200_OK
        assert 'token' in response.data
        assert 'expires_in' in response.data
        assert response.data['expires_in'] == REACT_CODE_TOKEN_TTL_DEFAULT

        payload = jwt.decode(
            response.data['token'], TEST_SECRET_KEY, algorithms=['HS256'], audience=REACT_CODE_TOKEN_AUDIENCE
        )
        assert payload['sub'] == '42'
        assert payload['prj'] == 10

    @patch('io_storages.react_code_proxy.Project.objects.get')
    def test_post_missing_project_id(self, mock_project_get, setup):
        request = self.factory.post('/api/react-code/token/', {}, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch('io_storages.react_code_proxy.Project.objects.get')
    def test_post_project_not_found(self, mock_project_get, setup):
        from projects.models import Project

        mock_project_get.side_effect = Project.DoesNotExist

        request = self.factory.post('/api/react-code/token/', {'project_id': 999}, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('io_storages.react_code_proxy.Project.objects.get')
    def test_post_no_permission(self, mock_project_get, setup):
        mock_project = MagicMock()
        mock_project.has_permission.return_value = False
        mock_project_get.return_value = mock_project

        request = self.factory.post('/api/react-code/token/', {'project_id': 10}, format='json')
        force_authenticate(request, user=self.user)
        response = self.view(request)

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestReactCodeResolveView:
    @pytest.fixture
    def setup(self):
        self.factory = APIRequestFactory()
        self.view = ReactCodeResolveView.as_view()

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_options_returns_cors_headers(self, setup):
        request = self.factory.options('/api/react-code/resolve/sometoken/')
        response = self.view(request, token='sometoken')

        assert response.status_code == 200
        assert response['Access-Control-Allow-Origin'] == '*'
        assert 'GET' in response['Access-Control-Allow-Methods']

    def test_get_missing_fileuri(self, setup):
        request = self.factory.get('/api/react-code/resolve/sometoken/')
        response = self.view(request, token='sometoken')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response['Access-Control-Allow-Origin'] == '*'

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_get_expired_token(self, setup):
        payload = {
            'sub': '1',
            'prj': 1,
            'org': 1,
            'exp': int(time.time()) - 100,
            'iat': int(time.time()) - 3700,
            'jti': 'abc',
            'aud': REACT_CODE_TOKEN_AUDIENCE,
        }
        token = jwt.encode(payload, TEST_SECRET_KEY, algorithm='HS256')
        fileuri = base64.urlsafe_b64encode(b's3://bucket/file.xml').decode()

        request = self.factory.get(f'/api/react-code/resolve/{token}/?fileuri={fileuri}')
        response = self.view(request, token=token)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data['detail'] == 'Token has expired.'
        assert response['Access-Control-Allow-Origin'] == '*'

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_get_tampered_token(self, setup):
        fileuri = base64.urlsafe_b64encode(b's3://bucket/file.xml').decode()

        request = self.factory.get(f'/api/react-code/resolve/not-a-valid-jwt/?fileuri={fileuri}')
        response = self.view(request, token='not-a-valid-jwt')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data['detail'] == 'Invalid token.'
        assert response['Access-Control-Allow-Origin'] == '*'

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_get_wrong_audience(self, setup):
        payload = {
            'sub': '1',
            'prj': 1,
            'exp': int(time.time()) + 3600,
            'iat': int(time.time()),
            'jti': 'abc',
            'aud': 'wrong-audience',
        }
        token = jwt.encode(payload, TEST_SECRET_KEY, algorithm='HS256')
        fileuri = base64.urlsafe_b64encode(b's3://bucket/file.xml').decode()

        request = self.factory.get(f'/api/react-code/resolve/{token}/?fileuri={fileuri}')
        response = self.view(request, token=token)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response['Access-Control-Allow-Origin'] == '*'

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    def test_get_missing_claims(self, setup):
        payload = {
            'exp': int(time.time()) + 3600,
            'iat': int(time.time()),
            'jti': 'abc',
            'aud': REACT_CODE_TOKEN_AUDIENCE,
        }
        token = jwt.encode(payload, TEST_SECRET_KEY, algorithm='HS256')
        fileuri = base64.urlsafe_b64encode(b's3://bucket/file.xml').decode()

        request = self.factory.get(f'/api/react-code/resolve/{token}/?fileuri={fileuri}')
        response = self.view(request, token=token)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data['detail'] == 'Invalid token claims.'

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    @patch('io_storages.react_code_proxy.Project.objects.get')
    @patch('io_storages.react_code_proxy.get_user_model')
    def test_get_user_not_found(self, mock_get_user_model, mock_project_get, setup):
        UserModel = MagicMock()
        UserModel.DoesNotExist = type('DoesNotExist', (Exception,), {})
        UserModel.objects.get.side_effect = UserModel.DoesNotExist
        mock_get_user_model.return_value = UserModel

        user = MagicMock()
        user.id = 999
        user.active_organization_id = 1
        token, _ = generate_react_code_token(user, project_id=1)
        fileuri = base64.urlsafe_b64encode(b's3://bucket/file.xml').decode()

        request = self.factory.get(f'/api/react-code/resolve/{token}/?fileuri={fileuri}')
        response = self.view(request, token=token)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response['Access-Control-Allow-Origin'] == '*'

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    @patch('io_storages.react_code_proxy.Project.objects.get')
    @patch('io_storages.react_code_proxy.get_user_model')
    def test_get_project_not_found(self, mock_get_user_model, mock_project_get, setup):
        from projects.models import Project

        UserModel = MagicMock()
        mock_user = MagicMock()
        UserModel.objects.get.return_value = mock_user
        mock_get_user_model.return_value = UserModel
        mock_project_get.side_effect = Project.DoesNotExist

        user = MagicMock()
        user.id = 1
        user.active_organization_id = 1
        token, _ = generate_react_code_token(user, project_id=999)
        fileuri = base64.urlsafe_b64encode(b's3://bucket/file.xml').decode()

        request = self.factory.get(f'/api/react-code/resolve/{token}/?fileuri={fileuri}')
        response = self.view(request, token=token)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response['Access-Control-Allow-Origin'] == '*'

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    @patch('io_storages.react_code_proxy.ResolveStorageUriAPIMixin.resolve')
    @patch('io_storages.react_code_proxy.Project.objects.get')
    @patch('io_storages.react_code_proxy.get_user_model')
    def test_get_success_delegates_to_resolve(self, mock_get_user_model, mock_project_get, mock_resolve, setup):
        """Cloud-storage URIs are delegated to self.resolve() (presigned redirect or proxy).

        The sandbox fetches this endpoint via the parent-window fetch-bridge, which can
        follow presigned redirects freely — cloud-storage content never passes through
        the LS server.
        """
        UserModel = MagicMock()
        mock_user = MagicMock()
        UserModel.objects.get.return_value = mock_user
        mock_get_user_model.return_value = UserModel

        mock_project = MagicMock()
        mock_project.has_permission.return_value = True
        mock_project_get.return_value = mock_project

        mock_resolve.return_value = Response(status=status.HTTP_200_OK)

        user = MagicMock()
        user.id = 42
        user.active_organization_id = 7
        token, _ = generate_react_code_token(user, project_id=10)
        fileuri = base64.urlsafe_b64encode(b's3://bucket/file.xml').decode()

        request = self.factory.get(f'/api/react-code/resolve/{token}/?fileuri={fileuri}')
        response = self.view(request, token=token)

        assert response.status_code == status.HTTP_200_OK
        assert response['Access-Control-Allow-Origin'] == '*'
        mock_resolve.assert_called_once()
        call_args = mock_resolve.call_args[0]
        assert call_args[1] == 's3://bucket/file.xml'
        assert call_args[2] == mock_project

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    @patch('io_storages.react_code_proxy.ResolveStorageUriAPIMixin.resolve')
    @patch('io_storages.react_code_proxy.Project.objects.get')
    @patch('io_storages.react_code_proxy.get_user_model')
    def test_get_sets_user_on_request(self, mock_get_user_model, mock_project_get, mock_resolve, setup):
        """Verify the resolved user is set on request before resolve() is called."""
        UserModel = MagicMock()
        mock_user = MagicMock()
        mock_user.pk = 42
        UserModel.objects.get.return_value = mock_user
        mock_get_user_model.return_value = UserModel

        mock_project = MagicMock()
        mock_project.has_permission.return_value = True
        mock_project_get.return_value = mock_project

        mock_resolve.return_value = Response(status=status.HTTP_200_OK)

        user = MagicMock()
        user.id = 42
        user.active_organization_id = 7
        token, _ = generate_react_code_token(user, project_id=10)
        fileuri = base64.urlsafe_b64encode(b's3://bucket/file.xml').decode()

        request = self.factory.get(f'/api/react-code/resolve/{token}/?fileuri={fileuri}')
        self.view(request, token=token)

        resolved_request = mock_resolve.call_args[0][0]
        assert resolved_request.user == mock_user


class TestServeLocalUpload:
    """Test _serve_local_upload via the full ReactCodeResolveView.get() path."""

    @pytest.fixture
    def setup(self):
        self.factory = APIRequestFactory()
        self.view = ReactCodeResolveView.as_view()

    def _auth_mocks(self):
        """Return (UserModel mock, project mock) wired for a valid authenticated request."""
        UserModel = MagicMock()
        mock_user = MagicMock()
        UserModel.objects.get.return_value = mock_user

        mock_org = MagicMock()
        mock_project = MagicMock()
        mock_project.organization = mock_org

        return UserModel, mock_project

    def _upload_mock(self, content: bytes = b'\xff\xd8\xff\xe0', name: str = 'upload/25/abc-photo.jpg'):
        """Return a FileUpload mock that serves the given bytes."""
        mock_file = MagicMock()
        mock_file.__enter__ = MagicMock(return_value=mock_file)
        mock_file.__exit__ = MagicMock(return_value=False)
        mock_file.read.return_value = content

        mock_upload = MagicMock()
        mock_upload.file.name = name
        mock_upload.file.open.return_value = mock_file
        return mock_upload

    def _get(self, token: str, path: str):
        from urllib.parse import quote

        request = self.factory.get(
            f'/api/react-code/resolve/{token}/',
            {'fileuri': quote(path, safe='')},
        )
        return self.view(request, token=token)

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    @patch('data_import.models.FileUpload')
    @patch('io_storages.react_code_proxy.Project.objects.get')
    @patch('io_storages.react_code_proxy.get_user_model')
    def test_serves_local_upload_with_correct_content_type(
        self, mock_get_user_model, mock_project_get, mock_file_upload_class, setup
    ):
        UserModel, mock_project = self._auth_mocks()
        mock_get_user_model.return_value = UserModel
        mock_project_get.return_value = mock_project

        mock_upload = self._upload_mock(content=b'\xff\xd8\xff\xe0', name='upload/25/abc-photo.jpg')
        mock_file_upload_class.objects.select_related.return_value.get.return_value = mock_upload

        user = MagicMock(id=1, active_organization_id=1)
        token, _ = generate_react_code_token(user, project_id=25)

        response = self._get(token, '/data/upload/25/abc-photo.jpg')

        assert response.status_code == 200
        assert response['Access-Control-Allow-Origin'] == '*'
        assert response['Content-Type'] == 'image/jpeg'
        assert response.content == b'\xff\xd8\xff\xe0'

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    @patch('data_import.models.FileUpload')
    @patch('io_storages.react_code_proxy.Project.objects.get')
    @patch('io_storages.react_code_proxy.get_user_model')
    def test_returns_404_when_file_not_found(
        self, mock_get_user_model, mock_project_get, mock_file_upload_class, setup
    ):
        UserModel, mock_project = self._auth_mocks()
        mock_get_user_model.return_value = UserModel
        mock_project_get.return_value = mock_project

        # DoesNotExist on a patched class is a MagicMock, not a real exception.
        # Wire a proper exception class so the except clause can catch it.
        does_not_exist = type('DoesNotExist', (Exception,), {})
        mock_file_upload_class.DoesNotExist = does_not_exist
        mock_file_upload_class.objects.select_related.return_value.get.side_effect = does_not_exist

        user = MagicMock(id=1, active_organization_id=1)
        token, _ = generate_react_code_token(user, project_id=25)

        response = self._get(token, '/data/upload/25/missing.jpg')

        assert response.status_code == 404
        assert response['Access-Control-Allow-Origin'] == '*'

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    @patch('data_import.models.FileUpload')
    @patch('io_storages.react_code_proxy.Project.objects.get')
    @patch('io_storages.react_code_proxy.get_user_model')
    def test_returns_404_for_cross_org_file(
        self, mock_get_user_model, mock_project_get, mock_file_upload_class, setup
    ):
        """Cross-org files are simply not found because the ORM filter excludes them."""
        UserModel, mock_project = self._auth_mocks()
        mock_get_user_model.return_value = UserModel
        mock_project_get.return_value = mock_project

        does_not_exist = type('DoesNotExist', (Exception,), {})
        mock_file_upload_class.DoesNotExist = does_not_exist
        mock_file_upload_class.objects.select_related.return_value.get.side_effect = does_not_exist

        user = MagicMock(id=1, active_organization_id=1)
        token, _ = generate_react_code_token(user, project_id=25)

        response = self._get(token, '/data/upload/99/foreign-org-file.jpg')

        assert response.status_code == 404
        assert response['Access-Control-Allow-Origin'] == '*'

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    @patch('io_storages.react_code_proxy.Project.objects.get')
    @patch('io_storages.react_code_proxy.get_user_model')
    def test_returns_400_for_path_traversal(self, mock_get_user_model, mock_project_get, setup):
        UserModel, mock_project = self._auth_mocks()
        mock_get_user_model.return_value = UserModel
        mock_project_get.return_value = mock_project

        user = MagicMock(id=1, active_organization_id=1)
        token, _ = generate_react_code_token(user, project_id=25)

        response = self._get(token, '/data/upload/../../../etc/passwd')

        assert response.status_code == 400
        assert response['Access-Control-Allow-Origin'] == '*'

    @override_settings(SECRET_KEY=TEST_SECRET_KEY)
    @patch('io_storages.react_code_proxy.Project.objects.get')
    @patch('io_storages.react_code_proxy.get_user_model')
    def test_returns_400_for_too_few_path_segments(self, mock_get_user_model, mock_project_get, setup):
        UserModel, mock_project = self._auth_mocks()
        mock_get_user_model.return_value = UserModel
        mock_project_get.return_value = mock_project

        user = MagicMock(id=1, active_organization_id=1)
        token, _ = generate_react_code_token(user, project_id=25)

        response = self._get(token, '/data/upload/only-three-parts')

        assert response.status_code == 400
        assert response['Access-Control-Allow-Origin'] == '*'
