"""Unit tests for PDF ML Export security utilities.

Tests path validation, traversal prevention, and file security functions.
"""

import os
import tempfile
from pathlib import Path

import pytest


class TestPathSafety:
    """Tests for is_path_safe function."""

    def test_safe_paths(self):
        """Test that safe paths pass validation."""
        from label_studio.data_export.pdf_export.security import is_path_safe

        safe_paths = [
            "/home/user/documents/file.pdf",
            "relative/path/file.pdf",
            "simple.pdf",
            "/path/with spaces/file.pdf",
            "path/with-dashes/file.pdf",
        ]

        for path in safe_paths:
            is_safe, error = is_path_safe(path)
            assert is_safe, f"Path should be safe: {path}, error: {error}"

    def test_path_traversal_detection(self):
        """Test that path traversal attempts are detected."""
        from label_studio.data_export.pdf_export.security import is_path_safe

        unsafe_paths = [
            "../../../etc/passwd",
            "..\\..\\windows\\system32",
            "path/../../../secret",
            "%2e%2e/etc/passwd",
            "..%2fetc%2fpasswd",
        ]

        for path in unsafe_paths:
            is_safe, error = is_path_safe(path)
            assert not is_safe, f"Path traversal should be detected: {path}"

    def test_empty_path(self):
        """Test that empty path fails validation."""
        from label_studio.data_export.pdf_export.security import is_path_safe

        is_safe, error = is_path_safe("")
        assert not is_safe
        assert "Empty path" in error


class TestValidatePathWithinRoot:
    """Tests for validate_path_within_root function."""

    def test_path_within_root(self, tmp_path):
        """Test that paths within root pass validation."""
        from label_studio.data_export.pdf_export.security import validate_path_within_root

        # Create a file within root
        test_file = tmp_path / "subdir" / "file.txt"
        test_file.parent.mkdir(parents=True, exist_ok=True)
        test_file.touch()

        is_valid, error = validate_path_within_root(
            str(test_file),
            str(tmp_path),
        )
        assert is_valid, f"Path should be within root: {error}"

    def test_path_escapes_root(self, tmp_path):
        """Test that paths escaping root are rejected."""
        from label_studio.data_export.pdf_export.security import validate_path_within_root

        # Try to access parent directory
        escape_path = str(tmp_path / ".." / "secret.txt")

        is_valid, error = validate_path_within_root(
            escape_path,
            str(tmp_path),
        )
        assert not is_valid
        assert "escapes root" in error or "traversal" in error.lower()

    def test_relative_path_within_root(self, tmp_path):
        """Test that relative paths are resolved within root."""
        from label_studio.data_export.pdf_export.security import validate_path_within_root

        # Create file
        test_file = tmp_path / "data" / "file.txt"
        test_file.parent.mkdir(parents=True, exist_ok=True)
        test_file.touch()

        is_valid, error = validate_path_within_root(
            "data/file.txt",
            str(tmp_path),
        )
        assert is_valid, f"Relative path should be valid: {error}"

    def test_symlink_detection(self, tmp_path):
        """Test that symlinks are detected when not allowed."""
        from label_studio.data_export.pdf_export.security import validate_path_within_root

        # Create a file and symlink
        real_file = tmp_path / "real.txt"
        real_file.touch()

        symlink = tmp_path / "link.txt"
        try:
            symlink.symlink_to(real_file)
        except OSError:
            pytest.skip("Symlinks not supported on this platform")

        is_valid, error = validate_path_within_root(
            str(symlink),
            str(tmp_path),
            allow_symlinks=False,
        )
        assert not is_valid
        assert "symlink" in error.lower()


