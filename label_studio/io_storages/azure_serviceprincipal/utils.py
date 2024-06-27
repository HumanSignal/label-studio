import logging
import os

from cryptography.fernet import Fernet

key = os.getenv('ENCRYPT_KEY', 'CEcJNMyffg-wHysgcW0xaYleNQt9o2LExxsEgB7GkD8=')
secret_encrypter = Fernet(key.encode())

logger = logging.getLogger(__name__)


def get_secured(value):
    if value is not None:
        # we decrypt the value
        value = secret_encrypter.decrypt(str(value).encode()).decode()
    return value


def set_secured(value):
    if value is not None:
        # we decrypt the value
        value = secret_encrypter.encrypt(str(value).encode()).decode()
    return value
