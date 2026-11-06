from unittest.mock import patch


def test_disable_update_check_env_var(monkeypatch):
    """LABEL_STUDIO_DISABLE_UPDATE_CHECK=true must suppress the pypi network call."""
    from django.conf import settings as django_settings

    monkeypatch.setattr(django_settings, 'LATEST_VERSION_CHECK', False)

    with patch('label_studio.core.utils.common.get_latest_version') as mock_get:
        from label_studio.core.utils.common import check_for_the_latest_version

        check_for_the_latest_version(print_message=False)
        mock_get.assert_not_called()
