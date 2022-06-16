"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from rest_framework.exceptions import APIException, ValidationError
from rest_framework import status
from lxml.etree import XMLSyntaxError


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


class LabelStudioErrorSentryIgnored(Exception):
    pass


class LabelStudioAPIExceptionSentryIgnored(LabelStudioAPIException):
    pass


class LabelStudioValidationErrorSentryIgnored(ValidationError):
    pass


class LabelStudioXMLSyntaxErrorSentryIgnored(Exception):
    pass


class ImportFromLocalIPError(LabelStudioAPIException):
    default_detail = 'Importing from local IP is not allowed'
    status_code = status.HTTP_403_FORBIDDEN


class MLModelLocalIPError(LabelStudioAPIException):
    default_detail = 'Adding models with local IP is not allowed'
    status_code = status.HTTP_403_FORBIDDEN
