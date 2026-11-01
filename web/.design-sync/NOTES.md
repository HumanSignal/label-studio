# design-sync notes — @humansignal/ui → claude.ai/design ("HumanSignal UI")

Run everything from `services/lso/web` (the scripts resolve `.design-sync/` and `@ds-stories/` against cwd).

## Re-sync recipe

1. `bun install --frozen-lockfile`; stage scripts per the skill (`.ds-sync/` + `npm i esbuild ts-morph @types/react
   playwright` + chromium).
2. `bash .design-sync/build/build.sh` (buildCmd → `dist/design-sync/ui/` + `dist/design-sync/ui-tokens/`).
3. If stories/DS changed: `npx storybook build -c libs/storybook/.storybook -o .design-sync/sb-reference`, THEN
   `node .design-sync/build/inject-reference-fonts.mjs` (never skip — see Monospace below).
4. Fetch `_ds_sync.json` from the project → `.design-sync/.cache/remote-sync.json`, then
   `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle
   --remote .design-sync/.cache/remote-sync.json --max-stories 30`.
5. `.design-sync/conventions.md` is the README header (`readmeHeader`) — re-validate its names against the build.

## Build pipeline (why it looks like this)

- [GENERAL] `@humansignal/ui` ships TS source only (`main: src/index.ts`) — there is no dist. `buildCmd`
  (`bash .design-sync/build/build.sh`) compiles one into `dist/design-sync/ui/` (gitignored):
  - `vite.config.ts` applies the reference storybook's own `viteFinal` (`libs/storybook/.storybook/main.ts`) — same
    aliases, svgr, CSS-module scoped names (`name--hash` from `vite-prefix-css-module.ts`), `postcss-prefix-lsf`
    (`lsf-` class prefixing for `*.prefix.css`), tailwind. Do NOT let the converter esbuild the TS source: esbuild's
    CSS-module names would not match the compiled CSS and `.prefix.css`/tailwind would not be processed.
  - `ds-entry.ts` = global CSS (tailwind.css + styles.prefix.css, exactly what `.storybook/preview.ts` loads) +
    `src/index.ts` + `lib/date-range-picker` (not in the barrel, but apps deep-import it and it has stories).
  - Icons are a separate vite entry (`icons.cjs`), merged by the converter via `cfg.extraEntries: ["./icons.cjs"]`
    (main-package-wins). Exporting icons from the main entry made Phosphor legacy aliases (`Tabs`, `Spinner`,
    `Table`, …) ambiguous → ESM dropped both → `Tabs` vanished from the global.
  - [GENERAL] The icons entry is GENERATED (`gen-icons-entry.mjs` → `.design-sync/.cache/icons-entry.ts`): all custom
    `Icon*` svgs + only the Phosphor names LSO/LSE apps+libs import (scanned each build) + `phosphor-extras.txt`.
    Why: `@humansignal/icons` re-exports ALL of Phosphor (~5 MB); the 9.1 MB bundle failed upload with ECONNRESET
    twice (a 9 MB single-file write doesn't go through; 4.3 MB does). A story/component using a Phosphor icon NOT in
    the subset would render undefined — the scan covers libs/ui stories, so it can't happen unless the scan misses
    an import style (it reads `import { … } from "@humansignal/icons" | "@phosphor-icons/react"`).
  - Output format is **CJS**, not ES: rolldown's ESM output turns bundled CommonJS deps' `require("react")` into a
    throwing `__require` shim ("Dynamic require of react is not supported" in every preview). CJS keeps real
    requires the converter maps to window.React. react / react-dom / react-is / scheduler are external.
  - Vite lib mode inlines all assets: Figtree ships as data-URI `@font-face` inside style.css (expected).
  - `build-dts.mjs` emits `.d.ts` via the TS API. libs/ui has ~80 pre-existing type errors (non-blocking). It applies
    an in-memory patch (`export interface DropdownTriggerProps`) because TS4023 otherwise makes tsc silently skip
    `dropdown.d.ts` and `Dropdown` drops out of the sync. The build fails if a patch stops matching.
    `ambient.d.ts` stands in for the `@nx/react` typings tsconfig.lib.json names (not installed).
  - `types/index.d.ts` is generated from `ds-entry.ts`'s `export *` lines — keep ds-entry the single source.
- Bundle weight: `_ds_bundle.js` ≈ 4.3 MB with the Phosphor subset (was 9.1 MB with all of Phosphor — failed upload).
- `tokensPkg: "../dist/design-sync/ui-tokens"` (a node_modules-relative path; copyTokens joins it onto
  --node-modules) ships `libs/ui/src/tokens/tokens.prefix.css` as `tokens/tokens.css` so the README/agent see the
  real semantic tokens instead of `--tw-*` internals. Same declarations as the compiled CSS (no render change).
  `colors.prefix.css` (deprecated legacy palette) is deliberately not shipped as a token file.

## Storybook / previews

- The storybook (`libs/storybook/.storybook`) also globs LSE `libs/interface-components` stories — a separate library
  (window.InterfaceComponents, its own sync). Excluded via `titleMap: {<Name>: null}`; so are `Design/Tokens` and
  `UI/Icons` galleries (not components).
- `storyImports.shim: ["/libs/ui/src/"]`: stories import components relatively from lowercase files
  (`../button/button`), which the default rule-2 match (file name == export name) misses → they'd bundle a second
  source copy. Every libs/ui import shims to window.HumanSignalUI instead. Story-local helpers that are NOT public
  exports must be carved out with `storyImports.bundle` (currently `/date-range-picker/date-utils`).
- MediaCard `PdfRealSample` story dynamically imports `pdfjs-dist` (whose node branch does `import("fs")`, fatal for
  the preview compile). `pdfjs-dist` is shimmed (`storyImports.shim`) and the story skipped
  (`overrides.MediaCard.skip`) — it needs a real pdf.js + worker at runtime.
- No `.storybook/preview` decorators; theme is set by `preview-head.html` (`data-color-scheme` on <html>, light by
  default in headless capture). Tokens default to light on `:root`; dark lives under `[data-color-scheme="dark"]`.
- `cardMode: "column"` for the 12 wide-story components validate flagged; Toast is `single` (portal viewport).
- Compare runs use `--max-stories 30` (every story captured; Select has 25).
- [GENERAL] `parameters.layout: "centered"` (dropdown, context-menu, popover, select, badge-group, date-range-picker,
  sparkles stories): storybook's `.sb-main-centered #storybook-root{margin:auto}` shrink-wraps the story root to
  max-content width; the stock preview ignored `parameters.layout` and stretched block-level roots / fill-width
  triggers to the full card (graded close in wave 1). Fixed by the fork `.design-sync/overrides/
  preview-gen-storybook.mjs` (cfg.libOverrides): COMPOSE merges meta+story parameters and wraps centered stories in a
  `width:fit-content; margin-inline:auto` box. Any fork file is in the GLOBAL grade slice — editing it re-grades all.
- [GENERAL] Same fork mirrors storybook's actions addon: argTypes declaring `action` get a no-op handler when their
  arg is unset (EnterpriseUpgradeOverlay renders its close X only when `onClose` exists; also checkbox onChange,
  date-range-picker setAppliedDates/setFloatingNowRange, stepper onStepSelect). No story uses play/loaders/globals
  (audited) — if one ever does, compose() doesn't run it.
- A centered story whose max-content width lands in 852–868px (Select "Multiple Select With Virtual List And
  Search": 864) still wraps one word earlier: storybook pads inside the centered root, the preview frame pads 24px
  outside. Framing; graded match.
- [GENERAL] `--font-mono` is a HOST-APP variable (apps/labelstudio themes: `monaco, monospace`), not a DS token;
  ai-chat-loading/ai-chat-thinking/code-editor read `var(--font-mono, ui-monospace, monospace)`. `.design-sync/build/
  host-vars.css` (imported by ds-entry.ts AND injected into sb-reference by inject-reference-fonts.mjs) maps it to
  `var(--font-family-mono)` → IBM Plex Mono, per the user's mono-font decision. Flip that one line to change it.
- Tailwind safelist (vite.config.ts SEMANTIC_SAFELIST): the design agent is told to use semantic utilities, but JIT
  only compiled the ~30/176 semantic colors the repo uses. The dist compiles the whole semantic vocabulary (colors
  bg/text/border + hover, spacing, type, radius, tracking). CSS 418 → 582 KB; strict superset, no existing class moved.
- Pagination `Single Page` skipped: renders null by design (totalPages 1 without alwaysVisible) — sb-error both sides.
- Toast (`cardMode: single`): the fixed `.toast-viewport` anchors to the single-card wrapper, so the toast sits near
  the top of the preview vs the bottom of the storybook viewport — framing; never neutralize the fixed viewport.
- Interaction-gated stories (hover/click/right-click): Tooltip, Popover, Drawer, Dropdown, ContextMenu, ModalWindow —
  both sides show the closed trigger only. Graded match; the cards therefore show triggers, not open overlays.
- Pagination: "Single Page" sb-error → skipped (see above). All AiChat* stories pixel-identical.

## Grading gotchas (read before grading)

- Raw captures differ in size: storybook 868x668, preview 900x700 with a 24px frame padding — the sheet scales the
  two sides differently, so widths LOOK different on the sheet. Judge at native resolution (raw/ PNGs); crop each to
  its content bbox and compare sizes — identical bbox sizes are the norm for faithful renders.
- [GENERAL] Storybook's own `preview.prefix.css` sets `body{height:100vh}` and `#storybook-root{height:100%}`.
  Components whose root fills its parent's height (MediaCard, panels) stretch to the full frame in storybook but are
  content-height in the preview. That is framing — grade the component, not the frame (`match` with a note).
- Same for container WIDTH: preview frame is 16px narrower, so long text may wrap one word earlier. Framing.
- Interaction-gated overlays: ModalWindow stories (and likely Drawer/Dropdown/Popover/ContextMenu) render only a
  closed trigger button in storybook. If both sides show the same trigger, that is `match`. NEVER force the overlay
  open in a preview to "improve" it.
- Monospace: `--font-family-mono: "IBM Plex Mono"` (and react-json-virtualization's `IBM Plex Mono, JetBrains Mono,
  Menlo, …` stack) — the app itself never ships Plex. USER DECISION 2026-10-03: ship IBM Plex Mono to Claude Design
  anyway. Files: `.design-sync/fonts/ibm-plex-mono/` (v2.3 woff2 400/500/600/700, © IBM, SIL OFL 1.1 — OFL.txt;
  sourced from humansignal-os market_research assets, name tables verified) via `cfg.extraFonts`. The reference
  storybook gets the same faces injected by `node .design-sync/build/inject-reference-fonts.mjs` — RE-RUN IT after
  every `storybook build` into .design-sync/sb-reference, or mono text compares Plex (preview) vs fallback (sb).
  JetBrains Mono is only a fallback behind Plex; it is never reached. Verified by CDP font probe: AiChatLoading
  timer, DataTable mono cells, MultiTreeSelect `<code>`, MediaCard metadata render IBM Plex Mono on both sides.
- JsonViewer's JSON tree is SYSTEM `monospace` on both sides (and in the app): json-edit-react's defaultTheme sets an
  inline `font-family: monospace` on `.jer-editor-container`, beating json-viewer.module.css's var(--font-family-mono).
  Only the FF_FIT_2007 virtualized path (`.rjv-container`, flag off in every story) uses Plex. A libs/ui fix, not sync.
- Tall stories are clipped at the capture viewport on both sides; judge the visible part.
- Low-contrast components (Skeleton bars ≈ #F2F1EE) fall under pairs.py's luma<240 bbox threshold. Storybook raw
  captures put content at (0,0), so use the DOMINANT color (not the corner pixel) as background for bbox/diff triage.
- Centered-layout stories: storybook raw shots are element-cropped to the shrink-wrapped root, the preview is centered
  in its 900px frame — compare content crops, not positions. Full-width layouts (Stepper horizontal, DataTable right
  columns, square media tiles) shrink by the 16px-narrower frame — framing.
- Sparkles: captures force prefers-reduced-motion, so no sparkles spawn on either side and Default/Custom Color both
  show the bare icon — validate's `[RENDER_THIN] variants render identically` is faithful. Known warn.

## Known validate warnings (triaged — not new)

- `[TOKENS_MISSING]` ~22: component-scoped vars set at runtime / with fallbacks (`--checkbox-*`, `--radix-*`,
  `--rjv-*`, `--scrollbar-*`, `--tooltip-arrow-*`) plus a few source references no token defines
  (`--color-accent-persimmon-border`, `--color-neutral-surface-content`, `--color-neutral-inverted-emphasis(-subtle)`,
  `--spacing-tigth` typo, …) — identical in storybook and the app.
- `[FONT_MISSING] "JetBrains Mono"`: only a fallback behind IBM Plex Mono in react-json-virtualization's stack; never
  reached now that Plex ships.
- `[RENDER_THIN] Sparkles`: see grading gotchas.

## Results (first sync, 2026-10-03)

All 40 storied components graded `match` against the reference storybook on the final build (every story captured,
`--max-stories 30`). One story skipped: Pagination `Single Page` (renders null by design). No owned previews.

## Re-sync risks (watch-list for the next run)

- `.design-sync/build/` is a design-sync-only build of libs/ui: if the repo changes `libs/storybook/.storybook/main.ts`
  `viteFinal` (aliases, postcss chain, css-module naming) the dist follows automatically; if libs/ui's barrel gains a
  new `export *` that collides (cf. Phosphor `Tabs`), names silently vanish from the global — `[BUNDLE_EXPORT]` /
  cell errors catch it.
- `build-dts.mjs` PATCHES (DropdownTriggerProps) fail the build loudly when stale — remove the patch once libs/ui
  exports that interface itself.
- `phosphor-extras.txt` + the scanned Phosphor subset: a new Phosphor icon used ONLY in a new story would be
  picked up by the scan; an icon referenced via a non-`import {…}` form (dynamic/re-export) would be missed.
- Bundle size: 4.3 MB now; a single file must stay well under ~9 MB or the upload resets (ECONNRESET at 9.1 MB).
- `.design-sync/sb-reference` must be rebuilt when stories/DS change, and after every rebuild re-run
  `node .design-sync/build/inject-reference-fonts.mjs` (Plex + host vars) — otherwise mono text compares unequal.
- The fork `.design-sync/overrides/preview-gen-storybook.mjs` copies the skill's template at skill version 2.1.288; a
  skill update to that template won't reach this repo until the fork is re-based (diff the staged lib against it).
- `host-vars.css` maps the app's `--font-mono` to Plex (user decision); the app itself uses `monaco, monospace`.
- Accepted framing (not re-graded on future syncs unless sources change): storybook height:100% root, 16px-narrower
  preview frame (and the 852–868px centered band), Toast fixed-viewport position, interaction-gated overlays show
  closed triggers only (cards for ModalWindow/Drawer/Dropdown/Popover/Tooltip/ContextMenu show the trigger).
- `tokensPkg` is a node_modules-relative path (`../dist/design-sync/ui-tokens`) — README prints that string as the
  token source.
