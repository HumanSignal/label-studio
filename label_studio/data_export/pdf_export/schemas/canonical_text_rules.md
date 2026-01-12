# Canonical Text Construction Rules

**Version**: 1.0.0
**Date**: 2026-01-12

## Overview

This document specifies the rules for constructing canonical text from PDF
document layout structures. Canonical text provides a normalized, predictable
representation of document content that enables:

1. **Character-level anchoring**: Annotations reference precise character positions
2. **Reproducibility**: Same document always produces identical canonical text
3. **Text extraction**: Quote text can be extracted by char_start/char_end offsets
4. **Re-anchoring**: Annotations can be repositioned if document is re-processed

## Construction Rules

### Text Hierarchy

Documents are structured hierarchically:
- **Document** contains **Blocks**
- **Blocks** contain **Lines**
- **Lines** contain **Words**

### Joining Rules

#### Words → Line
Words within a line are joined by a **single space** character.

```
word1 word2 word3
     ^    ^
     |    |
   space space
```

#### Lines → Block
Lines within a block are joined by a **single newline** (`\n`).

```
line1 words here
line2 words here
line3 words here
```

#### Blocks → Document
Blocks are separated by **double newline** (`\n\n`).

```
Block 1 line 1
Block 1 line 2

Block 2 line 1
Block 2 line 2
```

### Text Normalization

All text is normalized using:
- **Unicode NFC** (Canonical Decomposition, followed by Canonical Composition)
- No additional whitespace normalization (preserved as extracted)

```python
import unicodedata
normalized_text = unicodedata.normalize('NFC', text)
```

---

## Character Offset Index

The canonical index maps structural element IDs to character positions:

```json
{
  "words": {
    "w_abc12345": {"char_start": 0, "char_end": 5},
    "w_def67890": {"char_start": 6, "char_end": 11}
  },
  "lines": {
    "l_line1234": {"char_start": 0, "char_end": 25}
  },
  "blocks": {
    "b_block567": {"char_start": 0, "char_end": 50}
  }
}
```

### Position Semantics

- `char_start`: First character position (inclusive, 0-indexed)
- `char_end`: Position after last character (exclusive)
- Text extraction: `canonical_text[char_start:char_end]`

### Example

Given this document structure:
```
Block 1:
  Line 1: ["Hello", "World"]
  Line 2: ["Test", "Line"]
Block 2:
  Line 3: ["More", "Text"]
```

Canonical text:
```
Hello World
Test Line

More Text
```

Character positions:
| Element | char_start | char_end | Text |
|---------|------------|----------|------|
| "Hello" | 0 | 5 | "Hello" |
| "World" | 6 | 11 | "World" |
| Line 1 | 0 | 11 | "Hello World" |
| "Test" | 12 | 16 | "Test" |
| "Line" | 17 | 21 | "Line" |
| Line 2 | 12 | 21 | "Test Line" |
| Block 1 | 0 | 21 | "Hello World\nTest Line" |
| "More" | 23 | 27 | "More" |
| "Text" | 28 | 32 | "Text" |
| Line 3 | 23 | 32 | "More Text" |
| Block 2 | 23 | 32 | "More Text" |

---

## Multi-Span Annotations

Annotations may span multiple lines, requiring multiple bounding boxes.

### Evidence Structure

```json
{
  "bboxes": [
    {"x": 100, "y": 50, "width": 200, "height": 14},
    {"x": 50, "y": 64, "width": 150, "height": 14}
  ],
  "word_ids": ["w_abc", "w_def", "w_ghi", "w_jkl"],
  "quote": "multi-line text spanning two lines",
  "char_start": 45,
  "char_end": 79
}
```

### Bbox Ordering

Bounding boxes are ordered:
1. By vertical position (top to bottom)
2. For same vertical position, by horizontal position (left to right)

---

## Implementation Reference

See these modules for implementation:
- `canonical_text.py`: Canonical text construction
- `annotation_builder.py`: Multi-bbox calculation
- `models.py`: AnnotationEvidence dataclass

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-12 | Initial specification |
