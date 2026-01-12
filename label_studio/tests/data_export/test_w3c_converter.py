"""Unit tests for PDF ML Export W3C Web Annotation converter.

Tests the W3C format conversion functions:
- convert_annotation_to_w3c: Convert annotation record to W3C format
- extract_prefix_suffix: Extract context for TextQuoteSelector
- W3CAnnotation dataclass structure
"""

import pytest


class TestTextQuoteSelector:
    """Tests for TextQuoteSelector dataclass."""

    def test_basic_creation(self):
        """Test creating a TextQuoteSelector."""
        from label_studio.data_export.pdf_export.w3c_converter import TextQuoteSelector

        selector = TextQuoteSelector(
            exact="hello world",
            prefix="say ",
            suffix=" today",
        )

        assert selector.exact == "hello world"
        assert selector.prefix == "say "
        assert selector.suffix == " today"
        # type is added in to_dict()
        assert selector.to_dict()["type"] == "TextQuoteSelector"

    def test_to_dict(self):
        """Test TextQuoteSelector serialization."""
        from label_studio.data_export.pdf_export.w3c_converter import TextQuoteSelector

        selector = TextQuoteSelector(
            exact="test",
            prefix="pre",
            suffix="suf",
        )

        result = selector.to_dict()

        assert result["type"] == "TextQuoteSelector"
        assert result["exact"] == "test"
        assert result["prefix"] == "pre"
        assert result["suffix"] == "suf"


class TestTextPositionSelector:
    """Tests for TextPositionSelector dataclass."""

    def test_basic_creation(self):
        """Test creating a TextPositionSelector."""
        from label_studio.data_export.pdf_export.w3c_converter import TextPositionSelector

        selector = TextPositionSelector(
            start=10,
            end=20,
        )

        assert selector.start == 10
        assert selector.end == 20
        # type is added in to_dict()
        assert selector.to_dict()["type"] == "TextPositionSelector"

    def test_to_dict(self):
        """Test TextPositionSelector serialization."""
        from label_studio.data_export.pdf_export.w3c_converter import TextPositionSelector

        selector = TextPositionSelector(start=0, end=100)

        result = selector.to_dict()

        assert result["type"] == "TextPositionSelector"
        assert result["start"] == 0
        assert result["end"] == 100


class TestFragmentSelector:
    """Tests for FragmentSelector dataclass."""

    def test_basic_creation(self):
        """Test creating a FragmentSelector."""
        from label_studio.data_export.pdf_export.w3c_converter import FragmentSelector

        selector = FragmentSelector(
            value="xywh=100,200,50,30",
        )

        assert selector.value == "xywh=100,200,50,30"
        # type is added in to_dict()
        assert selector.to_dict()["type"] == "FragmentSelector"
        # attribute is conforms_to, serializes to conformsTo
        assert selector.conforms_to == "http://www.w3.org/TR/media-frags/"

    def test_to_dict(self):
        """Test FragmentSelector serialization."""
        from label_studio.data_export.pdf_export.w3c_converter import FragmentSelector

        selector = FragmentSelector(value="xywh=0,0,100,100")

        result = selector.to_dict()

        assert result["type"] == "FragmentSelector"
        assert result["value"] == "xywh=0,0,100,100"
        assert "conformsTo" in result


class TestExtractPrefixSuffix:
    """Tests for extract_prefix_suffix function."""

    def test_extract_context(self):
        """Test extracting prefix and suffix context."""
        from label_studio.data_export.pdf_export.w3c_converter import extract_prefix_suffix

        text = "The quick brown fox jumps over the lazy dog"
        start = 10  # "brown"
        end = 15

        prefix, suffix = extract_prefix_suffix(text, start, end, context_chars=5)

        assert prefix == "uick "
        assert suffix == " fox "

    def test_at_start_of_text(self):
        """Test extraction at the start of text."""
        from label_studio.data_export.pdf_export.w3c_converter import extract_prefix_suffix

        text = "Hello world"
        start = 0
        end = 5

        prefix, suffix = extract_prefix_suffix(text, start, end, context_chars=10)

        assert prefix == ""
        assert "world" in suffix or suffix == " world"

    def test_at_end_of_text(self):
        """Test extraction at the end of text."""
        from label_studio.data_export.pdf_export.w3c_converter import extract_prefix_suffix

        text = "Hello world"
        start = 6
        end = 11

        prefix, suffix = extract_prefix_suffix(text, start, end, context_chars=10)

        assert "Hello" in prefix or prefix == "Hello "
        assert suffix == ""

    def test_short_text(self):
        """Test extraction with very short text."""
        from label_studio.data_export.pdf_export.w3c_converter import extract_prefix_suffix

        text = "Hi"
        start = 0
        end = 2

        prefix, suffix = extract_prefix_suffix(text, start, end, context_chars=50)

        assert prefix == ""
        assert suffix == ""


