"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import glob
import io
import ipaddress
import itertools
import os
import shutil
import socket
from contextlib import contextmanager
from tempfile import mkdtemp, mkstemp

import pkg_resources
import requests
import ujson as json
import yaml
from appdirs import user_cache_dir, user_config_dir, user_data_dir
from django.conf import settings
from django.core.files.temp import NamedTemporaryFile
from urllib3.util import parse_url

# full path import results in unit test failures
from .exceptions import InvalidUploadUrlError

_DIR_APP_NAME = 'label-studio'


def good_path(path):
    return os.path.abspath(os.path.expanduser(path))


def find_node(package_name, node_path, node_type):
    assert node_type in ('dir', 'file', 'any')
    basedir = pkg_resources.resource_filename(package_name, '')
    node_path = os.path.join(*node_path.split('/'))  # linux to windows compatibility
    search_by_path = '/' in node_path or '\\' in node_path

    for path, dirs, filenames in os.walk(basedir):
        if node_type == 'file':
            nodes = filenames
        elif node_type == 'dir':
            nodes = dirs
        else:
            nodes = filenames + dirs
        if search_by_path:
            for found_node in nodes:
                found_node = os.path.join(path, found_node)
                if found_node.endswith(node_path):
                    return found_node
        elif node_path in nodes:
            return os.path.join(path, node_path)
    else:
        raise IOError('Could not find "%s" at package "%s"' % (node_path, basedir))


def find_file(file):
    return find_node('label_studio', file, 'file')


def find_dir(directory):
    return find_node('label_studio', directory, 'dir')


@contextmanager
def get_temp_file():
    fd, path = mkstemp()
    yield path
    os.close(fd)


@contextmanager
def get_temp_dir():
    dirpath = mkdtemp()
    yield dirpath
    shutil.rmtree(dirpath)


def get_config_dir():
    config_dir = user_config_dir(appname=_DIR_APP_NAME)
    try:
        os.makedirs(config_dir, exist_ok=True)
    except OSError:
        pass
    return config_dir


def get_data_dir():
    data_dir = user_data_dir(appname=_DIR_APP_NAME)
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


def get_cache_dir():
    cache_dir = user_cache_dir(appname=_DIR_APP_NAME)
    os.makedirs(cache_dir, exist_ok=True)
    return cache_dir


def delete_dir_content(dirpath):
    for f in glob.glob(dirpath + '/*'):
        remove_file_or_dir(f)


def remove_file_or_dir(path):
    if os.path.isfile(path):
        os.remove(path)
    elif os.path.isdir(path):
        shutil.rmtree(path)


def get_all_files_from_dir(d):
    out = []
    for name in os.listdir(d):
        filepath = os.path.join(d, name)
        if os.path.isfile(filepath):
            out.append(filepath)
    return out


def iter_files(root_dir, ext):
    for root, _, files in os.walk(root_dir):
        for f in files:
            if f.lower().endswith(ext):
                yield os.path.join(root, f)


def json_load(file, int_keys=False):
    with io.open(file, encoding='utf8') as f:
        data = json.load(f)
        if int_keys:
            return {int(k): v for k, v in data.items()}
        else:
            return data


def read_yaml(filepath):
    if not os.path.exists(filepath):
        filepath = find_file(filepath)
    with io.open(filepath, encoding='utf-8') as f:
        data = yaml.load(f, Loader=yaml.FullLoader)  # nosec
    return data


def path_to_open_binary_file(filepath) -> io.BufferedReader:
    """
    Copy the file at filepath to a named temporary file and return that file object.
    Unusually, this function deliberately doesn't close the file; the caller is responsible for this.
    """
    tmp = NamedTemporaryFile()
    shutil.copy2(filepath, tmp.name)
    return tmp


def get_all_dirs_from_dir(d):
    out = []
    for name in os.listdir(d):
        filepath = os.path.join(d, name)
        if os.path.isdir(filepath):
            out.append(filepath)
    return out


class SerializableGenerator(list):
    """Generator that is serializable by JSON"""

    def __init__(self, iterable):
        tmp_body = iter(iterable)
        try:
            self._head = iter([next(tmp_body)])
            self.append(tmp_body)
        except StopIteration:
            self._head = []

    def __iter__(self):
        return itertools.chain(self._head, *self[:1])


