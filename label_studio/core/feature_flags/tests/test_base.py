from label_studio.core.feature_flags.base import flag_set
from label_studio.core.feature_flags.utils import get_user_repr_from_organization


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