class TestSanitizeFilename:
    """Tests for sanitize_filename function."""

    def test_basic_sanitization(self):
        """Test basic filename sanitization."""
        from label_studio.data_export.pdf_export.security import sanitize_filename

        assert sanitize_filename("normal.pdf") == "normal.pdf"
        assert sanitize_filename("with spaces.pdf") == "with spaces.pdf"

    def test_dangerous_characters_removed(self):
        """Test that dangerous characters are replaced."""
        from label_studio.data_export.pdf_export.security import sanitize_filename

        result = sanitize_filename('file<>:"/\\|?*.pdf')
        assert "<" not in result
        assert ">" not in result
        assert ":" not in result
        assert '"' not in result
        assert "/" not in result
        assert "\\" not in result
        assert "|" not in result
        assert "?" not in result
        assert "*" not in result

    def test_leading_trailing_stripped(self):
        """Test that leading/trailing dots and spaces are stripped."""
        from label_studio.data_export.pdf_export.security import sanitize_filename

        assert sanitize_filename("...file.pdf") == "file.pdf"
        assert sanitize_filename("file.pdf...") == "file.pdf"
        assert sanitize_filename("  file.pdf  ") == "file.pdf"

    def test_empty_filename(self):
        """Test that empty filename becomes 'unnamed'."""
        from label_studio.data_export.pdf_export.security import sanitize_filename

        assert sanitize_filename("") == "unnamed"
        assert sanitize_filename("   ") == "unnamed"
        assert sanitize_filename("...") == "unnamed"

    def test_length_truncation(self):
        """Test that long filenames are truncated."""
        from label_studio.data_export.pdf_export.security import sanitize_filename

        long_name = "a" * 300 + ".pdf"
        result = sanitize_filename(long_name, max_length=255)

        assert len(result) <= 255
        assert result.endswith(".pdf")  # Extension preserved


class TestValidatePdfPath:
    """Tests for validate_pdf_path function."""

    def test_valid_pdf_path(self, tmp_path):
        """Test valid PDF path passes."""
        from label_studio.data_export.pdf_export.security import validate_pdf_path

        pdf_file = tmp_path / "test.pdf"
        pdf_file.touch()

        is_valid, error = validate_pdf_path(str(pdf_file))
        assert is_valid, f"Valid PDF should pass: {error}"

    def test_non_pdf_extension_rejected(self, tmp_path):
        """Test non-PDF files are rejected."""
        from label_studio.data_export.pdf_export.security import validate_pdf_path

        txt_file = tmp_path / "test.txt"
        txt_file.touch()

        is_valid, error = validate_pdf_path(str(txt_file))
        assert not is_valid
        assert "Not a PDF" in error

    def test_allowed_roots_enforced(self, tmp_path):
        """Test allowed roots restriction."""
        from label_studio.data_export.pdf_export.security import validate_pdf_path

        # Create PDF in a non-allowed location
        other_dir = tmp_path / "other"
        other_dir.mkdir()
        pdf_file = other_dir / "test.pdf"
        pdf_file.touch()

        allowed_dir = tmp_path / "allowed"
        allowed_dir.mkdir()

        is_valid, error = validate_pdf_path(
            str(pdf_file),
            allowed_roots=[str(allowed_dir)],
        )
        assert not is_valid
        assert "not within allowed" in error

    def test_nonexistent_file_check(self, tmp_path):
        """Test nonexistent file check."""
        from label_studio.data_export.pdf_export.security import validate_pdf_path

        is_valid, error = validate_pdf_path(
            str(tmp_path / "nonexistent.pdf"),
            check_exists=True,
        )
        assert not is_valid
        assert "does not exist" in error


class TestValidateOutputPath:
    """Tests for validate_output_path function."""

    def test_valid_output_path(self, tmp_path):
        """Test valid output path passes."""
        from label_studio.data_export.pdf_export.security import validate_output_path

        output = tmp_path / "output" / "result.json"
        tmp_path.joinpath("output").mkdir()

        is_valid, error = validate_output_path(
            str(output),
            str(tmp_path),
            create_parents=False,
        )
        assert is_valid, f"Valid output should pass: {error}"

    def test_output_escapes_root_rejected(self, tmp_path):
        """Test output path escaping root is rejected."""
        from label_studio.data_export.pdf_export.security import validate_output_path

        is_valid, error = validate_output_path(
            str(tmp_path / ".." / "escape.json"),
            str(tmp_path),
        )
        assert not is_valid


class TestFileSize:
    """Tests for file size validation."""

    def test_valid_file_size(self, tmp_path):
        """Test file within size limit passes."""
        from label_studio.data_export.pdf_export.security import validate_file_size

        test_file = tmp_path / "small.bin"
        test_file.write_bytes(b"x" * 1024)  # 1KB

        is_valid, error = validate_file_size(
            str(test_file),
            max_size_bytes=1024 * 1024,  # 1MB limit
        )
        assert is_valid

    def test_oversized_file_rejected(self, tmp_path):
        """Test file exceeding size limit is rejected."""
        from label_studio.data_export.pdf_export.security import validate_file_size

        test_file = tmp_path / "large.bin"
        test_file.write_bytes(b"x" * 2048)  # 2KB

        is_valid, error = validate_file_size(
            str(test_file),
            max_size_bytes=1024,  # 1KB limit
        )
        assert not is_valid
        assert "exceeds maximum size" in error


