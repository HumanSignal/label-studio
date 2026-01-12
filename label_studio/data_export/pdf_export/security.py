"""Security utilities for PDF ML Export.

This module provides security-related functions for validating file paths
and preventing common security vulnerabilities like path traversal attacks.

Key security considerations:
- Path traversal prevention (../../../etc/passwd)
- Symlink following restrictions
- File type validation
- Size limits enforcement
"""

import hashlib
import logging
import os
import re
from pathlib import Path
from typing import List, Optional, Set, Tuple

logger = logging.getLogger(__name__)

# =============================================================================
# Path Security
# =============================================================================

# Maximum allowed path depth to prevent excessive nesting
MAX_PATH_DEPTH = 50

# Disallowed path components
DISALLOWED_PATH_COMPONENTS = frozenset([
    "..",  # Parent directory traversal
    "~",   # Home directory expansion
])

# Patterns that might indicate path traversal attempts
PATH_TRAVERSAL_PATTERNS = [
    re.compile(r"\.\./"),      # Unix parent dir
    re.compile(r"\.\.\\"),     # Windows parent dir
    re.compile(r"%2e%2e/", re.IGNORECASE),   # URL encoded ..
    re.compile(r"%2e%2e\\", re.IGNORECASE),  # URL encoded Windows
    re.compile(r"\.\.%2f", re.IGNORECASE),   # Mixed encoding
    re.compile(r"\.\.%5c", re.IGNORECASE),   # Mixed encoding Windows
]


class PathSecurityError(Exception):
    """Raised when a path security violation is detected."""

    def __init__(self, message: str, path: str, violation_type: str):
        super().__init__(message)
        self.path = path
        self.violation_type = violation_type


def is_path_safe(path: str) -> Tuple[bool, Optional[str]]:
    """Check if a path is safe (no traversal attempts).

    Args:
        path: The path to validate

    Returns:
        Tuple of (is_safe, error_message)
    """
    if not path:
        return False, "Empty path"

    # Check for URL-encoded traversal attempts
    for pattern in PATH_TRAVERSAL_PATTERNS:
        if pattern.search(path):
            return False, f"Path traversal pattern detected: {pattern.pattern}"

    # Normalize and check for parent directory references
    normalized = os.path.normpath(path)

    # Check for disallowed components
    parts = Path(path).parts
    for part in parts:
        if part in DISALLOWED_PATH_COMPONENTS:
            return False, f"Disallowed path component: {part}"

    # Check path depth
    if len(parts) > MAX_PATH_DEPTH:
        return False, f"Path exceeds maximum depth of {MAX_PATH_DEPTH}"

    return True, None


