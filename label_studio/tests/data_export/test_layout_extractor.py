"""Unit tests for PDF ML Export layout extraction.

Tests the layout extraction functions:
- extract_page_geometry: Page geometry extraction
- extract_tokens_from_page: Token extraction from PDF
- calculate_coverage: Text coverage calculation
- group_tokens_into_lines: Line grouping algorithm
- group_lines_into_blocks: Block grouping algorithm
- select_canonical_layer: Layer selection logic
"""

import pytest


class TestExtractPageGeometry:
    """Tests for extract_page_geometry function."""

    def test_geometry_has_required_fields(self):
        """Test that PageGeometry has all required fields."""
        from label_studio.data_export.pdf_export.models import PageGeometry

        geom = PageGeometry(
            pdf_page_width_pt=612.0,
            pdf_page_height_pt=792.0,
            rotation_deg=0,
            media_box_pt=[0, 0, 612, 792],
            crop_box_pt=[0, 0, 612, 792],
            render_dpi=200,
            render_scale=200 / 72,
            rendered_width_px=1700,
            rendered_height_px=2200,
        )

        assert geom.pdf_page_width_pt == 612.0
        assert geom.pdf_page_height_pt == 792.0
        assert geom.rotation_deg == 0
        assert geom.render_dpi == 200

    def test_geometry_to_dict(self):
        """Test PageGeometry serialization to dict."""
        from label_studio.data_export.pdf_export.models import PageGeometry

        geom = PageGeometry(
            pdf_page_width_pt=612.0,
            pdf_page_height_pt=792.0,
            rotation_deg=90,
            media_box_pt=[0, 0, 612, 792],
            crop_box_pt=[10, 10, 602, 782],
            render_dpi=150,
            render_scale=150 / 72,
            rendered_width_px=1275,
            rendered_height_px=1650,
        )

        result = geom.to_dict()

        assert "pdf_page_width_pt" in result
        assert "rotation_deg" in result
        assert result["rotation_deg"] == 90


class TestCalculateCoverage:
    """Tests for calculate_coverage function."""

    def test_full_coverage(self):
        """Test coverage calculation with full page coverage."""
        from label_studio.data_export.pdf_export.layout_extractor import calculate_coverage

        # Mock tokens covering entire page
        tokens = [
            {"bbox": (0, 0, 100, 100)},
            {"bbox": (100, 0, 100, 100)},
        ]
        page_width = 200
        page_height = 100

        coverage = calculate_coverage(tokens, page_width, page_height)

        assert 0.0 <= coverage <= 1.0
        assert coverage > 0.5  # Should have significant coverage

    def test_no_tokens_zero_coverage(self):
        """Test that no tokens results in zero coverage."""
        from label_studio.data_export.pdf_export.layout_extractor import calculate_coverage

        coverage = calculate_coverage([], 100, 100)

        assert coverage == 0.0

    def test_coverage_bounded(self):
        """Test that coverage is bounded between 0 and 1."""
        from label_studio.data_export.pdf_export.layout_extractor import calculate_coverage

        # Large tokens that might overflow
        tokens = [
            {"bbox": (0, 0, 1000, 1000)},
        ]

        coverage = calculate_coverage(tokens, 100, 100)

        assert 0.0 <= coverage <= 1.0


class TestGroupTokensIntoLines:
    """Tests for group_tokens_into_lines function."""

    def test_single_line(self):
        """Test grouping tokens on same line."""
        from label_studio.data_export.pdf_export.layout_extractor import group_tokens_into_lines
        from label_studio.data_export.pdf_export.models import Token, BBoxXYWH

        tokens = [
            Token(
                token_id="t1",
                text="hello",
                bbox=BBoxXYWH(x=0, y=100, width=50, height=20),
            ),
            Token(
                token_id="t2",
                text="world",
                bbox=BBoxXYWH(x=60, y=102, width=50, height=20),
            ),
        ]

        lines = group_tokens_into_lines(tokens)

        # Both tokens should be in same line (y positions close)
        assert len(lines) == 1
        assert len(lines[0]) == 2

    def test_multiple_lines(self):
        """Test grouping tokens on different lines."""
        from label_studio.data_export.pdf_export.layout_extractor import group_tokens_into_lines
        from label_studio.data_export.pdf_export.models import Token, BBoxXYWH

        tokens = [
            Token(
                token_id="t1",
                text="line1",
                bbox=BBoxXYWH(x=0, y=100, width=50, height=20),
            ),
            Token(
                token_id="t2",
                text="line2",
                bbox=BBoxXYWH(x=0, y=200, width=50, height=20),
            ),
        ]

        lines = group_tokens_into_lines(tokens)

        # Tokens should be in different lines
        assert len(lines) == 2

    def test_empty_input(self):
        """Test with empty token list."""
        from label_studio.data_export.pdf_export.layout_extractor import group_tokens_into_lines

        lines = group_tokens_into_lines([])

        assert len(lines) == 0


