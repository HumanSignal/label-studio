import os
import stat

import pytest
from core.utils.secret_key import generate_secret_key_if_missing

pytestmark = pytest.mark.skipif(os.name == 'nt', reason='POSIX file modes')


def _mode(path):
    return stat.S_IMODE(os.stat(path).st_mode)


@pytest.fixture
def no_secret_key_env(monkeypatch):
    monkeypatch.delenv('SECRET_KEY', raising=False)
    old_umask = os.umask(0o022)
    yield
    os.umask(old_umask)
    os.environ.pop('SECRET_KEY', None)


def test_generated_env_file_is_owner_only(tmp_path, no_secret_key_env):
    secret = generate_secret_key_if_missing(str(tmp_path))

    env_file = tmp_path / '.env'
    assert f'SECRET_KEY={secret}' in env_file.read_text()
    assert _mode(env_file) == 0o600


def test_existing_world_readable_env_file_is_restricted(tmp_path, no_secret_key_env):
    env_file = tmp_path / '.env'
    env_file.write_text('SECRET_KEY=existing-secret\n')
    os.chmod(env_file, 0o644)

    assert generate_secret_key_if_missing(str(tmp_path)) == 'existing-secret'
    assert _mode(env_file) == 0o600
