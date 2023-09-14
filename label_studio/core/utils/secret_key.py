import logging
import os
import environ
from django.core.management.utils import get_random_secret_key


logger = logging.getLogger(__name__)


def generate_secret_key_if_missing(data_dir: str) -> str:
    env_key = 'SECRET_KEY'
    env = environ.Env()
    env_filepath = os.path.join(data_dir, '.env')
    environ.Env.read_env(env_filepath)

    if existing_secret := env.str(env_key, ""):
        return existing_secret

    logger.warning(f'Warning: {env_key} not found in environment variables. Will generate a random key.')
    new_secret = get_random_secret_key()
    try:
        with open(env_filepath, 'a') as f:
            f.write(f'\n{env_key}={new_secret}\n') # nosec
    except Exception as e:
        logger.warning(f'Warning: failed to write {env_key} to .env file: {e}, new key will be regenerated on every server restart. If this key is used for signing, it will invalidate all existing sessions or tokens. Please set {env_key} in your environment variables to avoid this warning.')

    os.environ[env_key] = new_secret
    return new_secret