def validate_upload_url(url, block_local_urls=True):
    """Utility function for defending against SSRF attacks. Raises
        - InvalidUploadUrlError if the url is not HTTP[S], or if block_local_urls is enabled
          and the URL resolves to a local address.
        - LabelStudioApiException if the hostname cannot be resolved

    :param url: Url to be checked for validity/safety,
    :param block_local_urls: Whether urls that resolve to local/private networks should be allowed.
    """

    parsed_url = parse_url(url)

    if parsed_url.scheme not in ('http', 'https'):
        raise InvalidUploadUrlError

    domain = parsed_url.host
    try:
        ip = socket.gethostbyname(domain)
    except socket.error:
        from core.utils.exceptions import LabelStudioAPIException

        raise LabelStudioAPIException(f"Can't resolve hostname {domain}")

    if block_local_urls:
        validate_ip(ip)


def validate_ip(ip: str) -> None:
    """If settings.USE_DEFAULT_BANNED_SUBNETS is True, this function checks
    if an IP is reserved for any of the reasons in
    https://en.wikipedia.org/wiki/Reserved_IP_addresses
    and raises an exception if so. Additionally, if settings.USER_ADDITIONAL_BANNED_SUBNETS
    is set, it will also check against those subnets.

    If settings.USE_DEFAULT_BANNED_SUBNETS is False, this function will only check
    the IP against settings.USER_ADDITIONAL_BANNED_SUBNETS. Turning off the default
    subnets is **risky** and should only be done if you know what you're doing.

    :param ip: IP address to be checked.
    """

    default_banned_subnets = [
        '0.0.0.0/8',  # current network
        '10.0.0.0/8',  # private network
        '100.64.0.0/10',  # shared address space
        '127.0.0.0/8',  # loopback
        '169.254.0.0/16',  # link-local
        '172.16.0.0/12',  # private network
        '192.0.0.0/24',  # IETF protocol assignments
        '192.0.2.0/24',  # TEST-NET-1
        '192.88.99.0/24',  # Reserved, formerly ipv6 to ipv4 relay
        '192.168.0.0/16',  # private network
        '198.18.0.0/15',  # network interconnect device benchmark testing
        '198.51.100.0/24',  # TEST-NET-2
        '203.0.113.0/24',  # TEST-NET-3
        '224.0.0.0/4',  # multicast
        '233.252.0.0/24',  # MCAST-TEST-NET
        '240.0.0.0/4',  # reserved for future use
        '255.255.255.255/32',  # limited broadcast
        '::/128',  # unspecified address
        '::1/128',  # loopback
        '::ffff:0:0/96',  # IPv4-mapped address
        '::ffff:0:0:0/96',  # IPv4-translated address
        '64:ff9b::/96',  # IPv4/IPv6 translation
        '64:ff9b:1::/48',  # IPv4/IPv6 translation
        '100::/64',  # discard prefix
        '2001:0000::/32',  # Teredo tunneling
        '2001:20::/28',  # ORCHIDv2
        '2001:db8::/32',  # documentation
        '2002::/16',  # 6to4
        'fc00::/7',  # unique local
        'fe80::/10',  # link-local
        'ff00::/8',  # multicast
    ]

    banned_subnets = [
        *(default_banned_subnets if settings.USE_DEFAULT_BANNED_SUBNETS else []),
        *(settings.USER_ADDITIONAL_BANNED_SUBNETS or []),
    ]

    for subnet in banned_subnets:
        if ipaddress.ip_address(ip) in ipaddress.ip_network(subnet):
            raise InvalidUploadUrlError(f'URL resolves to a reserved network address (block: {subnet})')


def ssrf_safe_get(url, *args, **kwargs):
    validate_upload_url(url, block_local_urls=settings.SSRF_PROTECTION_ENABLED)
    # Reason for #nosec: url has been validated as SSRF safe by the
    # validation check above.
    response = requests.get(url, *args, **kwargs)   # nosec

    # second check for SSRF for prevent redirect and dns rebinding attacks
    if settings.SSRF_PROTECTION_ENABLED:
        response_ip = response.raw._connection.sock.getpeername()[0]
        validate_ip(response_ip)
    return response
