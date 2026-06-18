import pytest
from organizations.models import Organization
from users.tests.factories import UserFactory

from oidc_provider.auth import LabelStudioOIDCBackend


@pytest.mark.django_db
def test_create_user_sets_active_organization(oidc_enabled, oidc_claims):
    backend = LabelStudioOIDCBackend()
    user = backend.create_user(oidc_claims)
    assert user.active_organization is not None


@pytest.mark.django_db
def test_create_user_joins_existing_org(oidc_enabled, oidc_claims):
    owner = UserFactory()
    existing_org = Organization.create_organization(created_by=owner, title='Existing')
    backend = LabelStudioOIDCBackend()
    user = backend.create_user(oidc_claims)
    assert user.active_organization == existing_org
    assert Organization.objects.count() == 1


@pytest.mark.django_db
def test_create_user_creates_org_when_none_exist(oidc_enabled, oidc_claims):
    assert Organization.objects.count() == 0
    backend = LabelStudioOIDCBackend()
    user = backend.create_user(oidc_claims)
    assert Organization.objects.count() == 1
    assert user.active_organization is not None


@pytest.mark.django_db
def test_create_user_lowercases_email(oidc_enabled, oidc_claims):
    oidc_claims['email'] = 'Test.User@EXAMPLE.COM'
    backend = LabelStudioOIDCBackend()
    user = backend.create_user(oidc_claims)
    assert user.email == 'test.user@example.com'


@pytest.mark.django_db
def test_filter_users_by_claims_matches_existing_user_case_insensitive(oidc_enabled, oidc_claims):
    existing = UserFactory(email='test@example.com')
    oidc_claims['email'] = 'TEST@EXAMPLE.COM'
    backend = LabelStudioOIDCBackend()
    result = list(backend.filter_users_by_claims(oidc_claims))
    assert result == [existing]


@pytest.mark.django_db
def test_filter_users_by_claims_empty_email_returns_none(oidc_enabled, oidc_claims):
    oidc_claims['email'] = ''
    backend = LabelStudioOIDCBackend()
    result = backend.filter_users_by_claims(oidc_claims)
    assert not result.exists()


@pytest.mark.django_db
def test_update_user_syncs_name(oidc_enabled, oidc_claims):
    user = UserFactory(first_name='Old', last_name='Name')
    backend = LabelStudioOIDCBackend()
    backend.update_user(user, oidc_claims)
    user.refresh_from_db()
    assert user.first_name == 'Test'
    assert user.last_name == 'User'


@pytest.mark.django_db
def test_update_user_no_save_when_unchanged(oidc_enabled, oidc_claims):
    user = UserFactory(first_name='Test', last_name='User')
    backend = LabelStudioOIDCBackend()
    # Should not raise and should return user unchanged
    result = backend.update_user(user, oidc_claims)
    assert result == user


def test_verify_claims_rejects_email_verified_false(oidc_enabled, oidc_claims):
    oidc_claims['email_verified'] = False
    backend = LabelStudioOIDCBackend()
    assert backend.verify_claims(oidc_claims) is False


def test_verify_claims_accepts_email_verified_true(oidc_enabled, oidc_claims):
    backend = LabelStudioOIDCBackend()
    assert backend.verify_claims(oidc_claims) is True


def test_verify_claims_accepts_missing_email_verified(oidc_enabled, oidc_claims):
    del oidc_claims['email_verified']
    backend = LabelStudioOIDCBackend()
    assert backend.verify_claims(oidc_claims) is True


def test_verify_claims_accepts_string_true(oidc_enabled, oidc_claims):
    oidc_claims['email_verified'] = 'true'
    backend = LabelStudioOIDCBackend()
    assert backend.verify_claims(oidc_claims) is True


def test_verify_claims_accepts_string_True(oidc_enabled, oidc_claims):
    oidc_claims['email_verified'] = 'True'
    backend = LabelStudioOIDCBackend()
    assert backend.verify_claims(oidc_claims) is True


def test_verify_claims_rejects_string_false(oidc_enabled, oidc_claims):
    oidc_claims['email_verified'] = 'false'
    backend = LabelStudioOIDCBackend()
    assert backend.verify_claims(oidc_claims) is False


def test_verify_claims_rejects_integer_zero(oidc_enabled, oidc_claims):
    oidc_claims['email_verified'] = 0
    backend = LabelStudioOIDCBackend()
    assert backend.verify_claims(oidc_claims) is False
