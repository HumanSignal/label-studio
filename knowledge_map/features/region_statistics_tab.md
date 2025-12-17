## Region Statistics Tab

- The Region Statistics tab appears alongside the Info tab in the right-hand Details side panel.
- It summarizes numeric metadata across regions in the current image, using the `meta` fields populated by ML backends and geometry/RGB features:
  - `meta.area`
  - `meta.bbox.width`
  - `meta.bbox.height`
  - `meta.mean_r`
  - `meta.mean_g`
  - `meta.mean_b`
- When one or more regions are selected, statistics are computed over the selected regions only; otherwise they are computed over all non-classification regions in the current image (i.e. `currentEntity.regionStore.list`).
- For each metric, the UI displays:
  - Count (`n`)
  - Mean
  - Population standard deviation \\(\\sqrt{\\sum (x_i - \\bar{x})^2 / n}\\)
  - Percentiles at 25%, 50% (median), and 75% using linear interpolation over the sorted values.
- Geometry values are in **pixels** (consistent with `GEOMETRY_METADATA_IMPLEMENTATION.md`), and RGB means match the behavior described in `rgb_mean_intensity.md`.