def validate_path_within_root(
    path: str,
    root_dir: str,
    allow_symlinks: bool = False,
) -> Tuple[bool, Optional[str]]:
    """Validate that a path is within a root directory.

    This prevents path traversal attacks by ensuring the resolved path
    stays within the allowed root directory.

    Args:
        path: The path to validate (can be relative or absolute)
        root_dir: The root directory that path must be within
        allow_symlinks: Whether to allow symlinks (default False for security)

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        # First check basic path safety
        is_safe, error = is_path_safe(path)
        if not is_safe:
            return False, error

        # Convert to Path objects
        root = Path(root_dir).resolve()
        target = Path(path)

        # If path is relative, join with root
        if not target.is_absolute():
            target = root / target

        # Resolve to absolute path (follows symlinks)
        resolved = target.resolve()

        # Check symlinks if not allowed
        if not allow_symlinks:
            # Check if original path (before resolve) differs from resolved
            # This indicates a symlink was followed
            try:
                if target.exists() and target.is_symlink():
                    return False, f"Symlinks not allowed: {path}"
            except (OSError, PermissionError):
                pass

        # Check if resolved path is within root
        try:
            resolved.relative_to(root)
        except ValueError:
            return False, f"Path escapes root directory: {path} -> {resolved}"

        return True, None

    except Exception as e:
        return False, f"Path validation error: {str(e)}"


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """Sanitize a filename to be safe for filesystem operations.

    Args:
        filename: The filename to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized filename
    """
    if not filename:
        return "unnamed"

    # Remove null bytes
    filename = filename.replace("\x00", "")

    # Remove/replace dangerous characters
    dangerous_chars = '<>:"/\\|?*'
    for char in dangerous_chars:
        filename = filename.replace(char, "_")

    # Remove leading/trailing dots and spaces
    filename = filename.strip(". ")

    # Ensure not empty after sanitization
    if not filename:
        filename = "unnamed"

    # Truncate to max length (preserving extension if possible)
    if len(filename) > max_length:
        name, ext = os.path.splitext(filename)
        if ext and len(ext) <= 10:  # Reasonable extension length
            name = name[:max_length - len(ext)]
            filename = name + ext
        else:
            filename = filename[:max_length]

    return filename


def validate_pdf_path(
    pdf_path: str,
    allowed_roots: Optional[List[str]] = None,
    check_exists: bool = True,
) -> Tuple[bool, Optional[str]]:
    """Validate a PDF file path for security and existence.

    Args:
        pdf_path: Path to PDF file
        allowed_roots: List of allowed root directories. If None, only
                      performs basic safety checks.
        check_exists: Whether to verify the file exists

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Basic safety check
    is_safe, error = is_path_safe(pdf_path)
    if not is_safe:
        return False, error

    # Extension check
    if not pdf_path.lower().endswith(".pdf"):
        return False, f"Not a PDF file: {pdf_path}"

    # Root directory check
    if allowed_roots:
        in_allowed_root = False
        for root in allowed_roots:
            is_valid, _ = validate_path_within_root(pdf_path, root)
            if is_valid:
                in_allowed_root = True
                break

        if not in_allowed_root:
            return False, f"PDF path not within allowed directories: {pdf_path}"

    # Existence check
    if check_exists:
        if not os.path.exists(pdf_path):
            return False, f"PDF file does not exist: {pdf_path}"
        if not os.path.isfile(pdf_path):
            return False, f"PDF path is not a file: {pdf_path}"

    return True, None


def validate_output_path(
    output_path: str,
    root_dir: str,
    create_parents: bool = False,
) -> Tuple[bool, Optional[str]]:
    """Validate an output path for writing.

    Args:
        output_path: Path where output will be written
        root_dir: Root directory that output must be within
        create_parents: Whether to allow parent directories to be created

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Validate path is within root
    is_valid, error = validate_path_within_root(output_path, root_dir)
    if not is_valid:
        return False, error

    # Check parent directory
    parent = Path(output_path).parent

    if not parent.exists():
        if not create_parents:
            return False, f"Parent directory does not exist: {parent}"
    else:
        # Check parent is writable
        if not os.access(str(parent), os.W_OK):
            return False, f"Parent directory not writable: {parent}"

    # Check we're not overwriting a directory
    if os.path.exists(output_path) and os.path.isdir(output_path):
        return False, f"Output path is a directory: {output_path}"

    return True, None


# =============================================================================
# File Content Security
# =============================================================================

# Maximum file size limits
MAX_PDF_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB
MAX_ANNOTATION_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


def validate_file_size(
    file_path: str,
    max_size_bytes: int = MAX_PDF_SIZE_BYTES,
) -> Tuple[bool, Optional[str]]:
    """Validate that a file does not exceed size limits.

    Args:
        file_path: Path to file
        max_size_bytes: Maximum allowed size in bytes

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        size = os.path.getsize(file_path)
        if size > max_size_bytes:
            return False, (
                f"File exceeds maximum size: {size} bytes > {max_size_bytes} bytes"
            )
        return True, None
    except OSError as e:
        return False, f"Cannot get file size: {e}"


