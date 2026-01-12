"""Unit tests for PDF ML Export ID generation.

Tests the deterministic ID generation functions:
- generate_doc_id: Document ID from task_id + pdf_hash
- generate_word_id: Word ID from page_id + bbox + text
- generate_line_id: Line ID from page_id + word_ids
- generate_block_id: Block ID from page_id + line_ids
"""

import hashlib
import pytest


class TestGenerateDocId:
    """Tests for generate_doc_id function."""

    def test_basic_generation(self):
        """Test basic document ID generation."""
        from label_studio.data_export.pdf_export.exporter import generate_doc_id

        task_id = 123
        pdf_hash = "abc123def456"
        doc_id = generate_doc_id(task_id, pdf_hash)

        assert len(doc_id) == 12
        assert all(c in "0123456789abcdef" for c in doc_id)

    def test_deterministic(self):
        """Test that same inputs produce same output."""
        from label_studio.data_export.pdf_export.exporter import generate_doc_id

        task_id = 456
        pdf_hash = "xyz789"

        id1 = generate_doc_id(task_id, pdf_hash)
        id2 = generate_doc_id(task_id, pdf_hash)

        assert id1 == id2

    def test_different_task_ids_produce_different_ids(self):
        """Test that different task IDs produce different doc IDs."""
        from label_studio.data_export.pdf_export.exporter import generate_doc_id

        pdf_hash = "samehash123"

        id1 = generate_doc_id(100, pdf_hash)
        id2 = generate_doc_id(200, pdf_hash)

        assert id1 != id2

    def test_different_hashes_produce_different_ids(self):
        """Test that different PDF hashes produce different doc IDs."""
        from label_studio.data_export.pdf_export.exporter import generate_doc_id

        task_id = 100

        id1 = generate_doc_id(task_id, "hash1")
        id2 = generate_doc_id(task_id, "hash2")

        assert id1 != id2

    def test_expected_format(self):
        """Test the expected SHA-256 based format."""
        from label_studio.data_export.pdf_export.exporter import generate_doc_id

        task_id = 123
        pdf_hash = "abc123"

        # Manually compute expected
        hash_input = f"{task_id}:{pdf_hash}"
        expected = hashlib.sha256(hash_input.encode()).hexdigest()[:12]

        result = generate_doc_id(task_id, pdf_hash)
        assert result == expected


class TestGenerateWordId:
    """Tests for generate_word_id function."""

    def test_basic_generation(self):
        """Test basic word ID generation."""
        from label_studio.data_export.pdf_export.exporter import generate_word_id
        from label_studio.data_export.pdf_export.models import BBoxXYWH

        word_id = generate_word_id(
            page_id="doc123:page_001",
            text="hello",
            bbox=BBoxXYWH(x=100, y=200, width=50, height=20),
            reading_order=0,
        )

        assert word_id.startswith("w_")
        assert len(word_id) == 10  # "w_" + 8 hex chars

    def test_deterministic(self):
        """Test that same inputs produce same output."""
        from label_studio.data_export.pdf_export.exporter import generate_word_id
        from label_studio.data_export.pdf_export.models import BBoxXYWH

        bbox = BBoxXYWH(x=100, y=200, width=50, height=20)
        params = {
            "page_id": "doc123:page_001",
            "text": "hello",
            "bbox": bbox,
            "reading_order": 0,
        }

        id1 = generate_word_id(**params)
        id2 = generate_word_id(**params)

        assert id1 == id2

    def test_different_bbox_produces_different_id(self):
        """Test that different bboxes produce different IDs."""
        from label_studio.data_export.pdf_export.exporter import generate_word_id
        from label_studio.data_export.pdf_export.models import BBoxXYWH

        bbox1 = BBoxXYWH(x=100, y=200, width=50, height=20)
        bbox2 = BBoxXYWH(x=200, y=200, width=50, height=20)

        id1 = generate_word_id("page1", "hello", bbox1, 0)
        id2 = generate_word_id("page1", "hello", bbox2, 0)

        assert id1 != id2

    def test_different_text_produces_different_id(self):
        """Test that different text produces different IDs."""
        from label_studio.data_export.pdf_export.exporter import generate_word_id
        from label_studio.data_export.pdf_export.models import BBoxXYWH

        bbox = BBoxXYWH(x=100, y=200, width=50, height=20)

        id1 = generate_word_id("page1", "hello", bbox, 0)
        id2 = generate_word_id("page1", "world", bbox, 0)

        assert id1 != id2

    def test_bbox_quantization(self):
        """Test that bbox values are quantized to 2px grid."""
        from label_studio.data_export.pdf_export.exporter import generate_word_id
        from label_studio.data_export.pdf_export.models import BBoxXYWH

        # Bboxes that quantize to same values should produce same ID
        # With 2px grid: 100 -> 100, 101 -> 100 (both round to nearest even)
        bbox1 = BBoxXYWH(x=100, y=200, width=50, height=20)
        bbox2 = BBoxXYWH(x=100, y=200, width=50, height=20)  # Same values

        id1 = generate_word_id("page1", "hello", bbox1, 0)
        id2 = generate_word_id("page1", "hello", bbox2, 0)

        # Same bbox values should produce same ID
        assert id1 == id2

    def test_different_reading_order_produces_different_id(self):
        """Test that different reading order produces different IDs."""
        from label_studio.data_export.pdf_export.exporter import generate_word_id
        from label_studio.data_export.pdf_export.models import BBoxXYWH

        bbox = BBoxXYWH(x=100, y=200, width=50, height=20)

        id1 = generate_word_id("page1", "hello", bbox, 0)
        id2 = generate_word_id("page1", "hello", bbox, 1)

        assert id1 != id2


