from rest_framework import status

from core.utils.exceptions import LabelStudioAPIException


class LabelBulkUpdateError(LabelStudioAPIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
