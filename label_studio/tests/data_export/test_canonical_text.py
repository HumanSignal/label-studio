"""Unit tests for PDF ML Export canonical text construction.

Tests the canonical text functions:
- build_canonical_text: Build canonical text from elements
- build_canonical_index: Build character offset index
- get_char_range_for_word_ids: Get char range for word IDs
- find_word_ids_in_range: Find words in char range
"""

import pytest


class TestBuildCanonicalText:
    """Tests for build_canonical_text function."""

    def test_single_word(self):
        """Test canonical text with single word."""
        from label_studio.data_export.pdf_export.canonical_text import build_canonical_text
        from label_studio.data_export.pdf_export.models import Word, Line, Block, BBoxXYWH

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
        ]
        lines = [
            Line(
                line_id="l_00000001",
                bbox=BBoxXYWH(x=0, y=0, width=50, height=20),
                block_id="b_00000001",
                word_ids=["w_00000001"],
                text="Hello",
                char_start=0,
                char_end=5,
                reading_order=0,
            ),
        ]
        blocks = [
            Block(
                block_id="b_00000001",
                bbox=BBoxXYWH(x=0, y=0, width=50, height=20),
                block_type="paragraph",
                line_ids=["l_00000001"],
                text="Hello",
                char_start=0,
                char_end=5,
                reading_order=0,
            ),
        ]

        text = build_canonical_text(blocks, lines, words)

        assert text == "Hello"

    def test_multiple_words_same_line(self):
        """Test canonical text with multiple words on same line."""
        from label_studio.data_export.pdf_export.canonical_text import build_canonical_text
        from label_studio.data_export.pdf_export.models import Word, Line, Block, BBoxXYWH

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

        text = build_canonical_text(blocks, lines, words)

        # Words should be joined by single space
        assert text == "Hello World"

    def test_multiple_lines(self):
        """Test canonical text with multiple lines."""
        from label_studio.data_export.pdf_export.canonical_text import build_canonical_text
        from label_studio.data_export.pdf_export.models import Word, Line, Block, BBoxXYWH

        words = [
            Word(
                word_id="w_00000001",
                text="Line1",
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
                text="Line2",
                bbox=BBoxXYWH(x=0, y=30, width=50, height=20),
                line_id="l_00000002",
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
                bbox=BBoxXYWH(x=0, y=0, width=50, height=20),
                block_id="b_00000001",
                word_ids=["w_00000001"],
                text="Line1",
                char_start=0,
                char_end=5,
                reading_order=0,
            ),
            Line(
                line_id="l_00000002",
                bbox=BBoxXYWH(x=0, y=30, width=50, height=20),
                block_id="b_00000001",
                word_ids=["w_00000002"],
                text="Line2",
                char_start=6,
                char_end=11,
                reading_order=1,
            ),
        ]
        blocks = [
            Block(
                block_id="b_00000001",
                bbox=BBoxXYWH(x=0, y=0, width=50, height=50),
                block_type="paragraph",
                line_ids=["l_00000001", "l_00000002"],
                text="Line1\nLine2",
                char_start=0,
                char_end=11,
                reading_order=0,
            ),
        ]

        text = build_canonical_text(blocks, lines, words)

        # Lines should be separated by \n
        assert "Line1" in text
        assert "Line2" in text
        assert "\n" in text

    def test_multiple_blocks(self):
        """Test canonical text with multiple blocks."""
        from label_studio.data_export.pdf_export.canonical_text import build_canonical_text
        from label_studio.data_export.pdf_export.models import Word, Line, Block, BBoxXYWH

        words = [
            Word(
                word_id="w_00000001",
                text="Block1",
                bbox=BBoxXYWH(x=0, y=0, width=50, height=20),
                line_id="l_00000001",
                block_id="b_00000001",
                reading_order=0,
                char_start=0,
                char_end=6,
                layer_id="pdf_text",
            ),
            Word(
                word_id="w_00000002",
                text="Block2",
                bbox=BBoxXYWH(x=0, y=100, width=50, height=20),
                line_id="l_00000002",
                block_id="b_00000002",
                reading_order=1,
                char_start=8,
                char_end=14,
                layer_id="pdf_text",
            ),
        ]
        lines = [
            Line(
                line_id="l_00000001",
                bbox=BBoxXYWH(x=0, y=0, width=50, height=20),
                block_id="b_00000001",
                word_ids=["w_00000001"],
                text="Block1",
                char_start=0,
                char_end=6,
                reading_order=0,
            ),
            Line(
                line_id="l_00000002",
                bbox=BBoxXYWH(x=0, y=100, width=50, height=20),
                block_id="b_00000002",
                word_ids=["w_00000002"],
                text="Block2",
                char_start=8,
                char_end=14,
                reading_order=0,
            ),
        ]
        blocks = [
            Block(
                block_id="b_00000001",
                bbox=BBoxXYWH(x=0, y=0, width=50, height=20),
                block_type="paragraph",
                line_ids=["l_00000001"],
                text="Block1",
                char_start=0,
                char_end=6,
                reading_order=0,
            ),
            Block(
                block_id="b_00000002",
                bbox=BBoxXYWH(x=0, y=100, width=50, height=20),
                block_type="paragraph",
                line_ids=["l_00000002"],
                text="Block2",
                char_start=8,
                char_end=14,
                reading_order=1,
            ),
        ]

        text = build_canonical_text(blocks, lines, words)

        # Blocks should be separated by \n\n
        assert "Block1" in text
        assert "Block2" in text
        assert "\n\n" in text


