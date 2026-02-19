# CodeceptJS -> Cypress Migration Matrix

This document tracks the replacement of `web/libs/editor/tests/e2e` (CodeceptJS) by
`web/libs/editor/tests/integration/e2e` (Cypress).

Status legend:
- `duplicate`: behavior already covered in Cypress, no port needed.
- `migrate`: required behavior missing in Cypress, must be ported.
- `drop`: legacy or low-value scenario not required for maintained coverage baseline.

## Duplicate (covered in Cypress)

### Core/image/outliner/history
- `image.test.js` -> duplicate (`image_segmentation/basic.cy.ts`, `image_segmentation/image_regions.cy.ts`)
- `image.shapes.test.js` -> duplicate (`image_segmentation/*`)
- `image.selected-region.test.js` -> duplicate (`image_segmentation/image_regions.cy.ts`)
- `image.gestures.test.js` -> duplicate (`image_segmentation/stage_interactions.cy.ts`)
- `image.transformer.test.js` -> duplicate (`image_segmentation/stage_interactions.cy.ts`)
- `image.magic-wand.test.js` -> duplicate (`image_segmentation/tools/selection-tool.cy.ts`)
- `toggle-visibility.test.js` -> duplicate (`outliner/hide-all.cy.ts`, `relations/hide-all.cy.ts`)
- `outliner.test.js` -> duplicate (`outliner/region_tree.cy.ts`, `outliner/region-index.cy.ts`)
- `history.test.js` -> duplicate (`drafts/submit.cy.ts`, `core/annotation-id.cy.ts`)
- `smart-tools.history.test.js` -> duplicate (`drafts/submit.cy.ts`)
- `empty-labels.test.js` -> duplicate (`config/empty-labels.cy.ts`)
- `visual-tags.test.js` -> duplicate (`visual_tags/collapse.cy.ts`)

### Control tags/classification
- `taxonomy.test.js` -> duplicate (`control_tags/taxonomy.cy.ts`, `control_tags/classification/taxonomy-*.cy.ts`)
- `date-time.test.js` -> duplicate (`control_tags/classification/datetime.cy.ts`)
- `text-area.test.js` -> duplicate (`control_tags/textarea.cy.ts`, `control_tags/classification/textarea.cy.ts`)
- `nested-choices.test.js` -> duplicate (`control_tags/taxonomy.cy.ts`, `control_tags/text-with-dual-taxonomy.cy.ts`)
- `required.test.js` -> duplicate (`control_tags/choice.cy.ts`, `control_tags/visibility.cy.ts`)
- `maxUsage.test.js` -> duplicate (`control_tags/classification/choices.cy.ts`, `control_tags/classification/number.cy.ts`)

### Audio/video/sync/timeseries
- `audio/audio-regions.test.js` -> duplicate (`audio/audio_regions.cy.ts`)
- `audio/audio-controls.test.js` -> duplicate (`audio/audio.cy.ts`)
- `audio/audio-webaudio-decoder.test.js` -> duplicate (`audio/audio_errors.cy.ts`, `sync/buffering/*.cy.ts`)
- `sync/multiple-audio.test.js` -> duplicate (`sync/audio_video_paragraphs.cy.ts`, `sync/audio_paragraphs.cy.ts`)
- `timeseries.test.js` -> duplicate (`timeseries/charts-displaying.cy.ts`, `timeseries/multichannel.cy.ts`)
- `regression-tests/video-timeline-seek-indicator.test.js` -> duplicate (`video/timeline_region_loop.cy.ts`, `video/frame_seeking.cy.ts`)
- `regression-tests/video-unmount.test.js` -> duplicate (`video/regions.cy.ts`)
- `regression-tests/video-snapshot.test.js` -> duplicate (`video/regions.cy.ts`)
- `regression-tests/video-meta.test.js` -> duplicate (`video/frame_seeking.cy.ts`)

### Readonly and view-all
- `readonly-tests/readonly-annotations/image-annotation-readonly.test.js` -> duplicate (`view_all/readonly.cy.ts`)
- `readonly-tests/readonly-annotations/audio-annotation-readonly.test.js` -> duplicate (`view_all/readonly.cy.ts`)
- `readonly-tests/readonly-annotations/ner-annotation-readonly.test.js` -> duplicate (`view_all/readonly.cy.ts`)
- `readonly-tests/readonly-annotations/timeseries-annotation-readonly.test.js` -> duplicate (`view_all/readonly.cy.ts`)
- `readonly-tests/readonly-results/image-results-readonly.test.js` -> duplicate (`view_all/readonly.cy.ts`)
- `readonly-tests/readonly-results/audio-results-readonly.test.js` -> duplicate (`view_all/readonly.cy.ts`)
- `readonly-tests/readonly-results/ner-results-readonly.test.js` -> duplicate (`view_all/readonly.cy.ts`)
- `readonly-tests/readonly-results/timeseries-results-readonly.test.js` -> duplicate (`view_all/readonly.cy.ts`)
- `readonly-tests/readonly-results/classification-results-readonly.test.js` -> duplicate (`view_all/readonly.cy.ts`)
- `readonly-tests/readonly-annotations/classification-annotation-readonly.test.js` -> duplicate (`view_all/readonly.cy.ts`)

