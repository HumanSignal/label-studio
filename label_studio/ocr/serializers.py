# This file and its contents are licensed under the Apache License 2.0.
# Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
Serializers for OCR data structures.
"""

from rest_framework import serializers


class OcrTokenSerializer(serializers.Serializer):
    """Serializer for individual OCR tokens."""

    id = serializers.CharField(help_text='Unique token identifier')
    text = serializers.CharField(help_text='Token text content')
    bbox = serializers.ListField(
        child=serializers.FloatField(),
        min_length=4,
        max_length=4,
        help_text='Bounding box [x, y, width, height] normalized 0-1'
    )
    confidence = serializers.FloatField(
        required=False,
        min_value=0,
        max_value=1,
        help_text='OCR confidence score 0-1'
    )
    line_id = serializers.CharField(
        required=False,
        allow_null=True,
        help_text='Line grouping identifier'
    )
    block_id = serializers.CharField(
        required=False,
        allow_null=True,
        help_text='Block/paragraph grouping identifier'
    )
    font_size = serializers.FloatField(
        required=False,
        allow_null=True,
        help_text='Detected font size in points'
    )
    is_bold = serializers.BooleanField(
        required=False,
        default=False,
        help_text='Bold text flag'
    )
    is_italic = serializers.BooleanField(
        required=False,
        default=False,
        help_text='Italic text flag'
    )


class OcrPageMetaSerializer(serializers.Serializer):
    """Serializer for page metadata (without full tokens)."""

    page_index = serializers.IntegerField(min_value=0, help_text='0-based page number')
    width = serializers.FloatField(help_text='Page width in points')
    height = serializers.FloatField(help_text='Page height in points')
    token_count = serializers.IntegerField(min_value=0, help_text='Number of tokens')
    has_tokens = serializers.BooleanField(help_text='Whether tokens are available')


class OcrPageSerializer(serializers.Serializer):
    """Serializer for full page data including tokens."""

    page_index = serializers.IntegerField(min_value=0, help_text='0-based page number')
    width = serializers.FloatField(help_text='Page width in points')
    height = serializers.FloatField(help_text='Page height in points')
    rotation = serializers.IntegerField(
        required=False,
        default=0,
        help_text='Page rotation in degrees'
    )
    token_count = serializers.IntegerField(min_value=0, help_text='Number of tokens')
    tokens = OcrTokenSerializer(many=True)


class OcrDocumentMetaSerializer(serializers.Serializer):
    """Serializer for document-level OCR metadata."""

    task_id = serializers.IntegerField(help_text='Task ID')
    document_id = serializers.CharField(
        required=False,
        allow_null=True,
        help_text='External document identifier'
    )
    total_pages = serializers.IntegerField(min_value=0, help_text='Total page count')
    ocr_available = serializers.BooleanField(help_text='Whether OCR data is available')
    pages = OcrPageMetaSerializer(many=True)
    ocr_engine = serializers.CharField(
        required=False,
        allow_null=True,
        help_text='OCR engine used'
    )
    ocr_version = serializers.CharField(
        required=False,
        allow_null=True,
        help_text='OCR engine version'
    )


class OcrRegionQuerySerializer(serializers.Serializer):
    """Serializer for region token query parameters."""

    x = serializers.FloatField(min_value=0, max_value=1, help_text='Region X position (0-1)')
    y = serializers.FloatField(min_value=0, max_value=1, help_text='Region Y position (0-1)')
    width = serializers.FloatField(min_value=0, max_value=1, help_text='Region width (0-1)')
    height = serializers.FloatField(min_value=0, max_value=1, help_text='Region height (0-1)')
    threshold = serializers.FloatField(
        required=False,
        default=0.5,
        min_value=0,
        max_value=1,
        help_text='Minimum intersection ratio to include token'
    )


class OcrRegionResponseSerializer(serializers.Serializer):
    """Serializer for region token extraction response."""

    task_id = serializers.IntegerField()
    page_index = serializers.IntegerField()
    region = serializers.DictField()
    tokens = OcrTokenSerializer(many=True)
    suggested_text = serializers.CharField(help_text='Tokens joined in reading order')
    average_confidence = serializers.FloatField()
    reading_order = serializers.ListField(child=serializers.CharField())


class OcrImportSerializer(serializers.Serializer):
    """Serializer for OCR data import."""

    ocr_url = serializers.CharField(
        required=False,
        allow_null=True,
        help_text='URL to OCR JSON file in storage'
    )
    data = serializers.JSONField(
        required=False,
        allow_null=True,
        help_text='Inline OCR data'
    )
    overwrite = serializers.BooleanField(
        required=False,
        default=False,
        help_text='Overwrite existing OCR data'
    )

    def validate(self, attrs):
        """Ensure either ocr_url or data is provided."""
        if not attrs.get('ocr_url') and not attrs.get('data'):
            raise serializers.ValidationError(
                'Either ocr_url or data must be provided'
            )
        return attrs