class TestBuildCanonicalIndex:
    """Tests for build_canonical_index function."""

    def test_index_has_required_sections(self):
        """Test that index has words, lines, blocks sections."""
        from label_studio.data_export.pdf_export.canonical_text import build_canonical_index
        from label_studio.data_export.pdf_export.models import Word, Line, Block, BBoxXYWH

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
        ]
        lines = [
            Line(
                line_id="l_00000001",
                bbox=BBoxXYWH(x=0, y=0, width=50, height=20),
                block_id="b_00000001",
                word_ids=["w_00000001"],
                text="Hello",
                char_start=0,
                char_end=5,
                reading_order=0,
            ),
        ]
        blocks = [
            Block(
                block_id="b_00000001",
                bbox=BBoxXYWH(x=0, y=0, width=50, height=20),
                block_type="paragraph",
                line_ids=["l_00000001"],
                text="Hello",
                char_start=0,
                char_end=5,
                reading_order=0,
            ),
        ]

        # build_canonical_index returns Tuple[str, CanonicalIndex]
        text, index = build_canonical_index(blocks, lines, words)

        assert hasattr(index, "words")
        assert hasattr(index, "lines")
        assert hasattr(index, "blocks")


class TestGetCharRangeForWordIds:
    """Tests for get_char_range_for_word_ids function."""

    def test_single_word_range(self):
        """Test char range for single word."""
        from label_studio.data_export.pdf_export.canonical_text import get_char_range_for_word_ids
        from label_studio.data_export.pdf_export.models import CanonicalIndex

        # CanonicalIndex.words stores tuples (char_start, char_end)
        index = CanonicalIndex(
            words={"w_00000001": (0, 5)},
            lines={},
            blocks={},
        )

        start, end = get_char_range_for_word_ids(["w_00000001"], index)

        assert start == 0
        assert end == 5

    def test_multiple_words_range(self):
        """Test char range spanning multiple words."""
        from label_studio.data_export.pdf_export.canonical_text import get_char_range_for_word_ids
        from label_studio.data_export.pdf_export.models import CanonicalIndex

        # CanonicalIndex.words stores tuples (char_start, char_end)
        index = CanonicalIndex(
            words={
                "w_00000001": (0, 5),
                "w_00000002": (6, 11),
                "w_00000003": (12, 17),
            },
            lines={},
            blocks={},
        )

        start, end = get_char_range_for_word_ids(
            ["w_00000001", "w_00000002", "w_00000003"], index
        )

        assert start == 0
        assert end == 17

    def test_non_contiguous_words(self):
        """Test char range for non-contiguous words."""
        from label_studio.data_export.pdf_export.canonical_text import get_char_range_for_word_ids
        from label_studio.data_export.pdf_export.models import CanonicalIndex

        # CanonicalIndex.words stores tuples (char_start, char_end)
        index = CanonicalIndex(
            words={
                "w_00000001": (0, 5),
                "w_00000003": (12, 17),
            },
            lines={},
            blocks={},
        )

        start, end = get_char_range_for_word_ids(["w_00000001", "w_00000003"], index)

        # Should return min start to max end
        assert start == 0
        assert end == 17


class TestFindWordIdsInRange:
    """Tests for find_word_ids_in_range function."""

    def test_find_words_in_range(self):
        """Test finding words within char range."""
        from label_studio.data_export.pdf_export.canonical_text import find_word_ids_in_range
        from label_studio.data_export.pdf_export.models import CanonicalIndex

        # CanonicalIndex.words stores tuples (char_start, char_end)
        index = CanonicalIndex(
            words={
                "w_00000001": (0, 5),
                "w_00000002": (6, 11),
                "w_00000003": (12, 17),
            },
            lines={},
            blocks={},
        )

        word_ids = find_word_ids_in_range(0, 11, index)

        assert "w_00000001" in word_ids
        assert "w_00000002" in word_ids
        assert "w_00000003" not in word_ids

    def test_partial_overlap(self):
        """Test finding words with partial overlap."""
        from label_studio.data_export.pdf_export.canonical_text import find_word_ids_in_range
        from label_studio.data_export.pdf_export.models import CanonicalIndex

        # CanonicalIndex.words stores tuples (char_start, char_end)
        index = CanonicalIndex(
            words={
                "w_00000001": (0, 10),
                "w_00000002": (10, 20),
            },
            lines={},
            blocks={},
        )

        # Range overlaps with both words
        word_ids = find_word_ids_in_range(5, 15, index)

        assert "w_00000001" in word_ids
        assert "w_00000002" in word_ids

    def test_no_words_in_range(self):
        """Test when no words are in range."""
        from label_studio.data_export.pdf_export.canonical_text import find_word_ids_in_range
        from label_studio.data_export.pdf_export.models import CanonicalIndex

        # CanonicalIndex.words stores tuples (char_start, char_end)
        index = CanonicalIndex(
            words={
                "w_00000001": (0, 5),
            },
            lines={},
            blocks={},
        )

        word_ids = find_word_ids_in_range(100, 200, index)

        assert len(word_ids) == 0
