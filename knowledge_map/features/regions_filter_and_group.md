## Regions Filter & Group Meta in Outliner

### Summary

- Regions tab (Outliner) now has a **Filter** control beside **Sort** when grouping is set to **Manual**.
- Filter can restrict visible regions by **width**, **height**, **area**, and **mean RGB channels** (`mean_r`, `mean_g`, `mean_b`).
- Matching regions are **auto-selected** so a single `meta.group` string can be applied to all of them in one action.

### Filtering Dimensions (w, h, a, r, g, b)

- **Width (w)**: uses `region.meta.bbox.width` (pixels).
- **Height (h)**: uses `region.meta.bbox.height` (pixels).
- **Area (a)**: uses `region.meta.area` (pixels²).
- **Mean R (r)**: uses `region.meta.mean_r` (0–255).
- **Mean G (g)**: uses `region.meta.mean_g` (0–255).
- **Mean B (b)**: uses `region.meta.mean_b` (0–255).
- Each field supports **min** and **max** bounds; all active bounds are combined with **AND** logic.
- Regions missing a given metric are treated as having value `0` for that metric, mirroring the behavior used for sorting.

### Behavior

- Filter form lives in a dropdown launched by the new **Filter** button in the Outliner view controls.
- On **Apply**:
  - Outliner computes the subset of regions matching all configured bounds.
  - `RegionStore.filterByMetrics()` calls `setFilteredRegions()` so non-matching regions are hidden (existing “All regions hidden” banner logic continues to work).
  - The same subset of regions is auto-selected via `selectRegionsByIds()`.
- On **Clear**:
  - Filters are reset, `setFilteredRegions()` is called with the full region list, and selection is cleared.

### Group Meta Assignment

- Regions now support a simple **free-text group string** stored in `region.meta.group`.
- `NormalizationMixin` exposes:
  - `setMetaGroup(group: string)` – sets or clears the `group` field on `meta`.
  - `clearMetaGroup()` – convenience wrapper around `setMetaGroup("")`.
- Outliner view controls show a **Group** control whenever there is at least one selected region:
  - Opens a small dropdown with a single text input for the group name and an **Apply** button.
  - On apply, the same group string is written to all selected regions via `region.setMetaGroup(group)`.
- Group assignment is purely a frontend meta field and does not change labels or geometry; it’s intended for downstream analysis and exports.


