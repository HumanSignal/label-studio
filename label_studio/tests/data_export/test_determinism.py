"""Tests for deterministic export behavior.

Verifies that the same PDF exported twice produces identical output.
This is critical for reproducibility and caching.
"""

import hashlib
import json
import os
import tempfile
from pathlib import Path

import pytest


class TestIdDeterminism:
    """Tests for deterministic ID generation."""

    def test_doc_id_deterministic(self):
        """Test that doc_id is deterministic for same inputs."""
        from label_studio.data_export.pdf_export.exporter import generate_doc_id

        # Generate IDs multiple times
        results = []
        for _ in range(10):
            doc_id = generate_doc_id(task_id=123, pdf_hash="abc123def456")
            results.append(doc_id)

        # All should be identical
        assert len(set(results)) == 1

    def test_word_id_deterministic(self):
        """Test that word_id is deterministic for same inputs."""
        from label_studio.data_export.pdf_export.exporter import generate_word_id
        from label_studio.data_export.pdf_export.models import BBoxXYWH

        # Generate IDs multiple times
        results = []
        bbox = BBoxXYWH(x=100, y=200, width=50, height=20)
        for _ in range(10):
            word_id = generate_word_id(
                page_id="doc123:page_001",
                text="hello",
                bbox=bbox,
                reading_order=0,
            )
            results.append(word_id)

        # All should be identical
        assert len(set(results)) == 1

    def test_line_id_deterministic(self):
        """Test that line_id is deterministic for same inputs."""
        from label_studio.data_export.pdf_export.exporter import generate_line_id

        results = []
        for _ in range(10):
            line_id = generate_line_id(
                page_id="doc123:page_001",
                word_ids=["w_abc12345", "w_def67890"],
            )
            results.append(line_id)

        assert len(set(results)) == 1

    def test_block_id_deterministic(self):
        """Test that block_id is deterministic for same inputs."""
        from label_studio.data_export.pdf_export.exporter import generate_block_id

        results = []
        for _ in range(10):
            block_id = generate_block_id(
                page_id="doc123:page_001",
                line_ids=["l_abc12345", "l_def67890"],
            )
            results.append(block_id)

        assert len(set(results)) == 1


class TestBboxQuantization:
    """Tests for bbox quantization determinism."""

    def test_quantization_produces_consistent_results(self):
        """Test that bbox quantization is consistent."""
        from label_studio.data_export.pdf_export.coordinates import quantize_bbox
        from label_studio.data_export.pdf_export.models import BBoxXYWH

        bbox = BBoxXYWH(x=100, y=200, width=50, height=20)

        # Quantize same bbox multiple times
        results = []
        for _ in range(10):
            quantized = quantize_bbox(bbox)
            results.append((quantized.x, quantized.y, quantized.width, quantized.height))

        assert len(set(results)) == 1

    def test_nearby_values_quantize_predictably(self):
        """Test that quantization follows predictable rounding rules."""
        from label_studio.data_export.pdf_export.coordinates import quantize_bbox
        from label_studio.data_export.pdf_export.models import BBoxXYWH
        from label_studio.data_export.pdf_export import BBOX_QUANTIZATION_PX

        # Test that same values quantize consistently
        bbox = BBoxXYWH(x=100, y=200, width=50, height=20)

        q1 = quantize_bbox(bbox)
        q2 = quantize_bbox(bbox)

        # Same input should produce same output
        assert (q1.x, q1.y, q1.width, q1.height) == (q2.x, q2.y, q2.width, q2.height)

        # Test quantization produces integer multiples of grid size
        assert q1.x % BBOX_QUANTIZATION_PX == 0
        assert q1.y % BBOX_QUANTIZATION_PX == 0


