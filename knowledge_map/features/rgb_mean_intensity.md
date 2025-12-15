## RGB Mean Intensity Behavior

- Region stats now include per-channel means for grayscale and RGB images.
- ML backends (`segment_anything_2_image`, `FastSAM`) compute `gray`, `r`, `g`, `b` for polygons and brush masks; textarea text uses `gray=.., r=.., g=.., b=..` when available.
- Templates (`sam2-interactive-segmentation`, `fastsam-interactive-segmentation`) label the textarea as “Mean Intensity (gray/R/G/B)” to reflect the expanded values.
- Biowork CSV export parses the textarea values and/or recomputes from images, writing `mean_gray`, `mean_r`, `mean_g`, `mean_b` columns for brush and polygon regions.
- CSV export falls back to recomputation if textarea values are missing or partial.

## Regions Tab Sorting by RGB Intensities

- The Regions (Outliner) side panel now supports additional sort options when grouping is set to **Manual**:
  - **By Mean Gray** (`intensity_gray`)
  - **By Mean Red** (`intensity_r`)
  - **By Mean Green** (`intensity_g`)
  - **By Mean Blue** (`intensity_b`)
- Sort values are derived using a **ML-first, color-fallback** strategy:
  - If a per-region `TextArea` named `mean_intensity` is present, the frontend parses `gray`, `r`, `g`, `b` from its text (e.g., `gray=0.0; r=10.5; g=20; b=30.25`).
  - If `mean_intensity` is missing or malformed for a region, the frontend falls back to the region display color (`background` or `getOneColor()`), computing gray as a luminance of the RGB components and using the raw `r`, `g`, `b` channel values.
- The existing **By Time** (`date`) and **By Score** (`score`) ordering options remain available and unchanged.

