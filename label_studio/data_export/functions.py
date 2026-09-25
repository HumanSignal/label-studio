"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for
copyright information and LICENSE for a copy of the license.
"""

from typing import Optional

import requests
from core.utils.io import ssrf_safe_session
from django.conf import settings


def get_export_hostname(request) -> Optional[str]:
    """Label Studio base URL for the export converter, which sends the organization owner's token there.

    Returns None when there is no trustworthy value: the converter then skips media it would have to fetch
    from Label Studio.
    """
    # With DOMAIN_FROM_REQUEST HOSTNAME is only a subpath
    if settings.HOSTNAME and not settings.DOMAIN_FROM_REQUEST:
        return settings.HOSTNAME
    # A Host header is attacker-controlled unless ALLOWED_HOSTS or the DOMAIN_FROM_REQUEST proxy pins it
    if settings.DOMAIN_FROM_REQUEST or '*' not in settings.ALLOWED_HOSTS:
        return request.build_absolute_uri('/')
    return None


def converter_http_session(hostname: Optional[str]) -> Optional[requests.Session]:
    """HTTP session for the export converter's media downloads, or None to use plain requests.

    Task data can point media at any URL, and the fetched bytes end up in the export archive.
    """
    if not settings.SSRF_PROTECTION_ENABLED:
        return None
    return ssrf_safe_session(trusted_origin=hostname)
