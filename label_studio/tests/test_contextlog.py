import json

import pytest
import responses
from core.utils.contextlog import ContextLog


@responses.activate
@pytest.mark.django_db
def test_contextlog(business_client, contextlog_test_config):
    responses.add(
        responses.POST,
        'https://tele.labelstud.io',
        json={'ok': 'true'},
        status=201,
    )
    r = business_client.get('/api/users/')

    responses.assert_call_count('https://tele.labelstud.io', 1)
    assert responses.calls
    assert r.status_code == 200
    assert 'env' not in json.loads(responses.calls[0].request.body)


def _secured_view_payload(view_name):
    return {
        'view_name': view_name,
        'method': 'POST',
        'status_code': 200,
        'json': {'email': 'worker@example.com', 'password': '12345678'},
    }


def test_contextlog_redacts_builtin_secured_view_post_payload(monkeypatch):
    monkeypatch.setattr(ContextLog, '_log_payloads', {})
    payload = _secured_view_payload('user-signup')

    ContextLog()._secure_data(payload, request=None)

    assert payload['json'] is None


def test_contextlog_redacts_additional_secured_views_from_settings(monkeypatch):
    """Downstream apps register extra secured views via ADDITIONAL_CONTEXTLOG_SECURED_VIEWS."""
    from django.test import override_settings

    monkeypatch.setattr(ContextLog, '_log_payloads', {})

    # Not redacted by OSS default.
    unregistered = _secured_view_payload('extra-secured-view')
    ContextLog()._secure_data(unregistered, request=None)
    assert unregistered['json'] == {'email': 'worker@example.com', 'password': '12345678'}

    # Redacted once contributed via settings.
    with override_settings(ADDITIONAL_CONTEXTLOG_SECURED_VIEWS=('extra-secured-view',)):
        registered = _secured_view_payload('extra-secured-view')
        ContextLog()._secure_data(registered, request=None)
        assert registered['json'] is None
