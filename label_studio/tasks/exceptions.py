from core.utils.exceptions import LabelStudioAPIException
from rest_framework import status


class AnnotationDuplicateError(LabelStudioAPIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Annotation with this unique id already exists'