class TestFileChecksum:
    """Tests for file checksum functions."""

    def test_compute_checksum(self, tmp_path):
        """Test checksum computation."""
        from label_studio.data_export.pdf_export.security import compute_file_checksum
        import hashlib

        content = b"test content for checksum"
        test_file = tmp_path / "test.bin"
        test_file.write_bytes(content)

        result = compute_file_checksum(str(test_file))
        expected = hashlib.sha256(content).hexdigest()

        assert result == expected

    def test_verify_integrity_pass(self, tmp_path):
        """Test integrity verification passes with correct checksum."""
        from label_studio.data_export.pdf_export.security import (
            compute_file_checksum,
            verify_file_integrity,
        )

        content = b"test content"
        test_file = tmp_path / "test.bin"
        test_file.write_bytes(content)

        checksum = compute_file_checksum(str(test_file))

        is_valid, error = verify_file_integrity(str(test_file), checksum)
        assert is_valid

    def test_verify_integrity_fail(self, tmp_path):
        """Test integrity verification fails with wrong checksum."""
        from label_studio.data_export.pdf_export.security import verify_file_integrity

        test_file = tmp_path / "test.bin"
        test_file.write_bytes(b"test content")

        is_valid, error = verify_file_integrity(str(test_file), "wrong_checksum")
        assert not is_valid
        assert "mismatch" in error


class TestSecurePathContext:
    """Tests for SecurePathContext class."""

    def test_context_manager(self, tmp_path):
        """Test secure path context works as context manager."""
        from label_studio.data_export.pdf_export.security import SecurePathContext

        with SecurePathContext(str(tmp_path)) as ctx:
            assert ctx.root_dir == tmp_path.resolve()

    def test_read_file_within_root(self, tmp_path):
        """Test reading file within root."""
        from label_studio.data_export.pdf_export.security import SecurePathContext

        # Create test file
        test_file = tmp_path / "test.txt"
        test_file.write_text("hello world")

        with SecurePathContext(str(tmp_path)) as ctx:
            content = ctx.read_file("test.txt")
            assert content == "hello world"

    def test_write_file_within_root(self, tmp_path):
        """Test writing file within root."""
        from label_studio.data_export.pdf_export.security import SecurePathContext

        with SecurePathContext(str(tmp_path)) as ctx:
            ctx.write_file("output/result.txt", "test output")

        result_file = tmp_path / "output" / "result.txt"
        assert result_file.exists()
        assert result_file.read_text() == "test output"

    def test_path_escape_blocked(self, tmp_path):
        """Test that path escape attempts are blocked."""
        from label_studio.data_export.pdf_export.security import (
            SecurePathContext,
            PathSecurityError,
        )

        with SecurePathContext(str(tmp_path)) as ctx:
            with pytest.raises(PathSecurityError):
                ctx.resolve_path("../../../etc/passwd")

    def test_extension_restriction(self, tmp_path):
        """Test extension restrictions are enforced."""
        from label_studio.data_export.pdf_export.security import (
            SecurePathContext,
            PathSecurityError,
        )

        # Create files
        (tmp_path / "allowed.pdf").touch()
        (tmp_path / "blocked.exe").touch()

        with SecurePathContext(
            str(tmp_path),
            allowed_extensions={".pdf", ".json"},
        ) as ctx:
            # Should work
            ctx.resolve_path("allowed.pdf")

            # Should fail
            with pytest.raises(PathSecurityError) as exc_info:
                ctx.resolve_path("blocked.exe")

            assert "extension not allowed" in str(exc_info.value)

    def test_list_files(self, tmp_path):
        """Test listing files within root."""
        from label_studio.data_export.pdf_export.security import SecurePathContext

        # Create test files
        (tmp_path / "file1.pdf").touch()
        (tmp_path / "file2.pdf").touch()
        (tmp_path / "file3.txt").touch()

        with SecurePathContext(str(tmp_path)) as ctx:
            pdf_files = ctx.list_files("", "*.pdf")
            assert len(pdf_files) == 2
