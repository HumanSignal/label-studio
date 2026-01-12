"""Performance utilities for PDF ML Export.

This module provides streaming and batching utilities for handling
large documents efficiently:
- Streaming page processors to reduce memory usage
- Batch processors for parallel execution
- Memory-efficient iterators for large annotation sets
- Progress tracking utilities
"""

import logging
import os
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Callable, Generator, Iterable, Iterator, List, Optional, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


# =============================================================================
# Streaming Utilities
# =============================================================================


def stream_pages(pdf_path: str) -> Generator[int, None, None]:
    """Stream page numbers from a PDF without loading entire document.

    Yields page numbers one at a time to minimize memory usage.

    Args:
        pdf_path: Path to PDF file

    Yields:
        Page numbers (1-indexed)
    """
    from .layout_extractor import get_pdf_page_count

    num_pages = get_pdf_page_count(pdf_path)

    for page_num in range(1, num_pages + 1):
        yield page_num


def process_pages_streaming(
    pdf_path: str,
    page_processor: Callable[[str, int], Any],
    progress_callback: Optional[Callable[[int, int], None]] = None,
) -> Generator[Any, None, None]:
    """Process PDF pages in a streaming manner.

    Processes one page at a time to minimize memory footprint.
    Useful for very large PDFs.

    Args:
        pdf_path: Path to PDF file
        page_processor: Function to process each page (takes pdf_path, page_num)
        progress_callback: Optional callback for progress updates (current, total)

    Yields:
        Result from page_processor for each page
    """
    from .layout_extractor import get_pdf_page_count

    num_pages = get_pdf_page_count(pdf_path)
    logger.info(f"Streaming {num_pages} pages from {pdf_path}")

    for page_num in range(1, num_pages + 1):
        try:
            result = page_processor(pdf_path, page_num)
            yield result

            if progress_callback:
                progress_callback(page_num, num_pages)

        except Exception as e:
            logger.error(f"Error processing page {page_num}: {e}")
            raise


# =============================================================================
# Batching Utilities
# =============================================================================


@dataclass
class BatchConfig:
    """Configuration for batch processing."""

    batch_size: int = 10
    max_memory_mb: int = 512
    parallel_workers: int = 1


def batch_iterator(items: Iterable[T], batch_size: int) -> Generator[List[T], None, None]:
    """Iterate over items in batches.

    Args:
        items: Iterable of items to batch
        batch_size: Number of items per batch

    Yields:
        Lists of items, each of size batch_size (or smaller for last batch)
    """
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) >= batch_size:
            yield batch
            batch = []

    if batch:
        yield batch


def process_in_batches(
    items: Iterable[T],
    processor: Callable[[List[T]], List[Any]],
    batch_size: int = 100,
    progress_callback: Optional[Callable[[int], None]] = None,
) -> Generator[Any, None, None]:
    """Process items in batches for efficiency.

    Useful for bulk database operations or API calls.

    Args:
        items: Items to process
        processor: Function that processes a batch of items
        batch_size: Number of items per batch
        progress_callback: Optional callback with processed count

    Yields:
        Individual results from processor
    """
    processed = 0

    for batch in batch_iterator(items, batch_size):
        try:
            results = processor(batch)
            for result in results:
                yield result
                processed += 1

            if progress_callback:
                progress_callback(processed)

        except Exception as e:
            logger.error(f"Error processing batch: {e}")
            raise


# =============================================================================
# Memory-Efficient Iterators
# =============================================================================


