"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import re

logger = logging.getLogger(__name__)

# Put storage prefixes here
uri_regex = r"[\s\'\"]?(?P<uri>(?P<storage>{})://([^/\s]+)/(.*?[^/\s]+/?[^\s\'\">]+))[\s\'\"]?"


def get_uri_via_regex(data, prefixes=('s3', 'gs')):
    try:
        uri_regex_prepared = uri_regex.format('|'.join(prefixes))
        r_match = re.search(uri_regex_prepared, data)
    except Exception as exc:
        logger.error(f'{data} can\'t be processed. Reason: {exc}', exc_info=True)
        return None, None
    else:
        if r_match is None:
            logger.warning(
                "{data} does not match uri regex {uri_regex}".format(data=data, uri_regex=uri_regex))
            return None, None
    return r_match.group("uri"), r_match.group("storage")
