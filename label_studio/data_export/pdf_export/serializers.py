"""DRF Serializers for PDF ML Export.

This module provides Django REST Framework serializers for the PDF export
API endpoints, including export options and job status.
"""

from rest_framework import serializers

from . import DEFAULT_DPI, DEFAULT_INCLUDE_PAGE_IMAGES, DEFAULT_INCLUDE_W3C


class TaskFilterOptionsSerializer(serializers.Serializer):
    """Serializer for task filtering options."""

    only_with_annotations = serializers.BooleanField(
        default=True,
        help_text="Only export tasks that have annotations",
    )
    task_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Specific task IDs to export (if not provided, exports all matching tasks)",
    )


class PdfExportParamSerializer(serializers.Serializer):
    """Serializer for PDF ML export parameters.

    Extends the base export parameters with PDF-specific options
    for DPI, page images, and W3C format.
    """

    format = serializers.ChoiceField(
        choices=[("pdf_ml", "PDF ML Export"), ("pdf_ml_w3c", "PDF ML Export with W3C")],
        default="pdf_ml",
        help_text="Export format identifier",
    )
    dpi = serializers.IntegerField(
        default=DEFAULT_DPI,
        min_value=72,
        max_value=600,
        help_text="DPI for rendered page images (72-600, default 200)",
    )
    include_page_images = serializers.BooleanField(
        default=DEFAULT_INCLUDE_PAGE_IMAGES,
        help_text="Include PNG page renders in export bundle",
    )
    include_w3c = serializers.BooleanField(
        default=DEFAULT_INCLUDE_W3C,
        help_text="Include W3C Web Annotation format output",
    )
    task_filter = TaskFilterOptionsSerializer(
        required=False,
        help_text="Task filtering options",
    )

    def validate_dpi(self, value):
        """Validate DPI is within acceptable range."""
        if value < 72:
            raise serializers.ValidationError("DPI must be at least 72")
        if value > 600:
            raise serializers.ValidationError("DPI must not exceed 600")
        return value


class ExportProgressSerializer(serializers.Serializer):
    """Serializer for export progress information."""

    total_tasks = serializers.IntegerField(read_only=True)
    processed_tasks = serializers.IntegerField(read_only=True)
    total_pages = serializers.IntegerField(read_only=True)
    processed_pages = serializers.IntegerField(read_only=True)
    total_annotations = serializers.IntegerField(read_only=True)
    processed_annotations = serializers.IntegerField(read_only=True)
    percent_complete = serializers.FloatField(read_only=True)


class ExportErrorSerializer(serializers.Serializer):
    """Serializer for export error information."""

    doc_id = serializers.CharField(read_only=True)
    task_id = serializers.IntegerField(read_only=True)
    error_type = serializers.CharField(read_only=True)
    error_message = serializers.CharField(read_only=True)
    timestamp = serializers.CharField(read_only=True)