class StreamingJsonlReader:
    """Memory-efficient reader for JSONL files.

    Reads records one at a time without loading entire file into memory.
    Useful for processing large annotation exports.
    """

    def __init__(self, filepath: str):
        """Initialize reader.

        Args:
            filepath: Path to JSONL file
        """
        self.filepath = filepath
        self._file = None

    def __enter__(self):
        self._file = open(self.filepath, "r", encoding="utf-8")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._file:
            self._file.close()

    def __iter__(self) -> Iterator[dict]:
        """Iterate over records."""
        import json

        if self._file is None:
            raise RuntimeError("Reader must be used as context manager")

        for line in self._file:
            line = line.strip()
            if line:
                yield json.loads(line)

    def count(self) -> int:
        """Count records without loading all into memory."""
        count = 0
        with open(self.filepath, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    count += 1
        return count


class StreamingJsonlWriter:
    """Memory-efficient writer for JSONL files.

    Writes records immediately to disk without buffering.
    """

    def __init__(self, filepath: str):
        """Initialize writer.

        Args:
            filepath: Path to output JSONL file
        """
        self.filepath = filepath
        self._file = None
        self._count = 0

    def __enter__(self):
        self._file = open(self.filepath, "w", encoding="utf-8")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._file:
            self._file.close()

    def write(self, record: dict) -> None:
        """Write a single record.

        Args:
            record: Dictionary to write as JSON line
        """
        import json

        if self._file is None:
            raise RuntimeError("Writer must be used as context manager")

        line = json.dumps(record, ensure_ascii=False)
        self._file.write(line)
        self._file.write("\n")
        self._count += 1

    @property
    def count(self) -> int:
        """Number of records written."""
        return self._count


# =============================================================================
# Progress Tracking
# =============================================================================


@dataclass
class ProgressTracker:
    """Track progress of long-running operations."""

    total: int
    current: int = 0
    message: str = ""

    def update(self, current: int, message: str = "") -> None:
        """Update progress.

        Args:
            current: Current item number
            message: Optional progress message
        """
        self.current = current
        if message:
            self.message = message

    def increment(self, amount: int = 1) -> None:
        """Increment progress by amount."""
        self.current += amount

    @property
    def percent(self) -> float:
        """Progress as percentage (0-100)."""
        if self.total == 0:
            return 100.0
        return (self.current / self.total) * 100

    @property
    def is_complete(self) -> bool:
        """Whether progress is complete."""
        return self.current >= self.total


@contextmanager
def track_progress(total: int, description: str = ""):
    """Context manager for tracking progress.

    Args:
        total: Total items to process
        description: Description of operation

    Yields:
        ProgressTracker instance
    """
    tracker = ProgressTracker(total=total, message=description)
    logger.info(f"Starting: {description} ({total} items)")

    try:
        yield tracker
    finally:
        logger.info(
            f"Completed: {description} ({tracker.current}/{tracker.total}, "
            f"{tracker.percent:.1f}%)"
        )


# =============================================================================
# Memory Management
# =============================================================================


def estimate_memory_usage(num_pages: int, avg_words_per_page: int = 500) -> int:
    """Estimate memory usage for export in bytes.

    Args:
        num_pages: Number of pages
        avg_words_per_page: Average words per page

    Returns:
        Estimated memory usage in bytes
    """
    # Rough estimates:
    # - Word object: ~200 bytes
    # - Line object: ~150 bytes (assume 10 words/line = 50 lines/page)
    # - Block object: ~100 bytes (assume 5 blocks/page)
    # - Page layout JSON: ~50KB/page

    words = num_pages * avg_words_per_page
    lines = num_pages * 50
    blocks = num_pages * 5
    json_size = num_pages * 50000

    word_memory = words * 200
    line_memory = lines * 150
    block_memory = blocks * 100

    return word_memory + line_memory + block_memory + json_size


def should_use_streaming(num_pages: int, max_memory_mb: int = 512) -> bool:
    """Determine if streaming should be used based on memory constraints.

    Args:
        num_pages: Number of pages
        max_memory_mb: Maximum memory to use in MB

    Returns:
        True if streaming should be used
    """
    estimated = estimate_memory_usage(num_pages)
    max_bytes = max_memory_mb * 1024 * 1024

    return estimated > max_bytes


# =============================================================================
# Chunk Processing
# =============================================================================


def chunk_pages(
    num_pages: int,
    chunk_size: int = 50,
) -> Generator[tuple, None, None]:
    """Split pages into chunks for batch processing.

    Args:
        num_pages: Total number of pages
        chunk_size: Pages per chunk

    Yields:
        Tuples of (start_page, end_page) for each chunk
    """
    for start in range(1, num_pages + 1, chunk_size):
        end = min(start + chunk_size - 1, num_pages)
        yield (start, end)


def process_pdf_in_chunks(
    pdf_path: str,
    page_processor: Callable[[str, int], Any],
    chunk_size: int = 50,
    progress_callback: Optional[Callable[[int, int], None]] = None,
) -> List[Any]:
    """Process PDF in chunks to balance memory and performance.

    This approach:
    - Processes multiple pages at once (better than pure streaming)
    - Clears memory between chunks (better than loading all at once)

    Args:
        pdf_path: Path to PDF file
        page_processor: Function to process each page
        chunk_size: Pages per chunk
        progress_callback: Progress callback

    Returns:
        List of results from page_processor
    """
    from .layout_extractor import get_pdf_page_count
    import gc

    num_pages = get_pdf_page_count(pdf_path)
    results = []
    processed = 0

    for start, end in chunk_pages(num_pages, chunk_size):
        chunk_results = []

        for page_num in range(start, end + 1):
            result = page_processor(pdf_path, page_num)
            chunk_results.append(result)
            processed += 1

            if progress_callback:
                progress_callback(processed, num_pages)

        results.extend(chunk_results)

        # Clear memory between chunks
        del chunk_results
        gc.collect()

    return results