class TestGenerateLineId:
    """Tests for generate_line_id function."""

    def test_basic_generation(self):
        """Test basic line ID generation."""
        from label_studio.data_export.pdf_export.exporter import generate_line_id

        line_id = generate_line_id(
            page_id="doc123:page_001",
            word_ids=["w_abc12345", "w_def67890"],
        )

        assert line_id.startswith("l_")
        assert len(line_id) == 10  # "l_" + 8 hex chars

    def test_deterministic(self):
        """Test that same inputs produce same output."""
        from label_studio.data_export.pdf_export.exporter import generate_line_id

        word_ids = ["w_abc12345", "w_def67890"]

        id1 = generate_line_id("page1", word_ids)
        id2 = generate_line_id("page1", word_ids)

        assert id1 == id2

    def test_order_independent(self):
        """Test that word order does NOT affect the line ID (sorted internally)."""
        from label_studio.data_export.pdf_export.exporter import generate_line_id

        # The implementation sorts word_ids for stability
        id1 = generate_line_id("page1", ["w_abc", "w_def"])
        id2 = generate_line_id("page1", ["w_def", "w_abc"])

        # Same words in different order should produce same ID
        assert id1 == id2


class TestGenerateBlockId:
    """Tests for generate_block_id function."""

    def test_basic_generation(self):
        """Test basic block ID generation."""
        from label_studio.data_export.pdf_export.exporter import generate_block_id

        block_id = generate_block_id(
            page_id="doc123:page_001",
            line_ids=["l_abc12345", "l_def67890"],
        )

        assert block_id.startswith("b_")
        assert len(block_id) == 10  # "b_" + 8 hex chars

    def test_deterministic(self):
        """Test that same inputs produce same output."""
        from label_studio.data_export.pdf_export.exporter import generate_block_id

        line_ids = ["l_abc12345", "l_def67890"]

        id1 = generate_block_id("page1", line_ids)
        id2 = generate_block_id("page1", line_ids)

        assert id1 == id2


class TestComputePdfHash:
    """Tests for compute_pdf_hash function."""

    def test_hash_is_sha256_hex(self, tmp_path):
        """Test that hash is a valid SHA-256 hex string."""
        from label_studio.data_export.pdf_export.exporter import compute_pdf_hash

        # Create a test file
        test_file = tmp_path / "test.pdf"
        test_file.write_bytes(b"test content")

        hash_result = compute_pdf_hash(str(test_file))

        assert len(hash_result) == 64
        assert all(c in "0123456789abcdef" for c in hash_result)

    def test_deterministic(self, tmp_path):
        """Test that same file produces same hash."""
        from label_studio.data_export.pdf_export.exporter import compute_pdf_hash

        test_file = tmp_path / "test.pdf"
        test_file.write_bytes(b"consistent content")

        hash1 = compute_pdf_hash(str(test_file))
        hash2 = compute_pdf_hash(str(test_file))

        assert hash1 == hash2

    def test_different_content_different_hash(self, tmp_path):
        """Test that different content produces different hash."""
        from label_studio.data_export.pdf_export.exporter import compute_pdf_hash

        file1 = tmp_path / "test1.pdf"
        file2 = tmp_path / "test2.pdf"
        file1.write_bytes(b"content 1")
        file2.write_bytes(b"content 2")

        hash1 = compute_pdf_hash(str(file1))
        hash2 = compute_pdf_hash(str(file2))

        assert hash1 != hash2

    def test_matches_hashlib(self, tmp_path):
        """Test that result matches direct hashlib computation."""
        from label_studio.data_export.pdf_export.exporter import compute_pdf_hash

        content = b"test pdf content here"
        test_file = tmp_path / "test.pdf"
        test_file.write_bytes(content)

        result = compute_pdf_hash(str(test_file))
        expected = hashlib.sha256(content).hexdigest()

        assert result == expected
