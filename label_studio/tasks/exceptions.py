from rest_framework import status

from core.utils.exceptions import LabelStudioAPIException


class AnnotationDuplicateError(LabelStudioAPIException):
    status_code = status.HTTP_409_CONFLICT  # type: ignore[assignment]
    default_detail = 'Annotation with this unique id already exists'
