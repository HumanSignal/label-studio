from core.utils.exceptions import LabelStudioAPIException
from rest_framework import status


class LabelBulkUpdateError(LabelStudioAPIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