def compute_file_checksum(file_path: str, algorithm: str = "sha256") -> str:
    """Compute checksum of a file.

    Args:
        file_path: Path to file
        algorithm: Hash algorithm (sha256, md5, etc.)

    Returns:
        Hex digest of file content
    """
    hasher = hashlib.new(algorithm)
    with open(file_path, "rb") as f:
        # Read in chunks for memory efficiency
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def verify_file_integrity(
    file_path: str,
    expected_checksum: str,
    algorithm: str = "sha256",
) -> Tuple[bool, Optional[str]]:
    """Verify file integrity using checksum.

    Args:
        file_path: Path to file
        expected_checksum: Expected checksum value
        algorithm: Hash algorithm used

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        actual = compute_file_checksum(file_path, algorithm)
        if actual != expected_checksum:
            return False, (
                f"Checksum mismatch: expected {expected_checksum}, got {actual}"
            )
        return True, None
    except Exception as e:
        return False, f"Cannot verify checksum: {e}"


# =============================================================================
# Security Audit Logging
# =============================================================================


def log_security_event(
    event_type: str,
    path: str,
    details: str,
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
) -> None:
    """Log a security-related event.

    Args:
        event_type: Type of security event (e.g., "path_traversal_attempt")
        path: The path involved
        details: Additional details
        user_id: User ID if applicable
        project_id: Project ID if applicable
    """
    extra = {
        "security_event": True,
        "event_type": event_type,
        "path": path,
    }
    if user_id:
        extra["user_id"] = user_id
    if project_id:
        extra["project_id"] = project_id

    logger.warning(
        f"Security event [{event_type}]: {details}",
        extra=extra,
    )


# =============================================================================
# Secure Path Operations
# =============================================================================


class SecurePathContext:
    """Context manager for secure path operations within a root directory.

    Provides safe methods for file operations that are validated against
    path traversal attacks.

    Usage:
        with SecurePathContext("/safe/root") as ctx:
            content = ctx.read_file("subdir/file.txt")
            ctx.write_file("output/result.json", data)
    """

    def __init__(
        self,
        root_dir: str,
        allowed_extensions: Optional[Set[str]] = None,
        allow_symlinks: bool = False,
    ):
        """Initialize secure path context.

        Args:
            root_dir: Root directory for all operations
            allowed_extensions: Set of allowed file extensions (e.g., {".pdf", ".json"})
            allow_symlinks: Whether to allow symlinks
        """
        self.root_dir = Path(root_dir).resolve()
        self.allowed_extensions = allowed_extensions
        self.allow_symlinks = allow_symlinks

        if not self.root_dir.exists():
            raise PathSecurityError(
                f"Root directory does not exist: {root_dir}",
                str(root_dir),
                "root_not_found",
            )
        if not self.root_dir.is_dir():
            raise PathSecurityError(
                f"Root path is not a directory: {root_dir}",
                str(root_dir),
                "not_directory",
            )

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def resolve_path(self, relative_path: str) -> Path:
        """Resolve a relative path to an absolute path within root.

        Args:
            relative_path: Path relative to root

        Returns:
            Resolved absolute Path

        Raises:
            PathSecurityError: If path escapes root or is invalid
        """
        is_valid, error = validate_path_within_root(
            relative_path,
            str(self.root_dir),
            allow_symlinks=self.allow_symlinks,
        )
        if not is_valid:
            raise PathSecurityError(
                error or "Invalid path",
                relative_path,
                "path_validation_failed",
            )

        resolved = (self.root_dir / relative_path).resolve()

        # Extension check
        if self.allowed_extensions:
            suffix = resolved.suffix.lower()
            if suffix not in self.allowed_extensions:
                raise PathSecurityError(
                    f"File extension not allowed: {suffix}",
                    relative_path,
                    "extension_not_allowed",
                )

        return resolved

    def exists(self, relative_path: str) -> bool:
        """Check if a path exists within root."""
        try:
            resolved = self.resolve_path(relative_path)
            return resolved.exists()
        except PathSecurityError:
            return False

    def read_file(self, relative_path: str, mode: str = "r") -> str:
        """Read a file within root directory.

        Args:
            relative_path: Path relative to root
            mode: File mode ("r" for text, "rb" for binary)

        Returns:
            File content
        """
        resolved = self.resolve_path(relative_path)
        with open(resolved, mode) as f:
            return f.read()

    def write_file(
        self,
        relative_path: str,
        content: str,
        mode: str = "w",
        create_parents: bool = True,
    ) -> None:
        """Write a file within root directory.

        Args:
            relative_path: Path relative to root
            content: Content to write
            mode: File mode
            create_parents: Whether to create parent directories
        """
        resolved = self.resolve_path(relative_path)

        if create_parents:
            resolved.parent.mkdir(parents=True, exist_ok=True)

        with open(resolved, mode) as f:
            f.write(content)

    def list_files(
        self,
        relative_path: str = "",
        pattern: str = "*",
    ) -> List[Path]:
        """List files in a directory within root.

        Args:
            relative_path: Path relative to root
            pattern: Glob pattern

        Returns:
            List of file paths relative to root
        """
        resolved = self.resolve_path(relative_path) if relative_path else self.root_dir

        if not resolved.is_dir():
            return []

        return list(resolved.glob(pattern))