class TestCanonicalTextDeterminism:
    """Tests for canonical text determinism."""

    def test_canonical_text_same_for_same_input(self):
        """Test that canonical text is same for same input."""
        from label_studio.data_export.pdf_export.canonical_text import build_canonical_text
        from label_studio.data_export.pdf_export.models import Word, Line, Block, BBoxXYWH

        def create_test_data():
            words = [
                Word(
                    word_id="w_00000001",
                    text="Hello",
                    bbox=BBoxXYWH(x=0, y=0, width=50, height=20),
                    line_id="l_00000001",
                    block_id="b_00000001",
                    reading_order=0,
                    char_start=0,
                    char_end=5,
                    layer_id="pdf_text",
                ),
                Word(
                    word_id="w_00000002",
                    text="World",
                    bbox=BBoxXYWH(x=60, y=0, width=50, height=20),
                    line_id="l_00000001",
                    block_id="b_00000001",
                    reading_order=1,
                    char_start=6,
                    char_end=11,
                    layer_id="pdf_text",
                ),
            ]
            lines = [
                Line(
                    line_id="l_00000001",
                    bbox=BBoxXYWH(x=0, y=0, width=110, height=20),
                    block_id="b_00000001",
                    word_ids=["w_00000001", "w_00000002"],
                    text="Hello World",
                    char_start=0,
                    char_end=11,
                    reading_order=0,
                ),
            ]
            blocks = [
                Block(
                    block_id="b_00000001",
                    bbox=BBoxXYWH(x=0, y=0, width=110, height=20),
                    block_type="paragraph",
                    line_ids=["l_00000001"],
                    text="Hello World",
                    char_start=0,
                    char_end=11,
                    reading_order=0,
                ),
            ]
            return blocks, lines, words

        # Build canonical text multiple times
        results = []
        for _ in range(10):
            blocks, lines, words = create_test_data()
            text = build_canonical_text(blocks, lines, words)
            results.append(text)

        # All should be identical
        assert len(set(results)) == 1

    def test_reading_order_affects_output(self):
        """Test that reading_order determines output order."""
        from label_studio.data_export.pdf_export.canonical_text import build_canonical_text
        from label_studio.data_export.pdf_export.models import Word, Line, Block, BBoxXYWH

        # Create two words with different reading orders
        words = [
            Word(
                word_id="w_00000001",
                text="First",
                bbox=BBoxXYWH(x=100, y=0, width=50, height=20),  # Visually second
                line_id="l_00000001",
                block_id="b_00000001",
                reading_order=0,  # But reading_order is first
                char_start=0,
                char_end=5,
                layer_id="pdf_text",
            ),
            Word(
                word_id="w_00000002",
                text="Second",
                bbox=BBoxXYWH(x=0, y=0, width=50, height=20),  # Visually first
                line_id="l_00000001",
                block_id="b_00000001",
                reading_order=1,  # But reading_order is second
                char_start=6,
                char_end=12,
                layer_id="pdf_text",
            ),
        ]
        lines = [
            Line(
                line_id="l_00000001",
                bbox=BBoxXYWH(x=0, y=0, width=150, height=20),
                block_id="b_00000001",
                word_ids=["w_00000001", "w_00000002"],
                text="First Second",
                char_start=0,
                char_end=12,
                reading_order=0,
            ),
        ]
        blocks = [
            Block(
                block_id="b_00000001",
                bbox=BBoxXYWH(x=0, y=0, width=150, height=20),
                block_type="paragraph",
                line_ids=["l_00000001"],
                text="First Second",
                char_start=0,
                char_end=12,
                reading_order=0,
            ),
        ]

        text = build_canonical_text(blocks, lines, words)

        # Should follow reading_order, not bbox position
        assert text.index("First") < text.index("Second")


class TestExportIndexDeterminism:
    """Tests for export index determinism."""

    def test_document_ordering_deterministic(self, tmp_path):
        """Test that documents in export index are deterministically ordered."""
        from label_studio.data_export.pdf_export.package_builder import ExportPackageBuilder
        from label_studio.data_export.pdf_export.models import DocumentManifest

        def create_export():
            output_dir = tmp_path / f"export_{hash(id)}"
            builder = ExportPackageBuilder(
                output_dir=str(output_dir),
                project_id=123,
                export_id="test-id",
            )
            builder.initialize()

            # Add documents in random order
            manifests = [
                DocumentManifest(
                    doc_id=f"doc{i:012d}",
                    task_id=i,
                    pdf_path=f"/path/to/{i}.pdf",
                    sha256=f"hash{i}",
                    num_pages=1,
                    layout_version_id=f"uuid-{i}",
                    id_algorithm_version="sha256_v1",
                    export_schema_version="1.0.0",
                    pipeline={},
                    render={"dpi": 200},
                    layout_files=[],
                )
                for i in [3, 1, 2]  # Add in non-sorted order
            ]

            for manifest in manifests:
                doc_dir = output_dir / "docs" / manifest.doc_id
                doc_dir.mkdir(parents=True, exist_ok=True)
                builder.add_document(manifest)

            index = builder.finalize()
            return [d.task_id for d in index.documents]

        # Create multiple exports
        orderings = []
        for _ in range(3):
            ordering = create_export()
            orderings.append(tuple(ordering))

        # All orderings should be same (sorted by task_id, doc_id)
        assert len(set(orderings)) == 1


class TestHashDeterminism:
    """Tests for hash computation determinism."""

    def test_pdf_hash_deterministic(self, tmp_path):
        """Test that PDF hash is deterministic."""
        from label_studio.data_export.pdf_export.exporter import compute_pdf_hash

        # Create test file
        test_file = tmp_path / "test.pdf"
        test_file.write_bytes(b"test content for hashing")

        # Hash multiple times
        results = []
        for _ in range(10):
            hash_result = compute_pdf_hash(str(test_file))
            results.append(hash_result)

        # All should be identical
        assert len(set(results)) == 1

    def test_hash_matches_standard_sha256(self, tmp_path):
        """Test that hash matches standard SHA-256 computation."""
        from label_studio.data_export.pdf_export.exporter import compute_pdf_hash

        content = b"test content for verification"
        test_file = tmp_path / "test.pdf"
        test_file.write_bytes(content)

        our_hash = compute_pdf_hash(str(test_file))
        standard_hash = hashlib.sha256(content).hexdigest()

        assert our_hash == standard_hash
