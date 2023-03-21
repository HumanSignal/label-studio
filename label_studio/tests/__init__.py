"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from requests._internal_utils import HEADER_VALIDATORS
from tavern.util.formatted_str import FormattedString

HEADER_VALIDATORS[FormattedString] = HEADER_VALIDATORS[str]