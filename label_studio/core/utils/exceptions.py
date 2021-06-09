"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from rest_framework.exceptions import APIException
from rest_framework import status


class LabelStudioError(Exception):
    pass


class LabelStudioAPIException(APIException):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'Unknown error'


class LabelStudioDatabaseException(LabelStudioAPIException):
    default_detail = 'Error executing database query'


class LabelStudioDatabaseLockedException(LabelStudioAPIException):
    default_detail = "Sqlite <a href='https://docs.djangoproject.com/en/3.1/ref/databases/#database-is-locked-errors'>doesn't operate well</a> on multiple transactions. \
    Please be patient and try update your pages, or ping us on Slack to  get more about production-ready db"


class ProjectExistException(LabelStudioAPIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'Project with the same title already exists'
