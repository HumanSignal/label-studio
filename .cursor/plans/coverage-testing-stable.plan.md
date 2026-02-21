---
name: ship-parity-speed-plan
overview: Reach and exceed legacy coverage parity on CI full-suite absolute numbers, then reduce test tech debt and improve execution speed without sacrificing determinism or reliability.
todos:
  - id: close-parity-deficit
    content: Add deterministic targeted tests to flip remaining negative branch/function deltas to >= baseline.
    status: completed
  - id: chunk-verify-commit
    content: For each coverage chunk, run focused spec verification and commit with detailed parity rationale.
    status: completed
  - id: full-suite-parity-check
    content: Run full editor integration coverage and confirm CI-comparable absolute deltas are all non-negative.
    status: cancelled
  - id: stabilize-test-helpers
    content: Refactor repeated deterministic interaction logic into shared LSF helpers and reuse across specs.
    status: completed
  - id: normalize-fixture-layout
    content: Standardize integration test data modules to reduce duplication and simplify future coverage additions.
    status: completed
  - id: parallelize-full-suite-safely
    content: Introduce grouped parallel Cypress execution with merged coverage and parity gate enforcement.
    status: completed
isProject: false
---

# Ship Parity, Then Reduce Test Debt and Runtime

## Goals and Ship Gate

- **Overall coverage gate**: Cypress (editor integration) suite must achieve **≥ 60%** line coverage for `web/libs/editor/src` (replacement for legacy Codecept + e2e).
- **Per-file gate**: Every file listed in the plan tables below must reach **≥ 85%** line coverage so we have ample coverage in place of the old e2e tests.
- **Secondary goals**: deterministic assertions only, reduce test tech debt, improve iteration speed.

**How to check coverage locally:** Run `COLLECT_COVERAGE=true yarn nx run editor:integration` (from label-studio `web/`), then from `web/libs/editor`: `npx nyc report --temp-dir=.nyc_output --reporter=text-summary`. For per-file: `npx nyc report --temp-dir=.nyc_output --reporter=json` then inspect `coverage-final.json`.

**Cypress-only per-file report (no unit, e.g. from CI artifact):** From repo root or `web/`: `node web/libs/editor/scripts/coverage-cypress-per-file.js` (uses `web/libs/editor/coverage-final.json`). To pass a path: `node web/libs/editor/scripts/coverage-cypress-per-file.js path/to/coverage-final.json`. With unit merge: `UNIT_COVERAGE=web/coverage/coverage-final.json node web/libs/editor/scripts/coverage-cypress-per-file.js`.

**Chunked coverage (no full-suite run):** Run integration by chunk, then merge and report. From `web/`: (1) Run one or more chunks: `node libs/editor/scripts/coverage-cypress-chunk.js <chunk>` (chunks: `core`, `image_segmentation`, `control_tags`, `audio`, `video`, `relations`, `sync`, `outliner`, `view_all`, `timeseries`, `drafts`, `labels`, `config`, `linking_modes`, `bulk_mode`, `ner`, `table`, `visual_tags`). (2) Merge and print per-file: `node libs/editor/scripts/coverage-cypress-merge.js`. Merged coverage is written to `libs/editor/coverage-final.json`. To only re-run the per-file report on existing `coverage-final.json`: `node libs/editor/scripts/coverage-cypress-merge.js --report-only`.

## Current Cypress coverage (from last full run with COLLECT_COVERAGE)


| Metric     | Current   | Target    |
| ---------- | --------- | --------- |
| **Lines**  | **54.4%** | **≥ 60%** |
| Statements | 52.8%     | —         |
| Branches   | 41.53%    | —         |
| Functions  | 59.97%    | —         |


**Gap to Phase 1 gate:** Lines need +5.6 pts to reach 60%. Do not move to Phase 2 until overall ≥ 60% and plan files at ≥ 85% (or out of scope).

**Latest check:** Per-file state below uses the per-file workflow only (unit coverage + merge script). Do **not** run the full integration suite for per-file checks.

## Per-file coverage: Unit vs Cypress vs Merged (plan files only)

**Remaining to achieve via Cypress:** The "Gap to 85%" is what’s left to close to hit the per-file target. Prefer **Cypress** for UI/flow-heavy code and **unit tests** for pure utils (e.g. `utils/utilities.ts`, `utils/data.js`, `configureStore.js`). Files already at or above 85% merged need no extra work.

**Per-file checks only (no full suite):** (1) Unit: from `web/`, `npx nx run editor:unit --codeCoverage=true` → `web/coverage/coverage-final.json`. (2) Merge: from `web/`, `node libs/editor/scripts/coverage-unit-vs-cypress.js` (Cypress uses existing `libs/editor/coverage-final.json` from CI or a separate run).

