"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import logging
import io

from django.http import FileResponse
from django.conf import settings
from core.permissions import IsBusiness, view_with_auth

from .models import FileUpload

logger = logging.getLogger(__name__)


@view_with_auth(['GET'], (IsBusiness,))
def get_uploaded_file(request, filename):
    logger.debug(f'Fetch uploaded file {filename} by user {request.user}')
    file_upload = FileUpload.objects.get(file=os.path.join(settings.UPLOAD_DIR, filename))
    with open(file_upload.file.path, mode='rb') as f:
        content = f.read()
    return FileResponse(io.BytesIO(content), as_attachment=True)
