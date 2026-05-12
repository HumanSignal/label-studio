# AI Review Fast Mode

## Purpose

Dense AI-generated brush annotations can make image-task startup extremely slow
because every loaded mask normally builds the full editable Konva brush stack.
Fast mode is an opt-in review path for workflows where AI creates most regions
and users usually inspect, relabel, hide, or accept regions rather than editing
every mask geometry.

## Activation

Fast mode is gated by the `fflag_feat_front_biowork_001_ai_review_fast_mode_long`
feature flag. When that flag is enabled, fast mode activates when either of
these is true:

- The Label Studio frontend is configured with `forceAiReviewFastMode: true`.
- The editor interfaces array contains `annotations:ai-review-fast`.

The mode is intentionally separate from `autoAnnotation` and
`autoAcceptSuggestions`: those settings control ML suggestion generation and
acceptance, while fast mode controls how already-loaded brush regions render.

## Current behavior

When fast mode is enabled, unselected brush regions render as static review
overlays. The static path skips the expensive per-region editable brush work
that normally runs on initial draw:

- no Konva hit-mask generation for static brushes
- no layer `toDataURL()` snapshot for static brushes
- no `cacheImageData()` call for static brushes
- no mouse handlers/listening on static brush overlays

If a brush region becomes selected, highlighted, drawn, or enters linking mode,
it falls back to the normal editable brush renderer. This keeps mask editing
available while avoiding full editable rendering for every AI region at image
open time.

## Geometry metadata

Brush label placement can use `region.meta.bbox` when available. Biowork ML
backends already emit pixel-space bounding boxes in result metadata, so fast
mode can place region labels without first reading the rendered canvas pixels.

Expected metadata shape:

```json
{
  "meta": {
    "bbox": { "x": 10, "y": 20, "width": 100, "height": 50 }
  }
}
```

## Main files

- `web/libs/editor/src/stores/AppStore.js` — exposes `aiReviewFastMode`.
- `web/libs/editor/src/env/production.js` and
  `web/libs/editor/src/env/development.js` — pass through
  `forceAiReviewFastMode`.
- `web/libs/editor/src/regions/BrushRegion.jsx` — static brush review render
  path and `meta.bbox` fallback.
- `web/libs/datamanager/src/sdk/lsf-sdk.js` — turns fast mode on for
  interactive-preannotation Label Studio sessions.

## Limitations and next steps

- The initial implementation targets brush regions, where startup cost is most
  severe for dense segmentation masks.
- Static brush overlays are not directly clickable on the canvas; selecting a
  region through the outliner/details flow re-enters the normal editable path.
- A future improvement could batch static masks into fewer Konva layers or lazy
  materialize region MST models for very large annotations.
