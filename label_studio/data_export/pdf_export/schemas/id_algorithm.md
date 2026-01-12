# Deterministic ID Generation Algorithm

**Version**: sha256_v1
**Date**: 2026-01-12

## Overview

This document specifies the algorithm for generating deterministic structural IDs
for words, lines, blocks, tables, and cells in PDF ML exports. The IDs are designed
to be stable across re-exports of the same PDF with identical parameters.

## Design Goals

1. **Deterministic**: Same input always produces same ID
2. **Reproducible**: Re-exporting same PDF produces identical IDs
3. **Robust**: Minor extraction variations don't change IDs (via bbox quantization)
4. **Unique**: Collision-resistant within document scope (8-char hex = 4 billion combinations)
5. **Debuggable**: Prefix indicates element type (w_, l_, b_, t_)

## Algorithm

### Hash Function

- **Algorithm**: SHA-256
- **Truncation**: First 8 hexadecimal characters (32 bits)
- **Encoding**: UTF-8 for input strings

### Bbox Quantization

To make IDs robust to minor variations in text extraction (e.g., slight differences
in reported bounding boxes), coordinates are quantized to a 2-pixel grid:

```python
def quantize(value: int, grid: int = 2) -> int:
    return round(value / grid) * grid
```

Quantized bbox: `(qx, qy, qw, qh)` where each value is rounded to nearest multiple of 2.

### Text Normalization

All text is normalized to Unicode NFC form before hashing:

```python
import unicodedata
normalized_text = unicodedata.normalize('NFC', text)
```

---

## ID Formats

### Word ID

**Format**: `w_{hash8}`

**Hash Input**: `{page_id}|{normalized_text}|{qx},{qy},{qw},{qh}|{reading_order}`

**Components**:
- `page_id`: Page identifier (e.g., "abc123def456:page_001")
- `normalized_text`: NFC-normalized word text
- `qx,qy,qw,qh`: Quantized bbox (x, y, width, height)
- `reading_order`: Global reading order position on page

**Example**:
```
Input:
  page_id = "abc123def456:page_001"
  text = "Hello"
  bbox = (102, 204, 48, 14)  # quantized to (102, 204, 48, 14)
  reading_order = 5

Hash input: "abc123def456:page_001|Hello|102,204,48,14|5"
SHA-256: "8f3a2b1c..."
Word ID: "w_8f3a2b1c"
```

### Line ID

**Format**: `l_{hash8}`

**Hash Input**: `{page_id}|{sorted_word_ids}`

**Components**:
- `page_id`: Page identifier
- `sorted_word_ids`: Comma-separated, alphabetically sorted word IDs

**Example**:
```
Input:
  page_id = "abc123def456:page_001"
  word_ids = ["w_def456", "w_abc123", "w_ghi789"]

Sorted: ["w_abc123", "w_def456", "w_ghi789"]
Hash input: "abc123def456:page_001|w_abc123,w_def456,w_ghi789"
SHA-256: "b2c3d4e5..."
Line ID: "l_b2c3d4e5"
```

### Block ID

**Format**: `b_{hash8}`

**Hash Input**: `{page_id}|{sorted_line_ids}`

**Components**:
- `page_id`: Page identifier
- `sorted_line_ids`: Comma-separated, alphabetically sorted line IDs

**Example**:
```
Input:
  page_id = "abc123def456:page_001"
  line_ids = ["l_xyz789", "l_abc123"]

Sorted: ["l_abc123", "l_xyz789"]
Hash input: "abc123def456:page_001|l_abc123,l_xyz789"
SHA-256: "c3d4e5f6..."
Block ID: "b_c3d4e5f6"
```

### Table ID

**Format**: `t_{hash8}`

**Hash Input**: `{page_id}|table|{qx},{qy},{qw},{qh}|{table_index}`

**Components**:
- `page_id`: Page identifier
- `"table"`: Literal string marker
- `qx,qy,qw,qh`: Quantized table bbox
- `table_index`: 0-indexed table position on page

### Cell ID

**Format**: `{table_id}:r{NN}c{NN}`

Cell IDs are not hashed. They use a structured format for readability and direct
reference to table position.

**Components**:
- `table_id`: Parent table ID (e.g., "t_abc12345")
- `r{NN}`: Zero-padded row index
- `c{NN}`: Zero-padded column index

**Example**: `t_abc12345:r00c02` (table t_abc12345, row 0, column 2)

---

## Document ID

**Format**: 12-character hex string (no prefix)

**Hash Input**: `{task_id}:{pdf_sha256}`

**Components**:
- `task_id`: Label Studio task ID (integer)
- `pdf_sha256`: Full SHA-256 hash of PDF file content

**Example**:
```
Input:
  task_id = 12345
  pdf_sha256 = "a1b2c3d4e5f6..."

Hash input: "12345:a1b2c3d4e5f6..."
SHA-256: "abc123def456..."
Doc ID: "abc123def456"
```

---

## Verification

To verify determinism, export the same PDF twice with identical parameters.
All structural IDs should be byte-identical:

```bash
# Export twice
curl -X POST ".../exports/pdf-ml" -d '{"dpi": 200}' > export1.zip
curl -X POST ".../exports/pdf-ml" -d '{"dpi": 200}' > export2.zip

# Compare layout files
diff export1/docs/*/layout/page_001.json export2/docs/*/layout/page_001.json
# Should show no differences
```

---

## Collision Resistance

With 8 hexadecimal characters (32 bits), the ID space is approximately 4.3 billion
unique values. For a typical document:

- ~5,000 words per page
- ~100 pages per document
- ~500,000 words total

The probability of collision within a single document is extremely low
(< 0.003% via birthday paradox calculation).

For cross-document uniqueness, the page_id prefix (which includes doc_id) ensures
IDs are unique across the entire export.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| sha256_v1 | 2026-01-12 | Initial algorithm specification |

---

## Implementation Reference

See `label_studio/data_export/pdf_export/id_generator.py` for the reference implementation.
