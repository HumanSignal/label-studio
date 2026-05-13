# Biowork Knowledge Map

Start here when you want to understand what Biowork has changed on top of
upstream Label Studio.

## Files

- **`BIOWORK_FORK_OVERVIEW.md`** — the knowledge map. Top-down inventory
  of every component and customization, with file paths + line numbers.
  Read this first.
- **`ENV_TEMPLATE_REFERENCE.md`** — full `.env` reference for the Django
  app (development, Docker, production examples).

### `features/` — deeper dives
- `biowork_product_workflow.md` — cross-repo workflow for `biowork`,
  `biowork-ml-backend`, `rustfs_yolo_sam2_inference`, GitHub Project,
  RustFS, MLflow, and verification habits.
- `biowork_template_entrypoint.md` — how Biowork templates act as
  project bootstrap orchestration (default behavior, ML auto-connect,
  and setup args flow).
- `billing_djstripe.md` — Stripe billing API surface, webhook flow, tier
  detail, dj-stripe gotchas.
- `billing_prevent_duplicate_pro_checkout.md` — UI + API guard against
  re-purchasing Pro.
- `region_statistics_tab.md` — Region Statistics tab math.
- `regions_filter_and_group.md` — Outliner filter/group/sort additions.
- `rgb_mean_intensity.md` — `meta.mean_r/g/b` schema + sort behavior.
- `toolbar_auto_annotation_toggle.md` — toolbar swap mechanics.
- `ai_review_fast_mode.md` — fast static brush rendering for dense AI annotations.
- `ml_backend_topology.md` — dev/prod Docker topology for SAM2,
  FastSAM, and YOLO backend servers.

### `task/` — implementation notes / task records
- `TAG_SYSTEM_IMPLEMENTATION_COMPLETE.md` — `import_tags`/`import_batch_id`/
  `import_source` rollout history (with current-state caveats).
- `DISABLE_HEIDI_TIPS_FLAG.md` — feature flag to silence Heidi tips.
- `docker-build-node18.md` — Node 18 dependency pinning fix.

## Companion repositories

The ML side lives in `biowork-ml-backend` and batch inference lives in
`rustfs_yolo_sam2_inference` as sibling clones. See
`features/biowork_product_workflow.md`, plus §9 and §13 of
`BIOWORK_FORK_OVERVIEW.md`, for the structure.
