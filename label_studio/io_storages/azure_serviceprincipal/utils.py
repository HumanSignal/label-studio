import fnmatch
import logging
import os
import re

from azure.storage.blob import BlobServiceClient
from cryptography.fernet import Fernet
from core.utils.params import get_env
from django.conf import settings

logger = logging.getLogger(__name__)



key = os.getenv('ENCRYPT_KEY', 'CEcJNMyffg-wHysgcW0xaYleNQt9o2LExxsEgB7GkD8=')
secret_encrypter = Fernet(key.encode())

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
