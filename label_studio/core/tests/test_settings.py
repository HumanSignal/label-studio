import json
import os
import subprocess
import sys

import pytest
from core.settings import base
from django.core.exceptions import ImproperlyConfigured


def _clear_secure_proxy_ssl_header_env(monkeypatch):
    monkeypatch.delenv('SECURE_PROXY_SSL_HEADER', raising=False)
    monkeypatch.delenv('LABEL_STUDIO_SECURE_PROXY_SSL_HEADER', raising=False)
    monkeypatch.delenv('HEARTEX_SECURE_PROXY_SSL_HEADER', raising=False)


def test_secure_proxy_ssl_header_env_is_parsed(monkeypatch):
    """SECURE_PROXY_SSL_HEADER env uses Django's required two-item tuple shape."""
    _clear_secure_proxy_ssl_header_env(monkeypatch)
    monkeypatch.setenv('SECURE_PROXY_SSL_HEADER', 'HTTP_X_FORWARDED_PROTO,https')

    assert base._get_secure_proxy_ssl_header() == ('HTTP_X_FORWARDED_PROTO', 'https')


def test_secure_proxy_ssl_header_env_strips_whitespace(monkeypatch):
    """Whitespace around the comma-separated env values does not affect parsing."""
    _clear_secure_proxy_ssl_header_env(monkeypatch)
    monkeypatch.setenv('SECURE_PROXY_SSL_HEADER', ' HTTP_X_FORWARDED_PROTO, https ')

    assert base._get_secure_proxy_ssl_header() == ('HTTP_X_FORWARDED_PROTO', 'https')


@pytest.mark.parametrize(
    'value',
    [
        'HTTP_X_FORWARDED_PROTO',
        'HTTP_X_FORWARDED_PROTO,',
        ',https',
        'HTTP_X_FORWARDED_PROTO,https,extra',
    ],
)
def test_secure_proxy_ssl_header_env_rejects_invalid_values(monkeypatch, value):
    """Invalid proxy header config fails clearly instead of silently misconfiguring Django."""
    _clear_secure_proxy_ssl_header_env(monkeypatch)
    monkeypatch.setenv('SECURE_PROXY_SSL_HEADER', value)

    with pytest.raises(ImproperlyConfigured, match='SECURE_PROXY_SSL_HEADER must be configured'):
        base._get_secure_proxy_ssl_header()


def test_secure_proxy_ssl_header_env_defaults_to_none(monkeypatch):
    """Unconfigured deployments keep Django's default behavior."""
    _clear_secure_proxy_ssl_header_env(monkeypatch)

    assert base._get_secure_proxy_ssl_header() is None


def test_proxy_env_vars_populate_settings_at_startup():
    """Proxy env vars are written into Django settings when the settings module imports."""
    env = os.environ.copy()
    for key in [
        'SECURE_PROXY_SSL_HEADER',
        'LABEL_STUDIO_SECURE_PROXY_SSL_HEADER',
        'HEARTEX_SECURE_PROXY_SSL_HEADER',
        'USE_X_FORWARDED_HOST',
        'LABEL_STUDIO_USE_X_FORWARDED_HOST',
        'HEARTEX_USE_X_FORWARDED_HOST',
        'USE_X_FORWARDED_PORT',
        'LABEL_STUDIO_USE_X_FORWARDED_PORT',
        'HEARTEX_USE_X_FORWARDED_PORT',
    ]:
        env.pop(key, None)
    env.update(
        {
            'PYTHONPATH': os.pathsep.join(path for path in ['label_studio', env.get('PYTHONPATH', '')] if path),
            'SECURE_PROXY_SSL_HEADER': 'HTTP_X_FORWARDED_PROTO,https',
            'USE_X_FORWARDED_HOST': 'true',
            'USE_X_FORWARDED_PORT': 'true',
        }
    )

    script = """
import json
from core.settings import base

print(json.dumps({
    'secure_proxy_ssl_header': base.SECURE_PROXY_SSL_HEADER,
    'use_x_forwarded_host': base.USE_X_FORWARDED_HOST,
    'use_x_forwarded_port': base.USE_X_FORWARDED_PORT,
}))
"""
    result = subprocess.run([sys.executable, '-c', script], check=True, capture_output=True, env=env, text=True)
    settings_values = json.loads(result.stdout.strip().splitlines()[-1])

    assert settings_values == {
        'secure_proxy_ssl_header': ['HTTP_X_FORWARDED_PROTO', 'https'],
        'use_x_forwarded_host': True,
        'use_x_forwarded_port': True,
    }