class PdfExportJobSerializer(serializers.Serializer):
    """Serializer for PDF export job status.

    Used for GET /projects/{id}/exports/pdf-ml/{export_id} responses.
    """

    id = serializers.UUIDField(read_only=True, source="export_id")
    project_id = serializers.IntegerField(read_only=True)
    status = serializers.ChoiceField(
        choices=[
            ("queued", "Queued"),
            ("in_progress", "In Progress"),
            ("completed", "Completed"),
            ("partial", "Partial"),
            ("failed", "Failed"),
        ],
        read_only=True,
    )
    progress = ExportProgressSerializer(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    created_by = serializers.IntegerField(read_only=True, required=False)
    started_at = serializers.DateTimeField(read_only=True, required=False)
    finished_at = serializers.DateTimeField(read_only=True, required=False)
    download_url = serializers.URLField(read_only=True, required=False)
    error_count = serializers.IntegerField(read_only=True, required=False)


class PdfExportCreateSerializer(serializers.Serializer):
    """Serializer for creating a new PDF export job.

    Used for POST /projects/{id}/exports/pdf-ml requests.
    """

    format = serializers.ChoiceField(
        choices=[("pdf_ml", "PDF ML Export"), ("pdf_ml_w3c", "PDF ML Export with W3C")],
        default="pdf_ml",
        help_text="Export format",
    )
    dpi = serializers.IntegerField(
        default=DEFAULT_DPI,
        min_value=72,
        max_value=600,
        help_text="DPI for page images",
    )
    include_page_images = serializers.BooleanField(
        default=DEFAULT_INCLUDE_PAGE_IMAGES,
        help_text="Include PNG page images",
    )
    include_w3c = serializers.BooleanField(
        default=DEFAULT_INCLUDE_W3C,
        help_text="Include W3C format",
    )
    task_filter = TaskFilterOptionsSerializer(
        required=False,
        help_text="Task filter options",
    )

    def validate(self, data):
        """Validate the complete export request."""
        # If include_w3c is True, set format to pdf_ml_w3c
        if data.get("include_w3c") and data.get("format") == "pdf_ml":
            data["format"] = "pdf_ml_w3c"
        return data


class PipelineInfoSerializer(serializers.Serializer):
    """Serializer for pipeline version information."""

    pdf_text_engine = serializers.CharField()
    layout_engine = serializers.CharField()
    ocr_engine = serializers.CharField(required=False, allow_null=True)


class RenderSettingsSerializer(serializers.Serializer):
    """Serializer for render settings."""

    dpi = serializers.IntegerField()
    coordinate_system = serializers.CharField()


class DocumentManifestSerializer(serializers.Serializer):
    """Serializer for document manifest in export bundle.

    Used for docs/{doc_id}/manifest.json files in export bundle.
    """

    doc_id = serializers.CharField()
    task_id = serializers.IntegerField()
    pdf_path = serializers.CharField()
    sha256 = serializers.CharField()
    num_pages = serializers.IntegerField()
    layout_version_id = serializers.CharField()
    id_algorithm_version = serializers.CharField()
    export_schema_version = serializers.CharField()
    pipeline = PipelineInfoSerializer()
    render = RenderSettingsSerializer()
    layout_files = serializers.ListField(child=serializers.CharField())
    page_images = serializers.ListField(
        child=serializers.CharField(), required=False, allow_null=True
    )
    created_at = serializers.CharField(required=False, allow_null=True)


class ExportBundleManifestSerializer(serializers.Serializer):
    """Serializer for top-level export bundle manifest."""

    export_id = serializers.UUIDField()
    export_schema_version = serializers.CharField()
    created_at = serializers.DateTimeField()
    created_by = serializers.IntegerField()
    project_id = serializers.IntegerField()
    total_documents = serializers.IntegerField()
    total_annotations = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    status = serializers.ChoiceField(choices=["completed", "partial"])


# =============================================================================
# Phase 3: Page Layout Serializers (User Story 1 - T025)
# =============================================================================


class BBoxXYWHSerializer(serializers.Serializer):
    """Serializer for bounding box in XYWH format."""

    x = serializers.IntegerField()
    y = serializers.IntegerField()
    width = serializers.IntegerField()
    height = serializers.IntegerField()


class TokenSerializer(serializers.Serializer):
    """Serializer for text tokens."""

    token_id = serializers.CharField()
    text = serializers.CharField()
    bbox = BBoxXYWHSerializer()
    confidence = serializers.FloatField(required=False, allow_null=True)
    font_name = serializers.CharField(required=False, allow_null=True)
    font_size = serializers.FloatField(required=False, allow_null=True)
    is_bold = serializers.BooleanField(required=False, allow_null=True)
    is_italic = serializers.BooleanField(required=False, allow_null=True)


class TextLayerSerializer(serializers.Serializer):
    """Serializer for text layer."""

    layer_id = serializers.ChoiceField(choices=["pdf_text", "ocr"])
    source_engine = serializers.CharField()
    coverage = serializers.FloatField()
    word_count = serializers.IntegerField()
    tokens = TokenSerializer(many=True)
    avg_confidence = serializers.FloatField(required=False, allow_null=True)


class WordSerializer(serializers.Serializer):
    """Serializer for Word element."""

    word_id = serializers.CharField()
    text = serializers.CharField()
    bbox = BBoxXYWHSerializer()
    line_id = serializers.CharField()
    block_id = serializers.CharField()
    reading_order = serializers.IntegerField()
    char_start = serializers.IntegerField()
    char_end = serializers.IntegerField()
    layer_id = serializers.ChoiceField(choices=["pdf_text", "ocr"])
    confidence = serializers.FloatField(required=False, allow_null=True)


class LineSerializer(serializers.Serializer):
    """Serializer for Line element."""

    line_id = serializers.CharField()
    bbox = BBoxXYWHSerializer()
    block_id = serializers.CharField()
    word_ids = serializers.ListField(child=serializers.CharField())
    text = serializers.CharField()
    char_start = serializers.IntegerField()
    char_end = serializers.IntegerField()
    reading_order = serializers.IntegerField()


class BlockSerializer(serializers.Serializer):
    """Serializer for Block element."""

    block_id = serializers.CharField()
    bbox = BBoxXYWHSerializer()
    block_type = serializers.ChoiceField(
        choices=["paragraph", "heading", "list_item", "caption", "other"]
    )
    line_ids = serializers.ListField(child=serializers.CharField())
    text = serializers.CharField()
    char_start = serializers.IntegerField()
    char_end = serializers.IntegerField()
    reading_order = serializers.IntegerField()


class PageGeometrySerializer(serializers.Serializer):
    """Serializer for page geometry."""

    pdf_page_width_pt = serializers.FloatField()
    pdf_page_height_pt = serializers.FloatField()
    rotation_deg = serializers.IntegerField()
    media_box_pt = serializers.ListField(child=serializers.FloatField())
    crop_box_pt = serializers.ListField(child=serializers.FloatField())
    render_dpi = serializers.IntegerField()
    render_scale = serializers.FloatField()
    rendered_width_px = serializers.IntegerField()
    rendered_height_px = serializers.IntegerField()


class CanonicalSelectionSerializer(serializers.Serializer):
    """Serializer for canonical layer selection."""

    layer_id = serializers.ChoiceField(choices=["pdf_text", "ocr"])
    reason = serializers.CharField()


class CanonicalIndexEntrySerializer(serializers.Serializer):
    """Serializer for canonical index entry."""

    char_start = serializers.IntegerField()
    char_end = serializers.IntegerField()


class CanonicalIndexSerializer(serializers.Serializer):
    """Serializer for canonical index."""

    words = serializers.DictField(child=CanonicalIndexEntrySerializer())
    lines = serializers.DictField(child=CanonicalIndexEntrySerializer())
    blocks = serializers.DictField(child=CanonicalIndexEntrySerializer())


class PageLayoutSerializer(serializers.Serializer):
    """Serializer for complete page layout.

    Used for layout/page_NNN.json files in export bundle.
    """

    page_id = serializers.CharField()
    page_number = serializers.IntegerField()
    doc_id = serializers.CharField()
    layout_version_id = serializers.CharField()
    geometry = PageGeometrySerializer()
    layers = serializers.DictField(child=TextLayerSerializer())
    canonical = CanonicalSelectionSerializer()
    canonical_text = serializers.CharField()
    canonical_index = CanonicalIndexSerializer()
    words = WordSerializer(many=True)
    lines = LineSerializer(many=True)
    blocks = BlockSerializer(many=True)
    tables = serializers.ListField(required=False, default=list)


# =============================================================================
# Phase 11: Django Model Serializers (API Integration)
# =============================================================================


class PdfExportJobModelSerializer(serializers.ModelSerializer):
    """ModelSerializer for PdfExportJob Django model.

    Used for detailed job status responses.
    """

    from .django_models import PdfExportJob

    download_url = serializers.SerializerMethodField()

    class Meta:
        from .django_models import PdfExportJob

        model = PdfExportJob
        fields = [
            "export_id",
            "status",
            "progress_percent",
            "progress_message",
            "total_documents",
            "completed_documents",
            "failed_documents",
            "total_pages",
            "total_annotations",
            "created_at",
            "started_at",
            "finished_at",
            "include_page_images",
            "include_w3c",
            "render_dpi",
            "export_schema_version",
            "errors",
            "download_url",
        ]
        read_only_fields = fields

    def get_download_url(self, obj):
        """Get download URL if export is complete."""
        from .django_models import PdfExportJob

        if obj.status in [PdfExportJob.Status.COMPLETED, PdfExportJob.Status.PARTIAL]:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(
                    f"/api/exports/pdf-ml/{obj.export_id}/download"
                )
        return None


class PdfExportJobCreateModelSerializer(serializers.ModelSerializer):
    """ModelSerializer for creating a new PDF ML export job."""

    from .django_models import PdfExportJob

    task_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
        help_text="Specific task IDs to export. Empty list exports all tasks.",
    )

    class Meta:
        from .django_models import PdfExportJob

        model = PdfExportJob
        fields = [
            "include_page_images",
            "include_w3c",
            "render_dpi",
            "task_ids",
        ]

    def validate_render_dpi(self, value):
        """Validate DPI is within acceptable range."""
        if value < 72 or value > 600:
            raise serializers.ValidationError(
                "render_dpi must be between 72 and 600"
            )
        return value


