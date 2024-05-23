"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

try:
    from requests._internal_utils import HEADER_VALIDATORS
    from tavern.util.formatted_str import FormattedString

    HEADER_VALIDATORS[FormattedString] = HEADER_VALIDATORS[str]
except ImportError:
    print('\n Your requests version is under 2.28 and it does not support HEADER_VALIDATORS. \n')