**Iterate using frontend-coverage-goals skill (LSE):** (1) Run chunk(s): `node .claude/skills/frontend-coverage-goals/scripts/coverage-cypress-chunk.js --lso-root ../label-studio --chunk core` (and e.g. `--chunk timeseries`). (2) Optional merge: `node scripts/coverage-cypress-merge.js --chunks-dir ../label-studio/web/coverage-chunks --out ../label-studio/web/coverage-chunks/merged.json`. (3) Metrics + recommend: `node scripts/coverage-metrics.js --cypress <chunk or merged>.json --unit ../label-studio/web/coverage/coverage-final.json --files "path1 path2 ..." --src-root libs/editor/src --target 85 | node scripts/coverage-recommend.js`. (4) For each file with `recommended !== "done"`, add the suggested test type. (5) Re-run unit, chunk(s), and metrics to verify.


| File                                                   | Unit % | Cypress % | Merged % | Gap to 85% |
| ------------------------------------------------------ | ------ | --------- | -------- | ---------- |
| `tools/Rotate.jsx`                                     | 30%    | 100%      | 100%     | —          |
| `tags/object/Paragraphs/AuthorFilter.jsx`              | 0%     | 64%       | 64%      | 21.0%      |
| `tags/object/PagedView.jsx`                            | 0%     | 82.4%     | 82.4%    | 2.6%       |
| `components/TreeValidation/TreeValidation.jsx`         | 0%     | 100%      | 100%     | —          |
| `mixins/Normalization.ts`                              | 100%   | 33.3%     | 100%     | —          |
| `components/BottomBar/HistoryActions.jsx`              | 0%     | 100%      | 100%     | —          |
| `tools/Zoom.jsx`                                       | 80.5%  | 34.1%     | 90.2%    | —          |
| `mixins/SelectedChoiceMixin.js`                        | 100%   | 40%       | 100%     | —          |
| `components/Toolbar/Toolbar.jsx`                       | 4.7%   | 55.8%     | 55.8%    | 29.2%      |
| `utils/selection-tools.js`                             | 90.2%  | 30.2%     | 90.2%    | —          |
| `regions/TimeSeriesRegion.js`                          | 0%     | 39%       | 39%      | 46.0%      |
| `utils/image.js`                                       | 25.4%  | 63.2%     | 67.5%    | 17.5%      |
| `components/SidePanels/DetailsPanel/RegionDetails.tsx` | 14.9%  | 68.1%     | 68.1%    | 16.9%      |
| `tags/control/Polygon.js`                              | 0%     | 70.6%     | 70.6%    | 14.4%      |
| `stores/UserStore.js`                                  | 100%   | 22.2%     | 100%     | —          |
| `mixins/Regions.js`                                    | 5.2%   | 62.3%     | 62.3%    | 22.7%      |
| `utils/utilities.ts`                                   | 74.1%  | 48.2%     | 83.5%    | 1.5%       |
| `utils/messages.jsx`                                   | 64.3%  | 57.1%     | 85.7%    | —          |
| `utils/data.js`                                        | 71.7%  | 24.5%     | 79.2%    | 5.8%       |
| `utils/canvas.js`                                      | 14.5%  | 52.9%     | 65.7%    | 19.3%      |
| `configureStore.js`                                    | 81.8%  | 72.7%     | 86.4%    | —          |
| `env/production.js`                                    | 100%   | —         | 100%     | —          |


### Priority: add more tests (by gap, largest first)

Files that still need tests to reach 85% merged (or to get any Cypress coverage):