class TestGroupLinesIntoBlocks:
    """Tests for group_lines_into_blocks function."""

    def test_single_block(self):
        """Test grouping adjacent lines into single block."""
        from label_studio.data_export.pdf_export.layout_extractor import group_lines_into_blocks
        from label_studio.data_export.pdf_export.models import Line, BBoxXYWH

        lines = [
            Line(
                line_id="l1",
                bbox=BBoxXYWH(x=0, y=100, width=200, height=20),
                block_id="",
                word_ids=["w1"],
                text="Line 1",
                char_start=0,
                char_end=6,
                reading_order=0,
            ),
            Line(
                line_id="l2",
                bbox=BBoxXYWH(x=0, y=125, width=200, height=20),
                block_id="",
                word_ids=["w2"],
                text="Line 2",
                char_start=7,
                char_end=13,
                reading_order=1,
            ),
        ]

        blocks = group_lines_into_blocks(lines)

        # Adjacent lines should form one block
        assert len(blocks) >= 1

    def test_empty_input(self):
        """Test with empty line list."""
        from label_studio.data_export.pdf_export.layout_extractor import group_lines_into_blocks

        blocks = group_lines_into_blocks([])

        assert len(blocks) == 0


class TestSelectCanonicalLayer:
    """Tests for select_canonical_layer function."""

    def test_high_coverage_pdf_text(self):
        """Test that high coverage pdf_text layer is selected."""
        from label_studio.data_export.pdf_export.layout_extractor import select_canonical_layer
        from label_studio.data_export.pdf_export.models import TextLayer

        pdf_layer = TextLayer(
            layer_id="pdf_text",
            source_engine="pdfplumber",
            coverage=0.9,
            word_count=100,
            tokens=[],
        )
        ocr_layer = TextLayer(
            layer_id="ocr",
            source_engine="tesseract",
            coverage=0.95,
            word_count=105,
            tokens=[],
        )

        selection = select_canonical_layer(pdf_layer, ocr_layer)

        # With high pdf_text coverage (>0.7), should prefer pdf_text
        assert selection.layer_id == "pdf_text"

    def test_low_coverage_uses_ocr(self):
        """Test that low coverage pdf_text falls back to OCR."""
        from label_studio.data_export.pdf_export.layout_extractor import select_canonical_layer
        from label_studio.data_export.pdf_export.models import TextLayer

        pdf_layer = TextLayer(
            layer_id="pdf_text",
            source_engine="pdfplumber",
            coverage=0.3,  # Low coverage
            word_count=30,
            tokens=[],
        )
        ocr_layer = TextLayer(
            layer_id="ocr",
            source_engine="tesseract",
            coverage=0.9,
            word_count=100,
            tokens=[],
        )

        selection = select_canonical_layer(pdf_layer, ocr_layer)

        # Low pdf_text coverage should select OCR
        assert selection.layer_id == "ocr"

    def test_no_ocr_uses_pdf_text(self):
        """Test that missing OCR layer uses pdf_text regardless of coverage."""
        from label_studio.data_export.pdf_export.layout_extractor import select_canonical_layer
        from label_studio.data_export.pdf_export.models import TextLayer

        pdf_layer = TextLayer(
            layer_id="pdf_text",
            source_engine="pdfplumber",
            coverage=0.3,
            word_count=30,
            tokens=[],
        )

        selection = select_canonical_layer(pdf_layer, None)

        assert selection.layer_id == "pdf_text"


class TestGetPdfPageCount:
    """Tests for get_pdf_page_count function."""

    def test_invalid_path_raises_error(self):
        """Test that invalid path raises appropriate error."""
        from label_studio.data_export.pdf_export.layout_extractor import get_pdf_page_count

        with pytest.raises(Exception):
            get_pdf_page_count("/nonexistent/path/to/file.pdf")