class ExportIndexDocumentSerializer(serializers.Serializer):
    """Serializer for document entry in export index."""

    doc_id = serializers.CharField()
    task_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=["completed", "failed"])
    manifest_path = serializers.CharField()
    num_pages = serializers.IntegerField(required=False)
    num_annotations = serializers.IntegerField(required=False)
    error = serializers.CharField(required=False, allow_null=True)


class ExportIndexAnnotationFileSerializer(serializers.Serializer):
    """Serializer for annotation file entry in export index."""

    path = serializers.CharField()
    record_count = serializers.IntegerField()


class ExportIndexStatisticsSerializer(serializers.Serializer):
    """Serializer for export statistics."""

    total_documents = serializers.IntegerField()
    completed_documents = serializers.IntegerField()
    failed_documents = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    total_annotations = serializers.IntegerField()
    total_words = serializers.IntegerField(required=False)
    total_tables = serializers.IntegerField(required=False)


class ExportIndexSerializer(serializers.Serializer):
    """Serializer for export_index.json manifest response."""

    export_id = serializers.CharField()
    export_schema_version = serializers.CharField()
    project_id = serializers.IntegerField()
    created_at = serializers.CharField()
    created_by = serializers.IntegerField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=["completed", "partial", "failed"])
    statistics = ExportIndexStatisticsSerializer()
    documents = ExportIndexDocumentSerializer(many=True)
    annotation_files = ExportIndexAnnotationFileSerializer(many=True, required=False)
    errors = serializers.ListField(required=False)
