## RGB Mean Intensity Behavior

- Region stats now include per-channel RGB means for grayscale and color images.
- ML backends (`segment_anything_2_image`, `FastSAM`) compute `r`, `g`, `b` for polygons and brush masks and write them into each region result’s `meta` as flat channels:
  - `meta.mean_r`
  - `meta.mean_g`
  - `meta.mean_b`
- Grayscale / black-and-white regions are represented by `r ≈ g ≈ b`; there is no separate stored gray channel in `meta`.
- Biowork CSV export (`SEG_CSV`) prefers RGB means from `result.meta` when present and falls back to legacy textarea values if needed.
- Biowork CSV export continues to write `mean_r`, `mean_g`, `mean_b` columns for brush and polygon regions. A gray/luma value can be derived downstream if needed.
- **Multi-image exports**: When exporting multiple images, Biowork creates a single Excel file (`.xlsx`) with a "Summary" sheet containing statistics across all regions, plus one sheet per image. Single-image exports remain as CSV for backward compatibility.

Expected region `meta` schema (per result):

- `meta.area`: pixel area inside the mask.
- `meta.bbox`: bounding box in pixels:
  - `meta.bbox.x`
  - `meta.bbox.y`
  - `meta.bbox.width`
  - `meta.bbox.height`
- `meta.mean_r`: mean red channel value inside the region.
- `meta.mean_g`: mean green channel value inside the region.
- `meta.mean_b`: mean blue channel value inside the region.

## Regions Tab Sorting by RGB Intensities

- The Regions (Outliner) side panel supports additional sort options when grouping is set to **Manual**:
  - **By Mean Red** (`intensity_r`)
  - **By Mean Green** (`intensity_g`)
  - **By Mean Blue** (`intensity_b`)
- Sort values are derived using a **meta-first, color-fallback** strategy:
  - If a region’s `meta` includes `mean_r`, `mean_g`, `mean_b`, the frontend sorts directly by these numeric channels.
  - If `meta.mean_*` channels are missing or invalid for a region, the frontend falls back to the region display color (`background` or `getOneColor()`), computing a gray/luma approximation from the RGB components and using the raw `r`, `g`, `b` values.
- The existing **By Time** (`date`) and **By Score** (`score`) ordering options remain available and unchanged.

## Regions Tab Sorting by Area and Bounding Box

- The Regions (Outliner) side panel also supports additional sort options based on region geometry when grouping is set to **Manual**:
  - **By Area** (`area`) — uses `meta.area`
  - **By Width** (`bbox_width`) — uses `meta.bbox.width`
  - **By Height** (`bbox_height`) — uses `meta.bbox.height`
- These sort modes rely on the `meta.area` and `meta.bbox.*` fields populated by ML backends or other upstream processing.
- If a region is missing these fields, it is treated as `0` for the corresponding metric, so regions without geometry stats naturally fall to the beginning or end of the sorted list depending on sort direction.




