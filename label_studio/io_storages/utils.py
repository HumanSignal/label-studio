"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import re
from dataclasses import dataclass
from typing import Union

logger = logging.getLogger(__name__)

# Put storage prefixes here
uri_regex = r"([\"'])(?P<uri>(?P<storage>{})://[^\1=]*)\1"


@dataclass
class BucketURI:
    bucket: str
    path: str
    scheme: str


def get_uri_via_regex(data, prefixes=('s3', 'gs')) -> tuple[Union[str, None], Union[str, None]]:
    data = str(data).strip()
    middle_check = False

    # make the fastest startswith check first
    for prefix in prefixes:
        if data.startswith(prefix):
            return data, prefix

        # another fast middle-check before regex run
        if prefix + ':' in data:
            middle_check = True

    # no prefixes in data, exit
    if middle_check is False:
        return None, None

    # make complex regex check for data like <a href="s3://test/123.jpg">
    try:
        uri_regex_prepared = uri_regex.format('|'.join(prefixes))
        r_match = re.search(uri_regex_prepared, data)
    except Exception as exc:
        logger.error(f"Can't parse task.data to match URI. Reason: {exc}", exc_info=True)
        return None, None
    else:
        if r_match is None:
            logger.warning("Can't parse task.data to match URI. Reason: Match is not found.")
            return None, None
    return r_match.group('uri'), r_match.group('storage')


def parse_bucket_uri(value: object, storage) -> Union[BucketURI, None]:
    if not value:
        return None

    uri, _ = get_uri_via_regex(value, prefixes=(storage.url_scheme,))
    if not uri:
        return None

    try:
        scheme, rest = uri.split('://', 1)
        bucket, path = rest.split('/', 1)
    except ValueError:
        return None

    return BucketURI(bucket=bucket, path=path, scheme=scheme)


def storage_can_resolve_bucket_url(storage, url) -> bool:
    if not storage.can_resolve_scheme(url):
        return False

    uri = parse_bucket_uri(url, storage)
    if not uri:
        return False

    storage_bucket: str | None = getattr(storage, 'bucket', None) or getattr(storage, 'container', None)
    if storage_bucket != uri.bucket:
        return False

    if storage.prefix and not uri.path.startswith(storage.prefix):
        return False

    return True
