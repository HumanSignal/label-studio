"""Schema Validation for PDF ML Export.

This module provides functions to validate exported JSON files
against their JSON schemas.

Uses jsonschema for validation with support for:
- Manifest validation
- Page layout validation
- Annotation record validation
- Export index validation
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import jsonschema
    from jsonschema import Draft7Validator, ValidationError

    JSONSCHEMA_AVAILABLE = True
except ImportError:
    JSONSCHEMA_AVAILABLE = False

logger = logging.getLogger(__name__)

# Schema file names
MANIFEST_SCHEMA = "manifest.schema.json"
PAGE_LAYOUT_SCHEMA = "page_layout.schema.json"
ANNOTATION_RECORD_SCHEMA = "annotation_record.schema.json"
EXPORT_INDEX_SCHEMA = "export_index.schema.json"


def get_schema_dir() -> Path:
    """Get the directory containing schema files.

    Returns:
        Path to schemas directory
    """
    return Path(__file__).parent / "schemas"


def load_schema(schema_name: str) -> Optional[Dict[str, Any]]:
    """Load a JSON schema file.

    Args:
        schema_name: Schema filename (e.g., "manifest.schema.json")

    Returns:
        Schema dictionary or None if not found
    """
    schema_path = get_schema_dir() / schema_name

    if not schema_path.exists():
        logger.error(f"Schema file not found: {schema_path}")
        return None

    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in schema {schema_name}: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to load schema {schema_name}: {e}")
        return None


def validate_json(
    data: Dict[str, Any],
    schema: Dict[str, Any],
) -> Tuple[bool, List[str]]:
    """Validate JSON data against a schema.

    Args:
        data: JSON data to validate
        schema: JSON schema

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    if not JSONSCHEMA_AVAILABLE:
        logger.warning("jsonschema not available - skipping validation")
        return True, []

    try:
        validator = Draft7Validator(schema)
        errors = list(validator.iter_errors(data))

        if errors:
            error_messages = []
            for error in errors:
                path = ".".join(str(p) for p in error.absolute_path)
                msg = f"{path}: {error.message}" if path else error.message
                error_messages.append(msg)
            return False, error_messages

        return True, []

    except Exception as e:
        logger.exception(f"Validation error: {e}")
        return False, [str(e)]


