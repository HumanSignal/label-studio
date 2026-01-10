# API Contract: OCR Token Endpoints

**Version**: 1.0.0
**Date**: 2026-01-10
**Feature**: `001-pdf-ocr-tables`

## Overview

REST API endpoints for retrieving OCR token data associated with PDF tasks.

## Base URL

```
/api/ocr/
```

## Authentication

All endpoints require authentication via session or API token (standard Label Studio auth).

## Authorization

- All endpoints enforce project membership (FR-027)
- User must have view access to the project containing the task

---

## GET /api/ocr/tasks/{task_id}/pages

Retrieve OCR metadata for all pages of a task's PDF.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | integer | Yes | Task ID |

### Response

**200 OK**

```json
{
  "task_id": 123,
  "document_id": "invoice-001",
  "total_pages": 5,
  "ocr_available": true,
  "pages": [
    {
      "page_index": 0,
      "width": 612,
      "height": 792,
      "token_count": 245,
      "has_tokens": true
    },
    {
      "page_index": 1,
      "width": 612,
      "height": 792,
      "token_count": 312,
      "has_tokens": true
    }
  ],
  "ocr_engine": "tesseract",
  "ocr_version": "5.3.0"
}
```

**404 Not Found** - Task does not exist or no OCR data available

```json
{
  "detail": "OCR data not available for this task"
}
```

**403 Forbidden** - User lacks project access

```json
{
  "detail": "You do not have permission to access this task"
}
```

---

## GET /api/ocr/tasks/{task_id}/pages/{page_index}/tokens

Retrieve OCR tokens for a specific page.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | integer | Yes | Task ID |
| `page_index` | integer | Yes | 0-based page number |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include_style` | boolean | false | Include font style info (bold, italic, font_size) |

### Response

**200 OK**

```json
{
  "task_id": 123,
  "page_index": 0,
  "width": 612,
  "height": 792,
  "rotation": 0,
  "token_count": 245,
  "tokens": [
    {
      "id": "p0_t0",
      "text": "INVOICE",
      "bbox": [0.1, 0.05, 0.2, 0.03],
      "confidence": 0.99,
      "line_id": "p0_l0",
      "block_id": "p0_b0"
    },
    {
      "id": "p0_t1",
      "text": "#12345",
      "bbox": [0.31, 0.05, 0.1, 0.03],
      "confidence": 0.97,
      "line_id": "p0_l0",
      "block_id": "p0_b0"
    }
  ]
}
```

With `include_style=true`:

```json
{
  "tokens": [
    {
      "id": "p0_t0",
      "text": "INVOICE",
      "bbox": [0.1, 0.05, 0.2, 0.03],
      "confidence": 0.99,
      "line_id": "p0_l0",
      "block_id": "p0_b0",
      "font_size": 14,
      "is_bold": true,
      "is_italic": false
    }
  ]
}
```

**404 Not Found** - Page does not exist

```json
{
  "detail": "Page 5 not found. Document has 3 pages."
}
```

---

## GET /api/ocr/tasks/{task_id}/pages/{page_index}/tokens/region

Get tokens within a bounding box (for region text extraction).

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | integer | Yes | Task ID |
| `page_index` | integer | Yes | 0-based page number |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `x` | float | Yes | Region X position (0-1 normalized) |
| `y` | float | Yes | Region Y position (0-1 normalized) |
| `width` | float | Yes | Region width (0-1 normalized) |
| `height` | float | Yes | Region height (0-1 normalized) |
| `threshold` | float | 0.5 | Minimum intersection ratio to include token |

### Response

**200 OK**

```json
{
  "task_id": 123,
  "page_index": 0,
  "region": {
    "x": 0.1,
    "y": 0.05,
    "width": 0.3,
    "height": 0.04
  },
  "tokens": [
    {
      "id": "p0_t0",
      "text": "INVOICE",
      "bbox": [0.1, 0.05, 0.2, 0.03],
      "confidence": 0.99
    },
    {
      "id": "p0_t1",
      "text": "#12345",
      "bbox": [0.31, 0.05, 0.1, 0.03],
      "confidence": 0.97
    }
  ],
  "suggested_text": "INVOICE #12345",
  "average_confidence": 0.98,
  "reading_order": ["p0_t0", "p0_t1"]
}
```

The `suggested_text` field contains tokens sorted by reading order (top-to-bottom, left-to-right within lines).

---

## POST /api/ocr/tasks/{task_id}/import

Import OCR data for a task (batch operation).

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | integer | Yes | Task ID |

### Request Body

```json
{
  "ocr_url": "s3://bucket/ocr/document.json",
  "overwrite": false
}
```

Or inline data:

```json
{
  "data": {
    "pages": [
      {
        "page_index": 0,
        "width": 612,
        "height": 792,
        "tokens": [...]
      }
    ]
  },
  "overwrite": true
}
```

### Response

**201 Created**

```json
{
  "task_id": 123,
  "status": "imported",
  "pages_imported": 5,
  "total_tokens": 1245
}
```

**409 Conflict** - OCR data already exists

```json
{
  "detail": "OCR data already exists. Set overwrite=true to replace."
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Human-readable error message",
  "code": "ERROR_CODE",
  "errors": {
    "field_name": ["Specific validation error"]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `TASK_NOT_FOUND` | 404 | Task does not exist |
| `OCR_NOT_AVAILABLE` | 404 | No OCR data for this task |
| `PAGE_NOT_FOUND` | 404 | Requested page does not exist |
| `PERMISSION_DENIED` | 403 | User lacks project access |
| `INVALID_COORDINATES` | 400 | Invalid bbox parameters |
| `OCR_IMPORT_FAILED` | 400 | OCR data validation failed |

---

## Rate Limiting

Standard Label Studio rate limits apply:
- 1000 requests/minute for authenticated users
- Per-page token requests may be cached for 5 minutes

---

## Observability

All endpoints emit structured logs and metrics per FR-029, FR-030:

### Log Format

```json
{
  "timestamp": "2026-01-10T12:00:00Z",
  "level": "INFO",
  "event": "ocr_tokens_fetched",
  "task_id": 123,
  "page_index": 0,
  "token_count": 245,
  "latency_ms": 45,
  "user_id": 456,
  "project_id": 789
}
```

### Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `ocr_token_fetch_latency_seconds` | Histogram | `project_id`, `page_count` |
| `ocr_token_fetch_total` | Counter | `project_id`, `status` |
| `ocr_tokens_per_page` | Histogram | `project_id` |