### Relations/linking
- `regression-tests/brush-relations.test.js` -> duplicate (`relations/image_rectangle_regions.cy.ts`, `relations/order.cy.ts`)
- `regression-tests/wrong-results-order.test.js` -> duplicate (`relations/order.cy.ts`)

## Migrate (required behavior missing in Cypress)

- `table.test.js` -> migrate to Cypress table spec (sorting + array/object rendering)
- `shortcuts.test.js` -> migrate to Cypress shortcut/hotkey spec (textarea shortcuts and commit flow)
- `regression-tests/hotkey.test.js` -> migrate focused hotkey behavior using `Hotkeys` helper
- `regression-tests/numpad-hotkeys.test.js` -> migrate numpad hotkey behavior

## Drop (not carried forward)

These are intentionally not ported due to legacy behavior, low signal, or instability.
They are superseded by stronger deterministic Cypress coverage in adjacent areas.

- `smoke.test.js` (broad kitchen-sink smoke; superseded by targeted deterministic specs)
- `ocr.test.js` (legacy scenario overlaps text/rich-text + object-tag coverage)
- `nested.test.js` (covered by modern control-tags + relations composition tests)
- `paragraphs-filter.test.js` (covered by sync/audio_paragraphs behavior tests)
- `paragraphs-enhanced.test.js` (covered by sync/audio_paragraphs + linking tests)
- `rich-text/rich-text-basic-functional.test.js` (covered by existing rich text related control/tag tests)
- `rich-text/rich-text-regions-displaying.test.js` (covered by outliner/view-all + relations tests)
- `rich-text/rich-text-regions-interactions.test.js` (covered by linking and relations tests)
- `rich-text/rich-text-edge-cases.test.js` (legacy edge-only scenarios)
- `rich-text/rich-text-perfomance.test.js` (performance baseline is out of scope for migration)
- `regression-tests/annotation-button.test.js` (covered by `core/annotation-id.cy.ts` and drafts submit flow)
- `regression-tests/bitmask.test.js` (bitmask-specific workflow out of maintained baseline)
- `regression-tests/dynamic-choices.test.js` (covered by taxonomy/choices migration tests)
- `regression-tests/image-ctrl-drawing.test.js` (covered by image segmentation interaction tests)
- `regression-tests/image-draw-undo.test.js` (covered by drafts + selection/edit workflows)
- `regression-tests/image-width.test.js` (layout edge case)
- `regression-tests/image-zoom-position.test.js` (legacy viewport positioning edge case)
- `regression-tests/image-zoom-transform.test.js` (legacy transform edge case)
- `regression-tests/image.regions-select.test.js` (covered by image regions/outliner tests)
- `regression-tests/multiple-same-named-tools.test.js` (legacy config edge case)
- `regression-tests/outliner-regions-dnd.test.js` (flaky DnD variant)
- `regression-tests/preselected-choices.test.js` (covered by classification choices tests)
- `regression-tests/richtext.test.js` (covered by current text/control tags suite)
- `regression-tests/zoomed-image-displaying.test.js` (legacy visual edge case)
- `image-list.test.js` (legacy MIG image list scenario)
- `image.zoom-rotate.test.js` (covered by image segmentation + stage interactions)
- `conditional-serialization.test.js` (covered by focused control-tag serialization tests)
- `textarea.skip-duplicates.test.js` (covered by textarea assertions and serialization)
- `unfinished-polygons.test.js` (superseded by image segmentation and drafts behavior)
- `ner.test.js` (narrow NER paths covered by control-tags + emoji)
- `ner-text.test.js` (covered by `ner/emoji.cy.ts` and textarea classification workflows)
- `table.test.js` non-essential legacy assertions not included in migrated deterministic subset

## Notes

- Deterministic-only policy applies to all new Cypress tests:
  - no arbitrary `cy.wait(ms)`
  - state/event/assertion-driven synchronization only
- Each migration chunk is committed independently with verification details.
