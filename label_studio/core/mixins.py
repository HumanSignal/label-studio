"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

logger = logging.getLogger(__name__)


class DummyModelMixin():
    def has_permission(self, user):
        return True
