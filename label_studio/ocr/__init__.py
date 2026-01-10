# This file and its contents are licensed under the Apache License 2.0.
# Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
OCR module for PDF document annotation with text token support.

This module provides:
- OCR token data retrieval from storage backends
- Token-to-region intersection utilities
- Reading order sorting algorithms
- REST API endpoints for frontend integration
"""

default_app_config = 'ocr.apps.OcrConfig'