def validate_manifest(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate a document manifest.

    Args:
        data: Manifest dictionary

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    schema = load_schema(MANIFEST_SCHEMA)
    if schema is None:
        return False, ["Failed to load manifest schema"]

    return validate_json(data, schema)


def validate_page_layout(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate a page layout.

    Args:
        data: Page layout dictionary

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    schema = load_schema(PAGE_LAYOUT_SCHEMA)
    if schema is None:
        return False, ["Failed to load page layout schema"]

    return validate_json(data, schema)


def validate_annotation_record(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate an annotation record.

    Args:
        data: Annotation record dictionary

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    schema = load_schema(ANNOTATION_RECORD_SCHEMA)
    if schema is None:
        return False, ["Failed to load annotation record schema"]

    return validate_json(data, schema)


def validate_export_index(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate an export index.

    Args:
        data: Export index dictionary

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    schema = load_schema(EXPORT_INDEX_SCHEMA)
    if schema is None:
        return False, ["Failed to load export index schema"]

    return validate_json(data, schema)


def validate_file(
    filepath: str,
    schema_name: str,
) -> Tuple[bool, List[str]]:
    """Validate a JSON file against a schema.

    Args:
        filepath: Path to JSON file
        schema_name: Schema filename

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return False, [f"Invalid JSON: {e}"]
    except FileNotFoundError:
        return False, [f"File not found: {filepath}"]
    except Exception as e:
        return False, [f"Failed to read file: {e}"]

    schema = load_schema(schema_name)
    if schema is None:
        return False, [f"Failed to load schema: {schema_name}"]

    return validate_json(data, schema)


def validate_jsonl_file(
    filepath: str,
    schema_name: str,
    max_errors: int = 10,
) -> Tuple[bool, List[str], int]:
    """Validate a JSONL file against a schema.

    Validates each line as a separate JSON object.

    Args:
        filepath: Path to JSONL file
        schema_name: Schema filename
        max_errors: Maximum errors to report

    Returns:
        Tuple of (is_valid, list_of_errors, line_count)
    """
    schema = load_schema(schema_name)
    if schema is None:
        return False, [f"Failed to load schema: {schema_name}"], 0

    errors = []
    line_count = 0

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue

                line_count += 1

                try:
                    data = json.loads(line)
                except json.JSONDecodeError as e:
                    if len(errors) < max_errors:
                        errors.append(f"Line {line_num}: Invalid JSON - {e}")
                    continue

                is_valid, line_errors = validate_json(data, schema)
                if not is_valid and len(errors) < max_errors:
                    for err in line_errors[:max_errors - len(errors)]:
                        errors.append(f"Line {line_num}: {err}")

    except FileNotFoundError:
        return False, [f"File not found: {filepath}"], 0
    except Exception as e:
        return False, [f"Failed to read file: {e}"], 0

    return len(errors) == 0, errors, line_count


class ExportValidator:
    """Validator for complete export bundles.

    Validates all files in an export bundle against their schemas.
    """

    def __init__(self, export_dir: str):
        """Initialize validator.

        Args:
            export_dir: Path to export bundle directory
        """
        self.export_dir = Path(export_dir)
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.validated_files: List[str] = []

    def validate(self) -> bool:
        """Validate the complete export bundle.

        Returns:
            True if all validations pass
        """
        self.errors = []
        self.warnings = []
        self.validated_files = []

        # Check export directory exists
        if not self.export_dir.exists():
            self.errors.append(f"Export directory not found: {self.export_dir}")
            return False

        # Validate export index
        index_path = self.export_dir / "export_index.json"
        if index_path.exists():
            self._validate_export_index(index_path)
        else:
            self.warnings.append("export_index.json not found")

        # Validate documents
        docs_dir = self.export_dir / "docs"
        if docs_dir.exists():
            self._validate_documents(docs_dir)

        # Validate annotation files
        self._validate_annotations()

        return len(self.errors) == 0

    def _validate_export_index(self, index_path: Path) -> None:
        """Validate export index file."""
        is_valid, errors = validate_file(str(index_path), EXPORT_INDEX_SCHEMA)
        if not is_valid:
            for err in errors:
                self.errors.append(f"export_index.json: {err}")
        else:
            self.validated_files.append(str(index_path))

    def _validate_documents(self, docs_dir: Path) -> None:
        """Validate all document directories."""
        for doc_dir in sorted(docs_dir.iterdir()):
            if not doc_dir.is_dir():
                continue

            # Validate manifest
            manifest_path = doc_dir / "manifest.json"
            if manifest_path.exists():
                is_valid, errors = validate_file(str(manifest_path), MANIFEST_SCHEMA)
                if not is_valid:
                    for err in errors:
                        self.errors.append(f"{manifest_path.name}: {err}")
                else:
                    self.validated_files.append(str(manifest_path))
            else:
                self.warnings.append(f"Missing manifest: {doc_dir.name}")

            # Validate layout files
            layout_dir = doc_dir / "layout"
            if layout_dir.exists():
                for layout_file in sorted(layout_dir.glob("*.json")):
                    is_valid, errors = validate_file(str(layout_file), PAGE_LAYOUT_SCHEMA)
                    if not is_valid:
                        for err in errors[:3]:  # Limit errors per file
                            self.errors.append(f"{layout_file.name}: {err}")
                    else:
                        self.validated_files.append(str(layout_file))

    def _validate_annotations(self) -> None:
        """Validate annotation JSONL files."""
        # Check for annotations.jsonl or sharded files
        annotation_patterns = [
            "annotations.jsonl",
            "annotations_part_*.jsonl",
        ]

        for pattern in annotation_patterns:
            for ann_file in self.export_dir.glob(pattern):
                is_valid, errors, count = validate_jsonl_file(
                    str(ann_file),
                    ANNOTATION_RECORD_SCHEMA,
                )
                if not is_valid:
                    for err in errors[:5]:  # Limit errors
                        self.errors.append(f"{ann_file.name}: {err}")
                else:
                    self.validated_files.append(str(ann_file))

    def get_report(self) -> Dict[str, Any]:
        """Get validation report.

        Returns:
            Dictionary with validation results
        """
        return {
            "valid": len(self.errors) == 0,
            "files_validated": len(self.validated_files),
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "errors": self.errors,
            "warnings": self.warnings,
        }


def copy_schemas_to_export(export_dir: str) -> List[str]:
    """Copy schema files to export bundle.

    Args:
        export_dir: Path to export bundle directory

    Returns:
        List of copied schema file paths
    """
    schema_dir = get_schema_dir()
    export_schemas_dir = Path(export_dir) / "schemas"
    export_schemas_dir.mkdir(parents=True, exist_ok=True)

    copied = []
    schema_files = [
        MANIFEST_SCHEMA,
        PAGE_LAYOUT_SCHEMA,
        ANNOTATION_RECORD_SCHEMA,
        EXPORT_INDEX_SCHEMA,
    ]

    for schema_name in schema_files:
        src = schema_dir / schema_name
        dst = export_schemas_dir / schema_name

        if src.exists():
            try:
                import shutil

                shutil.copy2(src, dst)
                copied.append(str(dst))
            except Exception as e:
                logger.error(f"Failed to copy schema {schema_name}: {e}")

    return copied
