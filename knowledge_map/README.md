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

### `task/` — implementation notes / task records
- `TAG_SYSTEM_IMPLEMENTATION_COMPLETE.md` — `import_tags`/`import_batch_id`/
  `import_source` rollout history (with current-state caveats).
- `DISABLE_HEIDI_TIPS_FLAG.md` — feature flag to silence Heidi tips.
- `docker-build-node18.md` — Node 18 dependency pinning fix.

## Companion repository

The ML side lives in `biowork-ml-backend` (sibling clone). See
§9 and §13 of `BIOWORK_FORK_OVERVIEW.md` for the structure.