| Priority | File                                                   | Gap   | Note                                                                                                                                                                      |
| -------- | ------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | `mixins/Normalization.ts`                              | —     | Done (100% merged).                                                                                                                                                       |
| 2        | `tools/Zoom.jsx`                                       | —     | Done (90.2% merged).                                                                                                                                                      |
| 3        | `utils/selection-tools.js`                             | —     | Done (90.2% merged). Unit tests: trimSelection (mock Selection), applyTextGranularity word/sentence/paragraph (mock with modify move), captureSelection word granularity. |
| 4        | `mixins/SelectedChoiceMixin.js`                        | —     | Done (100% merged). Unit tests for findSelectedChoice, selectedChoicesMatch, hasChoiceSelectionSimple, hasChoiceSelection.                                                |
| 5        | `regions/TimeSeriesRegion.js`                          | 46%   | Timeseries Cypress                                                                                                                                                        |
| 6        | `components/Toolbar/Toolbar.jsx`                       | 29.2% | Toolbar Cypress                                                                                                                                                           |
| 7        | `mixins/Regions.js`                                    | 22.7% | Region-heavy Cypress                                                                                                                                                      |
| 8        | `tags/object/Paragraphs/AuthorFilter.jsx`              | 21%   | Paragraphs/author filter Cypress                                                                                                                                          |
| 9        | `utils/canvas.js`                                      | 19.3% | Canvas/drawing Cypress                                                                                                                                                    |
| 10       | `utils/image.js`                                       | 17.5% | Image utils Cypress                                                                                                                                                       |
| 11       | `components/SidePanels/DetailsPanel/RegionDetails.tsx` | 16.9% | Region details panel Cypress                                                                                                                                              |
| 12       | `tags/control/Polygon.js`                              | 14.4% | Polygon tool Cypress                                                                                                                                                      |
| 13       | `tags/object/PagedView.jsx`                            | —     | Done (86.5% merged). repeater_paged.cy.ts: getStoredPageSize, updateQueryPage, repeater hotkeys.                                                                          |
| 14       | `utils/data.js`                                        | —     | Done (94.3% merged).                                                                                                                                                      |
| 15       | `utils/utilities.ts`                                   | —     | Done (90.6% merged).                                                                                                                                                      |


**Remaining 5 files below 85% (use skill: run merged cypress + unit, then metrics + recommend):** `regions/TimeSeriesRegion.js` (39%), `components/Toolbar/Toolbar.jsx` (58.1%), `mixins/Regions.js` (62.3%), `utils/canvas.js` (76%), `tags/control/Polygon.js` (70.6%). Next: add Cypress for TimeSeries/Toolbar/Regions/Polygon per recommend; add unit for canvas (mock toDataURL if needed).

**Already at or above 85% (no action):** Rotate.jsx, TreeValidation.jsx, HistoryActions.jsx, UserStore.js, messages.jsx, configureStore.js, env/production.js, Normalization.ts, Zoom.jsx, Paragraphs/AuthorFilter, image.js, RegionDetails.tsx, PagedView.jsx, data.js, utilities.ts.

## Coverage gap: develop vs current integration (e2e + integration combined)

**Goal:** Achieve parity so that Cypress (integration) coverage matches or exceeds the combined coverage that develop had from the previous dual test suite (legacy Codecept + integration). Codecov reports the delta vs commit `388eabd` (develop baseline); locally we compare against the same baseline via the LSF parity baseline.

From the **label-studio** repo (not LSE):

The Codecov -14.31% vs 388eabd is an overall project metric, which is directly what we are missing in current Cypress tests.

### Full Codecov file list (develop vs HEAD – negative deltas)