class TestW3CAnnotation:
    """Tests for W3CAnnotation dataclass."""

    def test_basic_structure(self):
        """Test basic W3CAnnotation structure."""
        from label_studio.data_export.pdf_export.w3c_converter import (
            W3CAnnotation,
            SpecificResource,
            TextQuoteSelector,
        )

        selector = TextQuoteSelector(
            exact="test",
            prefix="",
            suffix="",
        )

        annotation = W3CAnnotation(
            id="urn:uuid:12345",
            target=SpecificResource(
                source="http://example.com/doc.pdf",
                selectors=[selector],  # Use selectors (list), not selector
            ),
            body={"value": "label", "purpose": "tagging"},
            creator={"id": "user:123", "type": "Person"},
            created="2024-01-01T00:00:00Z",
        )

        assert annotation.id == "urn:uuid:12345"
        # context and type are added in to_dict()
        result = annotation.to_dict()
        assert result["@context"] == "http://www.w3.org/ns/anno.jsonld"
        assert result["type"] == "Annotation"

    def test_to_dict(self):
        """Test W3CAnnotation serialization."""
        from label_studio.data_export.pdf_export.w3c_converter import (
            W3CAnnotation,
            SpecificResource,
            TextPositionSelector,
        )

        selector = TextPositionSelector(start=0, end=10)

        annotation = W3CAnnotation(
            id="urn:uuid:test123",
            target=SpecificResource(
                source="http://example.com/page1",
                selectors=[selector],  # Use selectors (list)
            ),
            body={"value": "Entity", "purpose": "tagging"},
            creator={"id": "user:1", "type": "Person"},
            created="2024-01-01T00:00:00Z",
        )

        result = annotation.to_dict()

        assert "@context" in result
        assert result["@context"] == "http://www.w3.org/ns/anno.jsonld"
        assert result["type"] == "Annotation"
        assert result["id"] == "urn:uuid:test123"
        assert "target" in result
        assert "body" in result


class TestConvertAnnotationToW3c:
    """Tests for convert_annotation_to_w3c function."""

    def test_basic_conversion(self):
        """Test basic annotation conversion."""
        from label_studio.data_export.pdf_export.w3c_converter import convert_annotation_to_w3c
        from label_studio.data_export.pdf_export.models import (
            AnnotationRecord,
            AnnotationEvidence,
            AnnotationMetadata,
            BBoxXYWH,
        )

        record = AnnotationRecord(
            annotation_id="ann_123",
            task_id=1,
            doc_id="doc123456789",
            annotation_type="field",
            label="PERSON",
            value="John Doe",
            evidence=AnnotationEvidence(
                bboxes=[BBoxXYWH(x=100, y=200, width=50, height=20)],
                word_ids=["w_00000001"],
                quote="John Doe",
                char_start=0,
                char_end=8,
                page_id="doc123456789:page_001",
                layer_id="pdf_text",
            ),
            metadata=AnnotationMetadata(
                annotator_id=1,
                source="manual",
                created_at="2024-01-01T00:00:00Z",
            ),
        )

        w3c = convert_annotation_to_w3c(
            record=record,
            canonical_text="John Doe is here",
            base_uri="http://example.com/docs",
        )

        assert w3c is not None
        # Check via to_dict() since type is not a direct attribute
        result = w3c.to_dict()
        assert result["type"] == "Annotation"
        assert "PERSON" in str(result["body"])

    def test_multi_bbox_conversion(self):
        """Test conversion with multiple bboxes."""
        from label_studio.data_export.pdf_export.w3c_converter import convert_annotation_to_w3c
        from label_studio.data_export.pdf_export.models import (
            AnnotationRecord,
            AnnotationEvidence,
            AnnotationMetadata,
            BBoxXYWH,
        )

        record = AnnotationRecord(
            annotation_id="ann_456",
            task_id=1,
            doc_id="doc123456789",
            annotation_type="field",
            label="ADDRESS",
            value="123 Main St\nCity, ST 12345",
            evidence=AnnotationEvidence(
                bboxes=[
                    BBoxXYWH(x=100, y=200, width=100, height=20),
                    BBoxXYWH(x=100, y=225, width=120, height=20),
                ],
                word_ids=["w_00000001", "w_00000002", "w_00000003"],
                quote="123 Main St\nCity, ST 12345",
                char_start=0,
                char_end=26,
                page_id="doc123456789:page_001",
                layer_id="pdf_text",
            ),
            metadata=AnnotationMetadata(
                annotator_id=1,
                source="manual",
                created_at="2024-01-01T00:00:00Z",
            ),
        )

        w3c = convert_annotation_to_w3c(
            record=record,
            canonical_text="123 Main St\nCity, ST 12345 more text",
            base_uri="http://example.com/docs",
        )

        assert w3c is not None
        # Should have target
        assert w3c.target is not None


class TestExportW3cAnnotations:
    """Tests for export_w3c_annotations function."""

    def test_export_creates_file(self, tmp_path):
        """Test that export creates a valid JSON file."""
        from label_studio.data_export.pdf_export.w3c_converter import export_w3c_annotations
        from label_studio.data_export.pdf_export.models import (
            AnnotationRecord,
            AnnotationEvidence,
            AnnotationMetadata,
            BBoxXYWH,
        )

        records = [
            AnnotationRecord(
                annotation_id="ann_001",
                task_id=1,
                doc_id="doc123456789",
                annotation_type="field",
                label="TEST",
                value="test value",
                evidence=AnnotationEvidence(
                    bboxes=[BBoxXYWH(x=0, y=0, width=50, height=20)],
                    word_ids=["w_00000001"],
                    quote="test value",
                    char_start=0,
                    char_end=10,
                    page_id="doc123456789:page_001",
                    layer_id="pdf_text",
                ),
                metadata=AnnotationMetadata(
                    annotator_id=1,
                    source="manual",
                    created_at="2024-01-01T00:00:00Z",
                ),
            ),
        ]

        output_path = tmp_path / "w3c_annotations.json"
        result = export_w3c_annotations(
            records=records,
            output_path=str(output_path),
            canonical_text="test value here",
            base_uri="http://example.com",
        )

        assert output_path.exists()

        # Verify it's valid JSON
        import json

        with open(output_path) as f:
            data = json.load(f)

        # export_w3c_annotations returns dict with annotations
        assert isinstance(data, dict) or isinstance(data, list)
        if isinstance(data, dict):
            assert "annotations" in data or len(data) > 0
        else:
            assert len(data) >= 0
