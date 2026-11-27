import gzip
import json
import queue

import pytest
import responses
from core.utils import contextlog
from core.utils.contextlog import ContextLog, encode_payload


def _decode_body(request):
    body = request.body
    if request.headers.get('Content-Encoding') == 'gzip':
        body = gzip.decompress(body)
    return json.loads(body)


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
    assert 'env' not in _decode_body(responses.calls[0].request)


def _secured_view_payload(view_name):
    return {
        'view_name': view_name,
        'method': 'POST',
        'status_code': 200,
        'json': {'email': 'worker@example.com', 'password': 'qNpC-opxvYm.ttg4'},
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
    assert unregistered['json'] == {'email': 'worker@example.com', 'password': 'qNpC-opxvYm.ttg4'}

    # Redacted once contributed via settings.
    with override_settings(ADDITIONAL_CONTEXTLOG_SECURED_VIEWS=('extra-secured-view',)):
        registered = _secured_view_payload('extra-secured-view')
        ContextLog()._secure_data(registered, request=None)
        assert registered['json'] is None


def test_encode_payload_small_is_plain_json():
    body, headers = encode_payload({'view_name': 'x', 'json': {'a': 1}})

    assert 'Content-Encoding' not in headers
    assert headers['Content-Type'] == 'application/json'
    assert json.loads(body) == {'view_name': 'x', 'json': {'a': 1}}


def test_encode_payload_large_is_gzipped():
    payload = {'view_name': 'x', 'json': {'text': 'a' * 5000}}

    body, headers = encode_payload(payload)

    assert headers['Content-Encoding'] == 'gzip'
    assert len(body) < 1000
    assert json.loads(gzip.decompress(body)) == payload


def test_encode_payload_oversized_drops_json_and_response(monkeypatch):
    monkeypatch.setattr(contextlog, 'MAX_PAYLOAD_BYTES', 1000)
    payload = {'view_name': 'x', 'json': {'text': 'a' * 5000}, 'response': {'r': 'b' * 5000}}

    body, headers = encode_payload(payload)

    decoded = json.loads(gzip.decompress(body) if headers.get('Content-Encoding') else body)
    assert decoded == {'view_name': 'x', 'json': None, 'response': None, 'truncated': True}
    # The caller's payload is left untouched.
    assert payload['json'] == {'text': 'a' * 5000}


@responses.activate
def test_sender_reuses_one_session_and_sends_gzip():
    responses.add(responses.POST, contextlog.CONTEXTLOG_URL, status=200)
    sender = contextlog._Sender()

    for i in range(3):
        sender.submit(lambda i=i: {'n': i, 'pad': 'a' * 2000})
    sender._queue.join()

    assert len(responses.calls) == 3
    assert sorted(_decode_body(c.request)['n'] for c in responses.calls) == [0, 1, 2]
    assert all(c.request.headers['Content-Encoding'] == 'gzip' for c in responses.calls)


def test_sender_drops_events_when_queue_is_full(monkeypatch):
    monkeypatch.setattr(contextlog, 'QUEUE_MAXSIZE', 1)
    sender = contextlog._Sender()
    # Start the sender, then swap in a queue the worker does not read, so it stays full.
    sender._ensure_started()
    sender._queue = queue.Queue(maxsize=1)

    sender.submit(lambda: None)
    sender.submit(lambda: None)  # dropped, does not block or raise

    assert sender._queue.qsize() == 1


def test_sender_restarts_after_fork(monkeypatch):
    sender = contextlog._Sender()
    sender._ensure_started()
    first_queue = sender._queue

    monkeypatch.setattr(contextlog.os, 'getpid', lambda: -1)
    sender._ensure_started()

    assert sender._queue is not first_queue
