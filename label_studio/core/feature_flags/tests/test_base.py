from unittest.mock import patch

from label_studio.core.feature_flags.base import flag_set, flag_set_for_org_id
from label_studio.core.feature_flags.utils import get_user_repr_from_organization, get_user_repr_from_organization_id


def test_get_user_repr_from_organization_owner_email_and_org_id(django_user_model):
    # Create a minimal organization-like object
    class Org:
        def __init__(self, id, email):
            self.id = id

            class CreatedBy:
                def __init__(self, email):
                    self.email = email

            self.created_by = CreatedBy(email)

    org = Org(123, 'owner@example.com')

    ctx = get_user_repr_from_organization(org)

    assert ctx['key'] == 'owner@example.com'
    assert ctx['custom']['organization'] == 'owner@example.com'
    assert ctx['custom']['organization_id'] == 123


def test_flag_set_with_organization_context_env_override(monkeypatch, settings):
    # Ensure offline mode/env control for deterministic behavior
    settings.FEATURE_FLAGS_OFFLINE = True

    # Use env override path for flag resolution
    monkeypatch.setenv('fflag_feat_test_org_targeting', 'true')

    class Org:
        def __init__(self, id, email):
            self.id = id

            class CreatedBy:
                def __init__(self, email):
                    self.email = email

            self.created_by = CreatedBy(email)

    org = Org(42, 'owner@example.com')

    assert flag_set('fflag_feat_test_org_targeting', organization=org, override_system_default=False) is True

    # Unset env should fall back to override_system_default=False
    monkeypatch.delenv('fflag_feat_test_org_targeting', raising=False)
    assert flag_set('fflag_feat_test_org_targeting', organization=org, override_system_default=False) is False


def test_get_user_repr_from_organization_id_does_not_require_owner():
    """Organization-ID targeting must not require an owner object or email."""
    context = get_user_repr_from_organization_id(123)

    assert context == {
        'key': 'organization:123',
        'custom': {'organization': None, 'organization_id': 123},
    }


@patch('label_studio.core.feature_flags.base.client.variation', return_value=True)
def test_flag_set_for_org_id_uses_owner_free_context(mock_variation, monkeypatch, settings):
    """Flag evaluation must pass the owner-free organization context to LaunchDarkly."""
    settings.FEATURE_FLAGS_OFFLINE = False
    settings.FEATURE_FLAGS_DEFAULT_VALUE = False
    monkeypatch.delenv('fflag_feat_org_background_jobs_short', raising=False)

    assert flag_set_for_org_id('fflag_feat_org_background_jobs_short', 123) is True
    mock_variation.assert_called_once_with(
        'fflag_feat_org_background_jobs_short',
        {
            'key': 'organization:123',
            'custom': {'organization': None, 'organization_id': 123},
        },
        False,
    )
