# This file and its contents are licensed under the Apache License 2.0.
# Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
OCR Django app configuration.
"""

from django.apps import AppConfig


class OcrConfig(AppConfig):
    """Configuration for the OCR module."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ocr'
    verbose_name = 'OCR Token Management'

    def ready(self):
        """Perform app initialization on Django startup."""
        pass  # Import signals here if needed in the future