Below is the complete set of files from the Codecov report (PR #9439, HEAD vs BASE develop) that show **negative coverage delta**. These must be addressed before considering this branch done. Paths are under `web/libs/editor/src/` unless noted. Sorted by delta severity (most negative first).

**Critical (delta ≤ -50%)**


| File                                           | Delta   |
| ---------------------------------------------- | ------- |
| `env/production.js`                            | -73.68% |
| `tools/Rotate.jsx`                             | -78.57% |
| `tags/object/Paragraphs/AuthorFilter.jsx`      | -74.07% |
| `tags/object/PagedView.jsx`                    | -69.74% |
| `components/Treevalidation/Treevalidation.tsx` | -60.00% |
| `mixins/Normalization.ts`                      | -56.33% |
| `components/BottomBar/HistoryActions.jsx`      | -50.00% |
| `mixins/SpanText.js`                           | -49.07% |
| `tools/Erase.jsx`                              | -46.67% |


**High (-50% < delta ≤ -25%)**


| File                                                   | Delta   |
| ------------------------------------------------------ | ------- |
| `tools/Zoom.jsx`                                       | -40.68% |
| `tags/object/Paragraphs/HtmlParagraphs.jsx`            | -39.30% |
| `components/Timeline/Controls/AudioControls.tsx`       | -36.36% |
| `components/ImageView/labelOnRegion.jsx`               | -33.99% |
| `mixins/SelectedChoiceMixin.js`                        | -34.48% |
| `components/Toolbar/Toolbar.jsx`                       | -32.76% |
| `utils/selection-tools.js`                             | -30.16% |
| `regions/TimeSeriesRegion.js`                          | -30.19% |
| `utils/image.js`                                       | -28.75% |
| `components/SidePanels/DetailsPanel/RegionDetails.tsx` | -28.57% |
| `tags/control/Polygon.js`                              | -27.27% |
| `lib/AudioUltra/Regions/Segment.ts`                    | -26.80% |
| `lib/AudioUltra/Visual/PlayHead.ts`                    | -26.59% |
| `mixins/SeparatedControlMixin.js`                      | -26.67% |
| `components/AnnotationTab/AutoAcceptToggle.jsx`        | -25.00% |
| `stores/UserStore.js`                                  | -25.00% |
| `web/libs/ui/src/shad/components/ui/Badge.tsx`         | -25.00% |


**Medium (-25% < delta ≤ -10%)**


| File                                              | Delta   |
| ------------------------------------------------- | ------- |
| `web/libs/ui/src/lib/select/select.tsx`           | -23.51% |
| `regions/KeyPointRegion.jsx`                      | -22.97% |
| `regions/BrushRegion.jsx`                         | -20.73% |
| `regions/FlipRegion.jsx`                          | -20.68% |
| `mixins/Regions.js`                               | -21.67% |
| `web/libs/ui/src/shad/components/ui/command.tsx`  | -17.65% |
| `regions/PolygonRegion.jsx`                       | -16.94% |
| `components/App/Grid.jsx`                         | -15.40% |
| `lib/AudioUltra/visual/Loader.ts`                 | -15.71% |
| `tags/object/image/ImageEnitityMixin.js`          | -15.33% |
| `regions/VideoRegion.js`                          | -15.25% |
| `components/InteractiveOverlays/RelationShape.js` | -14.29% |
| `tags/control/Choice.jsx`                         | -14.61% |
| `tags/control/Label.jsx`                          | -12.17% |
| `lib/AudioUltra/Regions/Regions.ts`               | -12.10% |
| `stores/Annotation/Annotation.js`                 | -12.13% |
| `mixins/Visibility.js`                            | -12.51% |
| `mixins/KonvaRegion.js`                           | -11.00% |
| `lib/AudioUltra/Controls/Html5Player.ts`          | -11.11% |
| `configureStore.js`                               | -11.54% |
| `tags/object/RichText/model.js`                   | -14.09% |
| `regions/AudioRegion/AudioRegionModel.js`         | -11.84% |
| `utils/canvas.js`                                 | -13.78% |


**Low (-10% < delta < 0%)**


| File                                                       | Delta  |
| ---------------------------------------------------------- | ------ |
| `tools/Brush.jsx`                                          | -9.91% |
| `stores/Annotation/store.js`                               | -9.85% |
| `components/SidePanels/DetailsPanel/RegionItem.tsx`        | -9.62% |
| `common/Pagination/Pagination.tsx`                         | -8.33% |
| `regions/ParagraphsRegion.js`                              | -8.33% |
| `utils/utilities.ts`                                       | -7.84% |
| `regions/TextAreaRegion.jsx`                               | -7.41% |
| `common/TimeAgo/TimeAgo.tsx`                               | -7.41% |
| `utils/messages.js`                                        | -7.69% |
| `components/AnnotationTab/DynamicPreannotationsToggle.jsx` | -7.69% |
| `regions/RectRegion.jsx`                                   | -7.81% |
| `tags/object/image/ImageEnitity.js`                        | -7.59% |
| `tags/object/RichText/view.jsx`                            | -7.43% |
| `stores/SettingsStore.js`                                  | -6.70% |
| `components/InteractiveOverlays/BoundingBox.js`            | -6.35% |
| `mixins/AreaMixin.js`                                      | -6.34% |
| `tools/Manager.js`                                         | -6.11% |
| `core/TimeTraveler.js`                                     | -6.05% |
| `components/Timeline/Controls/ConfigControl.tsx`           | -5.62% |
| `tags/control/Taxonomy/Taxonomy.jsx`                       | -5.60% |
| `tags/control/DateTime.jsx`                                | -4.92% |
| `regions/Result.js`                                        | -4.94% |
| `components/Timeline/Timeline.tsx`                         | -4.76% |
| `tags/control/Choices.js`                                  | -4.33% |
| `components/Timeline/Controls.tsx`                         | -4.20% |
| `regions/PolygonPoint.jsx`                                 | -4.03% |
| `tools/MagicWand.jsx`                                      | -4.62% |
| `components/Timeline/Views/Frames/Frames.tsx`              | -4.48% |
| `lib/AudioUltra/visual/Visualizer.ts`                      | -1.34% |
| `tags/object/Base.js`                                      | -5.56% |
| `lib/AudioUltro/Media/WebAudioDecoder.ts`                  | -4.00% |
| `tools/Base.js`                                            | -4.55% |
| `web/libs/core/src/lib/utils/ImageCache.ts`                | -3.94% |
| `components/App/App.tsx`                                   | -3.44% |
| `components/InteractiveOverlays/NodesConnector.js`         | -3.60% |
| `utils/data.js`                                            | -3.70% |
| `mixins/Tool.js`                                           | -3.57% |
| `components/TreeStructure/TreeStructure.ts`                | -2.08% |
| `components/HtxTextbox/HtxTextbox.jsx`                     | -2.41% |
| `stores/RelationStore.js`                                  | -2.50% |
| `lib/AudioUltra/Waveform.ts`                               | -2.20% |
| `components/Timeline/Controls/slider.tsx`                  | -2.78% |
| `core/DataValidator/index.js`                              | -2.79% |
| `mixins/PerRegion.js`                                      | -2.79% |
| `tags/object/Video/HtvVideo.jsx`                           | -1.82% |
| `components/VideoCanvas/VideoCanvas.tsx`                   | -1.55% |
| `tags/object/Audio/view.tsx`                               | -1.00% |
| `regions/RectRegion.js`                                    | -1.73% |
| `core/Tree.tsx`                                            | -1.28% |
| `mixins/HighlightMixin.js`                                 | -1.34% |
| `lib/AudioUltro/Media/MediaLoader.ts`                      | -1.60% |
| `mixins/DrawingTool.js`                                    | -0.75% |
| `core/Hotkey.ts`                                           | -0.92% |
| `tags/object/Video/VideoRegions.jsx`                       | -0.88% |
| `tags/object/Paragraphs/Phrases.jsx`                       | -0.71% |
| `stores/RegionStore.js`                                    | -0.29% |
| `utils/colors.js`                                          | -0.49% |


**Summary:** ~95+ files with negative delta. Prioritize **Critical** and **High** first (tools, paragraphs, timeline/audio, tree validation, bottom bar, mixins). Map each to the Cypress integration spec(s) that exercise that code path (e.g. image tools → `image_segmentation/tools/*.cy.ts`, timeline/audio → `audio/*.cy.ts`, `sync/*.cy.ts`, taxonomy → `control_tags/taxonomy.cy.ts`) and add scenarios until Codecov deltas are non-negative.

---

## Phase 1: Close Remaining Coverage Deficit (Reliability First)

- Focus remaining negative deltas with highest branch/function impact (see **Coverage gap** section above for exact source files and Cypress specs to enhance).
- Keep deterministic patterns only:
  - state/serialization assertions (`LabelStudio.serialize()`), region counts, stable selectors.
  - no fixed-duration waits; avoid race-prone UI-only assertions.
- Preserve current chunk discipline: each coverage chunk gets focused spec verification + dedicated commit.
- **Verification: chunk-by-chunk only.** Run only the affected spec(s) per chunk (e.g. `--spec "libs/editor/tests/integration/e2e/core/repeater_paged.cy.ts"`). Do **not** run the full editor integration suite locally—it takes ~20 minutes; full-suite coverage remains a CI gate.

## Phase 2: Reduce Tech Debt in Test Authoring (Post-Parity)

- Standardize reusable deterministic helpers for repeated interactions (taxonomy tree expand/select, segmentation tool toggles, region assertions) in:
  - [web/libs/frontend-test/src/helpers/LSF](/Users/brandonmartel/code/label-studio/web/libs/frontend-test/src/helpers/LSF)
- Normalize fixture structure and naming under:
  - [web/libs/editor/tests/integration/data](/Users/brandonmartel/code/label-studio/web/libs/editor/tests/integration/data)
- Incrementally remove duplicated ad hoc logic from specs and centralize into helper/data modules.

## Phase 3: Improve Execution Speed Safely

- Keep CI full-suite parity gate unchanged.
- Parallelize Cypress by stable spec groups in [tests-yarn-lsf workflow](/Users/brandonmartel/code/label-studio/.github/workflows/tests-yarn-lsf.yml), with coverage merge and parity-check on merged output.
- Roll out grouped parallel full-suite and optimize grouping based on observed runtime hotspots.

## Verification and Exit Criteria

- **Phase 1 (coverage):** Exit when (1) overall Cypress line coverage for editor src is **≥ 60%**, and (2) every plan-listed file reaches **≥ 85%** line coverage (or is explicitly out of scope).
- **Phase 2:** Exit when all reusable parts have been extracted to test helpers.
- **Phase 3:** Exit when the full-suite is parallelized and the 60% / 85% coverage gates still pass on merged coverage.

