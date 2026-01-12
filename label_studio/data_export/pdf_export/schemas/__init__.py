"""JSON schemas for PDF ML Export validation.

This package contains JSON Schema files for validating export output:
- manifest.schema.json: Document manifest validation
- page_layout.schema.json: Page layout structure validation
- annotation_record.schema.json: Annotation record validation

Documentation files:
- id_algorithm.md: Deterministic ID generation algorithm
- canonical_text_rules.md: Canonical text construction rules
- w3c_mapping.md: JSONL to W3C Web Annotation mapping
"""

import os

# Path to schemas directory
SCHEMAS_DIR = os.path.dirname(os.path.abspath(__file__))


def get_schema_path(schema_name: str) -> str:
    """Get absolute path to a schema file.

    Args:
        schema_name: Name of schema file (e.g., 'manifest.schema.json')

    Returns:
        Absolute path to the schema file
    """
    return os.path.join(SCHEMAS_DIR, schema_name)


__all__ = [
    "SCHEMAS_DIR",
    "get_schema_path",
]
