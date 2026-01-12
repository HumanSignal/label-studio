# W3C Web Annotation Mapping

**Version**: 1.0.0
**Date**: 2026-01-12

## Overview

This document specifies how Label Studio PDF annotations map to the
W3C Web Annotation Data Model (https://www.w3.org/TR/annotation-model/).

## JSON-LD Context

All W3C annotations use the standard context:
```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld"
}
```

## Annotation Structure

### Basic Structure

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "urn:uuid:abc123",
  "type": "Annotation",
  "motivation": "tagging",
  "body": { ... },
  "target": { ... },
  "creator": { ... },
  "created": "2026-01-12T10:30:00Z"
}
```

---

## Body Mapping

### Label/Tag Body

Label Studio labels map to TextualBody with tagging purpose:

```json
{
  "type": "TextualBody",
  "purpose": "tagging",
  "value": "Person",
  "format": "text/plain"
}
```

### Field Value Body

For annotations with both label and value:

```json
{
  "type": "TextualBody",
  "purpose": "describing",
  "value": "John Smith",
  "format": "text/plain"
}
```

---

## Target Mapping

### SpecificResource

All PDF targets use SpecificResource wrapper:

```json
{
  "type": "SpecificResource",
  "source": "http://example.org/docs/abc123/pages/page_001.png",
  "selector": [ ... ]
}
```

---

## Selector Mapping

### TextQuoteSelector

For text-based selections with context:

```json
{
  "type": "TextQuoteSelector",
  "exact": "John Smith",
  "prefix": "the applicant, ",
  "suffix": ", was present"
}
```

**Mapping from AnnotationEvidence:**
- `exact` ← `evidence.quote`
- `prefix` ← extracted from canonical_text (30 chars before char_start)
- `suffix` ← extracted from canonical_text (30 chars after char_end)

### TextPositionSelector

For character offset positions:

```json
{
  "type": "TextPositionSelector",
  "start": 145,
  "end": 155
}
```

**Mapping from AnnotationEvidence:**
- `start` ← `evidence.char_start`
- `end` ← `evidence.char_end`

### FragmentSelector

For spatial regions using Media Fragments:

```json
{
  "type": "FragmentSelector",
  "value": "xywh=pixel:100,200,50,14",
  "conformsTo": "http://www.w3.org/TR/media-frags/"
}
```

**Mapping from AnnotationEvidence:**
- `value` ← `xywh=pixel:{bbox.x},{bbox.y},{bbox.width},{bbox.height}`

For multi-line annotations, multiple FragmentSelectors are included.

---

## Multi-Selector Pattern

PDF annotations typically use multiple selectors:

```json
{
  "type": "SpecificResource",
  "source": "http://example.org/page_001.png",
  "selector": [
    {
      "type": "TextQuoteSelector",
      "exact": "multi-line text",
      "prefix": "previous text ",
      "suffix": " following text"
    },
    {
      "type": "TextPositionSelector",
      "start": 100,
      "end": 115
    },
    {
      "type": "FragmentSelector",
      "value": "xywh=pixel:50,100,200,14",
      "conformsTo": "http://www.w3.org/TR/media-frags/"
    },
    {
      "type": "FragmentSelector",
      "value": "xywh=pixel:50,114,150,14",
      "conformsTo": "http://www.w3.org/TR/media-frags/"
    }
  ]
}
```

---

## Motivation Mapping

| Label Studio | W3C Motivation |
|--------------|----------------|
| labels | tagging |
| textarea | describing |
| rectanglelabels | tagging |
| choices | classifying |

---

## Creator Mapping

```json
{
  "type": "Person",
  "id": "user:123",
  "email": "annotator@example.com"
}
```

**Mapping from AnnotationMetadata:**
- `id` ← `user:{metadata.annotator_id}`
- `email` ← `metadata.annotator_email` (optional)

---

## Complete Example

### Input: AnnotationRecord

```python
AnnotationRecord(
    annotation_id="anno_001",
    task_id=123,
    doc_id="abc123def456",
    annotation_type=AnnotationType.FIELD,
    label="Person",
    evidence=AnnotationEvidence(
        bboxes=[BBoxXYWH(100, 200, 80, 14)],
        word_ids=["w_abc", "w_def"],
        quote="John Smith",
        char_start=145,
        char_end=155,
        page_id="abc123def456:page_001",
        layer_id=LayerId.PDF_TEXT,
    ),
    metadata=AnnotationMetadata(
        annotator_id=42,
        source=AnnotationSource.MANUAL,
        created_at="2026-01-12T10:30:00Z",
    ),
)
```

### Output: W3C Annotation

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "http://example.org/annotations/anno_001",
  "type": "Annotation",
  "motivation": "tagging",
  "body": {
    "type": "TextualBody",
    "purpose": "tagging",
    "value": "Person",
    "format": "text/plain"
  },
  "target": {
    "type": "SpecificResource",
    "source": "http://example.org/abc123def456:page_001",
    "selector": [
      {
        "type": "TextQuoteSelector",
        "exact": "John Smith",
        "prefix": "the applicant, ",
        "suffix": ", was present"
      },
      {
        "type": "TextPositionSelector",
        "start": 145,
        "end": 155
      },
      {
        "type": "FragmentSelector",
        "value": "xywh=pixel:100,200,80,14",
        "conformsTo": "http://www.w3.org/TR/media-frags/"
      }
    ]
  },
  "creator": {
    "type": "Person",
    "id": "user:42"
  },
  "created": "2026-01-12T10:30:00Z"
}
```

---

## Implementation Reference

See `w3c_converter.py` for the reference implementation.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-12 | Initial mapping specification |
