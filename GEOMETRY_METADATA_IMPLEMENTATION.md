# Geometry Metadata Implementation for Segmentation Models

## Overview
This document describes the implementation of automatic geometry metadata (area and bounding box) capture and recording for segmentation predictions from the FastSAM and segment_anything_2_image backends.

## Backend Changes

### 1. FastSAM Backend (`label_studio_ml/examples/FastSAM/model.py`)

Added `_compute_mask_geometry()` method (lines 354-399) that:
- Computes the **area** of each mask in **pixels** (exact pixel count)
- Computes the **bounding box** in **pixel coordinates**: `{x, y, width, height}`
  - `x, y`: top-left corner (min x, min y)
  - `width, height`: bounding box dimensions in pixels

**Integration:**
- Called for each mask in `get_results()` method
- Geometry metadata attached to **brush results** (line 481)
- Geometry metadata attached to **polygon results** (line 534)
- Results are sent back with `meta` field containing: `{"area": int, "bbox": {x, y, width, height}}`

### 2. Segment Anything 2 Backend (`label_studio_ml/examples/segment_anything_2_image/model.py`)

Identical implementation to FastSAM:
- Same `_compute_mask_geometry()` method added
- Same integration points in `get_results()` method
- Geometry data attached to both brush and polygon results
- Works in both AMG preannotation and interactive prediction paths

## Frontend Changes

### 1. Web Annotation Deserialization (`web/libs/editor/src/stores/Annotation/Annotation.js`)

The deserialization already properly handles `meta` from results:
- When a result with `meta` is deserialized, the `meta` field is included in the area snapshot (line 1274)
- `applyAdditionalDataFromResult()` is called to merge additional metadata

### 2. Region Meta Mixin (`web/libs/editor/src/mixins/AreaMixin.js`)

Enhanced `applyAdditionalDataFromResult()` (lines 206-211):
```javascript
applyAdditionalDataFromResult(_result) {
  if (_result?.meta) {
    self.meta = { ...self.meta, ..._result.meta };
  }
}
```

This ensures that geometry metadata from backend results merges into the region's `meta` object.

### 3. Region Details Display (`web/libs/editor/src/components/SidePanels/DetailsPanel/RegionDetails.tsx`)

**RegionDetailsMain** component (lines 85-106):
- Reads `region.meta.area` and `region.meta.bbox`
- Displays geometry information in the Details panel:
  - Shows "Area (px): {area}" when available
  - Shows "BBox (px): x={x}, y={y}, w={width}, h={height}" when available

## Data Flow

```
Backend Prediction
    ↓
    ├─ result.meta.area = <pixel_count>
    ├─ result.meta.bbox = {x, y, width, height}
    ↓
Label Studio Frontend (Deserialization)
    ↓
    ├─ areaSnapshot = {...data, ...result.meta}
    ├─ area.applyAdditionalDataFromResult(result)
    ├─ region.meta = {area, bbox, ...}
    ↓
UI Display (RegionDetails)
    ↓
    └─ User sees geometry in Details panel
    ↓
Annotation Serialization
    ↓
    └─ Saved in task's annotation payload
```

## Annotation Format Example

When a prediction is saved as an annotation, the resulting JSON includes:

```json
{
  "id": "0eca",
  "from_name": "tag2",
  "to_name": "image",
  "type": "polygon",
  "value": {
    "points": [[...], ...],
    "polygonlabels": ["Object"]
  },
  "meta": {
    "area": 919,
    "bbox": {
      "x": 302,
      "y": 690,
      "width": 33,
      "height": 32
    }
  },
  "score": 0.8,
  "original_width": 1024,
  "original_height": 1024,
  "image_rotation": 0
}
```

## Key Features

✓ **Automatic computation** - Area and bbox computed server-side with no client overhead
✓ **Pixel coordinates** - All measurements in image pixels (not percentages)
✓ **Persistent storage** - Metadata saved with annotations in Label Studio database
✓ **Multi-output support** - Works with brush, polygon, and textarea result types
✓ **Integrated display** - Visible in region details panel without extra configuration

## Testing

To verify the implementation:

1. **Backend prediction** - Submit an image to FastSAM or SAM2 backend
2. **Check response** - Verify prediction JSON contains `meta` field with `area` and `bbox`
3. **Frontend loading** - Load the annotation in Label Studio UI
4. **Display** - Select region and check Details panel for "Geometry:" section
5. **Serialization** - Export annotation and verify `meta` is included in the JSON

## Future Enhancements

- Display bounding box overlay on canvas
- Add area/bbox filtering in region list
- Support for editing/manually adjusting bbox
- Statistics/summary across multiple regions



