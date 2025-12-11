## RGB Mean Intensity Behavior

- Region stats now include per-channel means for grayscale and RGB images.
- ML backends (`segment_anything_2_image`, `FastSAM`) compute `gray`, `r`, `g`, `b` for polygons and brush masks; textarea text uses `gray=.., r=.., g=.., b=..` when available.
- Templates (`sam2-interactive-segmentation`, `fastsam-interactive-segmentation`) label the textarea as “Mean Intensity (gray/R/G/B)” to reflect the expanded values.
- Biowork CSV export parses the textarea values and/or recomputes from images, writing `mean_gray`, `mean_r`, `mean_g`, `mean_b` columns for brush and polygon regions.
- CSV export falls back to recomputation if textarea values are missing or partial.

