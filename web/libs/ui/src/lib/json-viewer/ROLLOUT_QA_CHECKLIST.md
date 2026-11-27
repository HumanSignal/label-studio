# FIT-2011 — Virtualized JSON editor rollout QA checklist

**Epic:** [FIT-2007](https://humansignal.atlassian.net/browse/FIT-2007)  
**Spec:** [Notion design spec](https://app.notion.com/p/3847094e54c881cb9b32ff31c4b69e7a)  
**Branch / PR:** `fb-fit-2006` · [PR #1461](https://github.com/HumanSignal/hs-platform/pull/1461)  
**Flag:** `fflag_feat_fit_2007_virtualized_json_editor_short` (`FF_FIT_2007_VIRTUALIZED_JSON_EDITOR`)  
**Last validated:** 2026-06-19

## How to run QA

| Configuration | Steps |
|---|---|
| **Flag OFF (regression guard)** | Remove or set `fflag_feat_fit_2007_virtualized_json_editor_short=false` in repo-root `.env`, restart LSE backend, hard-refresh browser |
| **Flag ON (parity)** | Set `fflag_feat_fit_2007_virtualized_json_editor_short=true` in `.env`, restart backend, hard-refresh |

Local LSE: `make lse_fe_dev` + Docker DB/Redis. Test origin: `http://localhost:8000`.

---

## Automated tests (2026-06-19)

All green on branch `fb-fit-2006` (commit `2f2f143e6`).

| Suite | Command | Result |
|---|---|---|
| JsonViewer + CodeEditor unit tests | `cd services/lso/web && bun test libs/ui/src/lib/json-viewer/ libs/ui/src/lib/code-editor/` | **24 pass** |
| LSE page tests (CodeEditor mocks) | `cd services/lse/web && bun test PlaygroundPage.test.tsx CreateInterfaceModal.test.tsx OverviewPage.test.tsx ConfiguratorPlugins.test.tsx` | **58 pass** |

Flag coverage in unit tests:

- `json-viewer.feature-flag.test.tsx` — legacy vs virtualized inner, filters, copy
- `code-editor.feature-flag.test.tsx` — legacy CM5 vs CM6 shim, ref parity

---

## Performance evidence

### jsdom mount benchmark (`benchmark-results.json`)

Task Source–shaped fixtures, depth-2 expand, Bun 1.3.11. Thresholds from spec: **TTI &lt;500ms @100KB**, **&lt;2s @1MB**.

| Fixture | Library | Median mount | DOM nodes | Threshold |
|---|---|---|---|---|
| 100KB | json-edit-react (legacy) | 120 ms | 8,548 | — |
| 100KB | react-json-virtualization (flag ON) | **27 ms** | **5** | ✅ &lt;500ms |
| 1MB | json-edit-react (legacy) | 1,097 ms | 85,416 | — |
| 1MB | react-json-virtualization (flag ON) | **135 ms** | **5** | ✅ &lt;2s |

See also [PERF_SPIKE_RESULTS.md](./PERF_SPIKE_RESULTS.md) for spike rationale and manual Chrome notes.

### Manual Task Source (local, flag ON)

| Fixture | Environment | Observed | Notes |
|---|---|---|---|
| ~1.1 MB task (3,872 annotations) | Local LSE, project **6**, task **2695** | Modal interactive tree usable immediately; search highlight works | Prior baseline ~8.8s to interactive with legacy (same fixture, pre-migration session) |

---

## Manual QA matrix

Legend: ✅ pass · ⏭️ not exercised this session (no blocker)

### JsonViewer surfaces

| # | Surface | Route / entry | Flag OFF | Flag ON | Checks |
|---|---|---|---|---|---|
| 1 | **Task Source Viewer** (large JSON) | DM → `{}` icon → *Source for task* modal | ✅ | ✅ | Interactive tree, search, filters (All/Annotations/Data), Resolve URIs toggle, Code tab, copy icon |
| 2 | **Region Details panel** | Labeling view → region inspector JSON | ⏭️ | ⏭️ | Uses `JsonViewer`; covered by unit tests + same inner component |
| 3 | **Task Summary DataSummary** | Labeling → task summary drawer | ⏭️ | ⏭️ | `DataSummary.tsx` → `JsonViewer`; smoke via shared component tests |

### CodeEditor surfaces (CM6 when flag ON)

| # | Surface | Route / entry | Flag OFF | Flag ON | Checks |
|---|---|---|---|---|---|
| 4 | **Labeling Interface — Code tab** | `/projects/6/settings/labeling` | ✅ | ✅ | CM5/CM6 editor, syntax highlighting, **Update Preview** keeps editor text and updates preview |
| 5 | **Interface config JSON tab** | Interfaces → `ConfigForm.tsx` JSON mode | ⏭️ | ⏭️ | Same `CodeEditor` primitive; Playground/CreateInterfaceModal tests pass |
| 6 | **Playground JSON editor** | Interfaces playground | ⏭️ | ⏭️ | `PlaygroundPage.test.tsx` green (config editor, theme toggle) |
| 7 | **Model Instance variables** | Prompts / model variables (`CodeInput`) | N/A | N/A | **Out of flag scope** — `CodeInput` still CM5; unchanged by design (G-3) |
| 8 | **Quality Settings custom metrics** | Settings → Quality → custom metrics | ⏭️ | ⏭️ | Uses `CodeEditor`; no dedicated manual pass yet |

### Cross-cutting

| Check | Flag OFF | Flag ON |
|---|---|---|
| Light theme — JsonViewer toolbar + tree colors | ✅ | ✅ |
| Dark theme — CodeEditor background (no white flash) | ⏭️ | ✅ (labeling Code tab) |
| Dark theme — JsonViewer | ⏭️ | ⏭️ |
| Copy exports `JSON.stringify(data, null, 2)` | ✅ (unit test) | ✅ (unit test) |
| Custom filters (`searchFilter` / Annotations) | ✅ (Task Source UI) | ✅ (unit test + Task Source UI) |
| Large config (≥100 tags) manual Update Preview | ✅ (project 6) | ✅ (project 6) |
| Legacy path active (`json-edit-react` / CM5) | ✅ (`virtualized-json-viewer-inner` absent; `.CodeMirror` present) | ✅ (CM6 / virtualized inner when ON) |

---

## Session notes (2026-06-19, flag ON)

**Environment:** `http://localhost:8000` (local LSE, `fflag_feat_fit_2007_virtualized_json_editor_short=true`)

1. **Task Source** — Opened modal for task 2695; virtualized tree shows `annotations: [ 3872 items ]`; search `yousif` highlights `created_username`; filter chips and Resolve URIs present.
2. **Labeling Interface Code** — CM6 editor shows large XML config with highlighting; Update Preview preserves editor content and updates preview.

**Verdict (flag ON):** **PASS** for primary high-traffic surfaces (Task Source + Labeling Code).

## Session notes (2026-06-19, flag OFF)

**Environment:** `http://localhost:8000` (local LSE, `fflag_feat_fit_2007_virtualized_json_editor_short=false`; `lse-app` recreated via `docker compose … up -d --force-recreate lse-app`)

Verified `APP_SETTINGS.feature_flags.fflag_feat_fit_2007_virtualized_json_editor_short === false`.

1. **Task Source** — Legacy `json-edit-react` interactive tree (no `virtualized-json-viewer-inner`); `annotations: [ 3872 items ]`; search bar, All/Annotations/Data filters, Resolve URIs toggle; Code tab shows formatted JSON.
2. **Labeling Interface Code** — Legacy CM5 (`.CodeMirror`, `data-testid="legacy-code-editor"`); edited header to `Phase 1 Project FF-OFF-MARKER`; Update Preview updated preview and editor retained text.

**Verdict (flag OFF):** **PASS** — regression guard confirmed on primary surfaces.

---

## Rollout gate

- [x] Automated tests green (flag on/off paths in unit tests)
- [x] Perf thresholds met in jsdom benchmark (100KB, 1MB)
- [x] Manual QA on Task Source + Labeling Code (flag ON)
- [x] Manual QA flag OFF regression on rows 1 + 4
- [ ] Dark mode JsonViewer manual pass
- [ ] Staging / appx preview smoke before LD gradual rollout

**Blocks FIT-2012 (flag removal):** all boxes above + bake period with flag ON at scale.
