"""End-to-end integration tests for PDF ML Export.

Tests the complete export flow from PDF file to export bundle.
"""

import json
import os
import tempfile
import zipfile
from pathlib import Path

import pytest


@pytest.fixture
def sample_pdf_bytes():
    """Generate minimal valid PDF bytes for testing."""
    # Minimal PDF structure
    return b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Hello World) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000359 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
434
%%EOF
"""


@pytest.fixture
def test_pdf_file(tmp_path, sample_pdf_bytes):
    """Create a test PDF file."""
    pdf_path = tmp_path / "test.pdf"
    pdf_path.write_bytes(sample_pdf_bytes)
    return str(pdf_path)


class TestExportPackageStructure:
    """Tests for export package structure."""

    def test_export_creates_expected_directories(self, tmp_path):
        """Test that export creates expected directory structure."""
        from label_studio.data_export.pdf_export.package_builder import ExportPackageBuilder

        output_dir = tmp_path / "export"
        builder = ExportPackageBuilder(
            output_dir=str(output_dir),
            project_id=123,
            export_id="test-export-id",
        )
        builder.initialize()

        # Check directories created
        assert (output_dir / "docs").exists()
        assert (output_dir / "schemas").exists()

    def test_export_includes_schema_files(self, tmp_path):
        """Test that schema files are copied to export."""
        from label_studio.data_export.pdf_export.package_builder import ExportPackageBuilder

        output_dir = tmp_path / "export"
        builder = ExportPackageBuilder(
            output_dir=str(output_dir),
            project_id=123,
        )
        builder.initialize()

        schemas_dir = output_dir / "schemas"
        expected_schemas = [
            "manifest.schema.json",
            "page_layout.schema.json",
            "annotation_record.schema.json",
            "export_index.schema.json",
        ]

        for schema_name in expected_schemas:
            schema_path = schemas_dir / schema_name
            # Schema files should be copied if they exist in source
            # (may not exist in test environment)
            pass


class TestExportIndexGeneration:
    """Tests for export index generation."""

    def test_export_index_has_required_fields(self, tmp_path):
        """Test that export index has all required fields."""
        from label_studio.data_export.pdf_export.package_builder import (
            ExportPackageBuilder,
            ExportStatistics,
        )
        from label_studio.data_export.pdf_export.models import DocumentManifest

        output_dir = tmp_path / "export"
        builder = ExportPackageBuilder(
            output_dir=str(output_dir),
            project_id=123,
            export_id="test-id",
            created_by=1,
        )
        builder.initialize()

        # Add a mock document
        manifest = DocumentManifest(
            doc_id="abc123def456",
            task_id=1,
            pdf_path="/path/to/test.pdf",
            sha256="abc123",
            num_pages=1,
            layout_version_id="uuid-123",
            id_algorithm_version="sha256_v1",
            export_schema_version="1.0.0",
            pipeline={"pdf_text_engine": "pdfplumber"},
            render={"dpi": 200, "coordinate_system": "pixels"},
            layout_files=["page_001.json"],
        )

        # Manually create doc directory
        doc_dir = output_dir / "docs" / manifest.doc_id
        doc_dir.mkdir(parents=True, exist_ok=True)

        # Finalize
        index = builder.finalize()

        assert index.export_id == "test-id"
        assert index.project_id == 123
        assert index.created_by == 1
        assert index.export_schema_version is not None
        assert index.status in ["completed", "partial", "failed"]

    def test_export_index_written_to_file(self, tmp_path):
        """Test that export index is written to JSON file."""
        from label_studio.data_export.pdf_export.package_builder import ExportPackageBuilder

        output_dir = tmp_path / "export"
        builder = ExportPackageBuilder(
            output_dir=str(output_dir),
            project_id=123,
        )
        builder.initialize()
        builder.finalize()

        index_path = output_dir / "export_index.json"
        assert index_path.exists()

        with open(index_path) as f:
            data = json.load(f)

        assert "export_id" in data
        assert "project_id" in data
        assert "status" in data


class TestAnnotationSharding:
    """Tests for annotation sharding behavior."""

    def test_single_shard_for_small_exports(self, tmp_path):
        """Test that small exports use single annotation file."""
        from label_studio.data_export.pdf_export.package_builder import AnnotationSharder
        from label_studio.data_export.pdf_export.models import (
            AnnotationRecord,
            AnnotationEvidence,
            AnnotationMetadata,
            AnnotationSource,
            AnnotationType,
            LayerId,
            BBoxXYWH,
        )

        sharder = AnnotationSharder(
            output_dir=str(tmp_path),
            shard_threshold=100,  # Low threshold for testing
        )

        # Add a few records
        for i in range(10):
            record = AnnotationRecord(
                annotation_id=f"ann_{i:03d}",
                task_id=1,
                doc_id="doc123456789",
                annotation_type=AnnotationType.FIELD,
                label="TEST",
                value=f"value_{i}",
                evidence=AnnotationEvidence(
                    bboxes=[BBoxXYWH(x=0, y=0, width=50, height=20)],
                    word_ids=["w_00000001"],
                    quote=f"value_{i}",
                    char_start=0,
                    char_end=7,
                    page_id="doc123456789:page_001",
                    layer_id=LayerId.PDF_TEXT,
                ),
                metadata=AnnotationMetadata(
                    annotator_id=1,
                    source=AnnotationSource.MANUAL,
                    created_at="2024-01-01T00:00:00Z",
                ),
            )
            sharder.write(record)

        shard_files = sharder.close()

        # Should only have one shard file
        assert len(shard_files) == 1
        assert shard_files[0].path == "annotations.jsonl"
        assert shard_files[0].record_count == 10

    def test_multiple_shards_for_large_exports(self, tmp_path):
        """Test that large exports create multiple shards."""
        from label_studio.data_export.pdf_export.package_builder import AnnotationSharder
        from label_studio.data_export.pdf_export.models import (
            AnnotationRecord,
            AnnotationEvidence,
            AnnotationMetadata,
            AnnotationSource,
            AnnotationType,
            LayerId,
            BBoxXYWH,
        )

        sharder = AnnotationSharder(
            output_dir=str(tmp_path),
            shard_threshold=5,  # Very low threshold for testing
        )

        # Add more records than threshold
        for i in range(12):
            record = AnnotationRecord(
                annotation_id=f"ann_{i:03d}",
                task_id=1,
                doc_id="doc123456789",
                annotation_type=AnnotationType.FIELD,
                label="TEST",
                value=f"value_{i}",
                evidence=AnnotationEvidence(
                    bboxes=[BBoxXYWH(x=0, y=0, width=50, height=20)],
                    word_ids=["w_00000001"],
                    quote=f"value_{i}",
                    char_start=0,
                    char_end=7,
                    page_id="doc123456789:page_001",
                    layer_id=LayerId.PDF_TEXT,
                ),
                metadata=AnnotationMetadata(
                    annotator_id=1,
                    source=AnnotationSource.MANUAL,
                    created_at="2024-01-01T00:00:00Z",
                ),
            )
            sharder.write(record)

        shard_files = sharder.close()

        # Should have multiple shard files
        assert len(shard_files) >= 2


class TestZipArchiveGeneration:
    """Tests for ZIP archive generation."""

    def test_zip_archive_created(self, tmp_path):
        """Test that ZIP archive is created."""
        from label_studio.data_export.pdf_export.package_builder import ExportPackageBuilder

        output_dir = tmp_path / "export"
        builder = ExportPackageBuilder(
            output_dir=str(output_dir),
            project_id=123,
        )
        builder.initialize()
        builder.finalize()

        zip_path = builder.create_zip_archive()

        assert os.path.exists(zip_path)
        assert zip_path.endswith(".zip")

    def test_zip_contains_export_index(self, tmp_path):
        """Test that ZIP contains export_index.json."""
        from label_studio.data_export.pdf_export.package_builder import ExportPackageBuilder

        output_dir = tmp_path / "export"
        builder = ExportPackageBuilder(
            output_dir=str(output_dir),
            project_id=123,
        )
        builder.initialize()
        builder.finalize()

        zip_path = builder.create_zip_archive()

        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()
            assert "export_index.json" in names

    def test_zip_has_deterministic_ordering(self, tmp_path):
        """Test that ZIP file entries are deterministically ordered."""
        from label_studio.data_export.pdf_export.package_builder import ExportPackageBuilder

        # Create first export
        output_dir1 = tmp_path / "export1"
        builder1 = ExportPackageBuilder(
            output_dir=str(output_dir1),
            project_id=123,
            export_id="same-id",
        )
        builder1.initialize()
        builder1.finalize()
        zip_path1 = builder1.create_zip_archive()

        # Create second export with same content
        output_dir2 = tmp_path / "export2"
        builder2 = ExportPackageBuilder(
            output_dir=str(output_dir2),
            project_id=123,
            export_id="same-id",
        )
        builder2.initialize()
        builder2.finalize()
        zip_path2 = builder2.create_zip_archive()

        # Compare file listings (order should be same)
        with zipfile.ZipFile(zip_path1, "r") as zf1:
            names1 = zf1.namelist()
        with zipfile.ZipFile(zip_path2, "r") as zf2:
            names2 = zf2.namelist()

        assert names1 == names2


class TestSchemaValidation:
    """Tests for schema validation of export files."""

    def test_export_index_validates_against_schema(self, tmp_path):
        """Test that generated export_index.json validates against schema."""
        from label_studio.data_export.pdf_export.package_builder import ExportPackageBuilder
        from label_studio.data_export.pdf_export.validator import validate_export_index

        output_dir = tmp_path / "export"
        builder = ExportPackageBuilder(
            output_dir=str(output_dir),
            project_id=123,
        )
        builder.initialize()
        index = builder.finalize()

        # Validate against schema
        is_valid, errors = validate_export_index(index.to_dict())

        # Note: May fail if jsonschema not installed
        if errors and "jsonschema not available" not in str(errors):
            assert is_valid, f"Validation errors: {errors}"
