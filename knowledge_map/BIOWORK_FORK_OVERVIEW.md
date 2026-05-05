# Biowork Fork — Knowledge Map

This document is the entry point for understanding what Biowork has changed
on top of upstream Label Studio. Every section links to the file paths where
the change lives so you can navigate from a feature directly to its source.

The companion repo for the ML side is **biowork-ml-backend**, which forks
`label-studio-ml-backend` and ships customised SAM, SAM2, and FastSAM
predictors that emit the per-region `meta` (area / bbox / RGB) consumed by
this app.

---

## Topology

```
┌──────────────────────────── Biowork (this repo) ───────────────────────────┐
│                                                                            │
│  Frontend (web/)                                                           │
│   - apps/labelstudio  ............... main Django-served React app         │
│   - libs/editor       ............... Label Studio Frontend (LSF)          │
│   - libs/datamanager  ............... Data Manager grid                    │
│                                                                            │
│  Backend (label_studio/)                                                   │
│   - billing/          ............... dj-stripe + plan/quota enforcement   │
│   - turnstile/        ............... Cloudflare Turnstile guard           │
│   - users/            ............... + Hugging Face token, signup guards  │
│   - data_import/      ............... + HF import, batch tags, quotas      │
│   - data_export/      ............... + SEG_CSV (Biowork CSV/XLSX)         │
│   - data_manager/     ............... + filename / import_tags columns    │
│   - tasks/            ............... + import_tags/batch_id/source       │
│   - projects/         ............... + biowork default label_config      │
│                                         + auto-attach default ML backend   │
│   - annotation_templates/biowork/  .. + FastSAM / SAM2 templates           │
│   - core/settings/    ............... + Stripe, Turnstile, ML defaults    │
│   - core/urls.py      ............... mounts billing + djstripe + webhook │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │  HTTP (predictions, image download)
                                  ▼
┌──────────────────────── biowork-ml-backend (sibling repo) ─────────────────┐
│  label_studio_ml/examples/                                                 │
│   - segment_anything_model/    .. SAM (smart point/box → brush+polygon)    │
│   - segment_anything_2_image/  .. SAM2 (interactive)                       │
│   - FastSAM/                   .. full-auto detection                      │
│  All three predictors:                                                     │
│   - Compute mask area / bbox / mean R,G,B and write into result.meta       │
│   - Use org_api_middleware to resolve dynamic per-org credentials          │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Annotation templates & default labeling interface

Deep dive: `knowledge_map/features/biowork_template_entrypoint.md`

**Biowork adds two project templates in a "Biowork" group:**

| File | Title | Order | ML backend (template-attached) |
|------|-------|-------|------------|
| `label_studio/annotation_templates/biowork/fastsam-interactive-segmentation/config.yml` | "Full Auto Detection" | 2 | `http://fastsam-backend:9090` |
| `label_studio/annotation_templates/biowork/sam2-interactive-segmentation/config.yml` | "Semi Auto Detection" | 3 | `http://sam2-backend:9090` |

Both templates use the same XML pattern:

- Smart **`KeyPointLabels`** (`tag3`) and smart **`RectangleLabels`** (`tag4`) for ML prompts.
- `BrushLabels` (`tag1`, red) and/or `PolygonLabels` (`tag2`, green) for results.
- Two-column flex layout (image left, controls right).
- `ml_backends:` block declares the auto-attached predictor URL with `is_interactive: true`.

**Project create wizard:**
- `web/apps/labelstudio/src/pages/CreateProject/CreateProject.jsx:146-167`
  fetches `configTemplates`, **filters to** `["Full Auto Detection", "Semi
  Auto Detection"]`, and auto-selects "Full Auto Detection" as the default.
  The Template select dropdown is rendered on the project Name step
  (lines 70-86).
- `CreateProject.jsx:226-250` auto-attaches the `ml_backends` declared in
  the chosen template's `config.yml` once the project is created.

**Default `label_config` for projects created without a template** is
hardcoded in `label_studio/projects/models.py:143-181`. It mirrors the
SAM/SAM2 layout but adds an extra per-region `<TextArea name="mean_intensity">`
capturing "Mean Intensity (gray/R/G/B)". This is the fallback when the
wizard isn't used (e.g. CLI project creation).

**Auto-attach a single default ML backend** (separate from per-template
`ml_backends`): when `ADD_DEFAULT_ML_BACKENDS=true` and
`DEFAULT_ML_BACKEND_URL` is set, every new project gets an `MLBackend`
created in:
- `label_studio/projects/api.py:269-305` (`ProjectListAPI.perform_create`)
- `label_studio/server.py:71-120` (CLI project creation)

The created backend is `is_interactive=True` and the project setting
`reveal_preannotations_interactively=True` is enabled.

---

## 2. Billing — dj-stripe integration

**App:** `label_studio/billing/` (Django app added in `INSTALLED_APPS` at
`label_studio/core/settings/base.py:248-249` alongside `'djstripe'`).

### Models
- `OrganizationCustomer` — 1:1 link `Organization` ↔ dj-stripe `Customer`.
- `StripeWebhookIngest` — idempotent persistence of every Stripe event
  (`stripe_event_id`, `event_type`, `livemode`, payload) with status
  `received`/`queued`/`processed`/`failed`.

### API endpoints (`/api/billing/`)
Defined in `label_studio/billing/urls.py` and `label_studio/billing/api.py`:

| Endpoint | View | Purpose |
|----------|------|---------|
| `GET pricing/` | `PricingTableAPI` | active prices from dj-stripe |
| `GET public-pricing/` | `PublicPricingTableAPI` | unauthenticated pricing |
| `GET stripe-config/` | `StripeConfigAPI` | publishable key + customer id |
| `GET public-stripe-config/` | `PublicStripeConfigAPI` | unauthenticated config |
| `POST checkout/` | `CheckoutSessionAPI` | create Stripe Checkout session |
| `GET subscription/` (alias `status/`) | `SubscriptionStatusAPI` | per-org plan status |
| `GET usage-limits/` | `UsageLimitsAPI` | tier + project/task counts |
| `POST portal/` | `CustomerPortalAPI` | open Stripe Customer Portal |
| `POST webhook/` | `webhook_view` | Stripe webhook receiver |

`label_studio/core/urls.py:30-122` mounts:
- `billing/` → billing page
- `/api/billing/` → API
- `stripe/webhook/` → `billing.stripe_webhook.stripe_webhook` (legacy redirect)
- `include('djstripe.urls')`

### Webhook flow
1. `billing/views.py::webhook_view` verifies the event (signature or retrieve)
   based on `DJSTRIPE_WEBHOOK_VALIDATION`.
2. Persists payload in `StripeWebhookIngest`.
3. Enqueues `billing.jobs.process_stripe_webhook_ingest(ingest_id)` via RQ.
4. Worker calls `djstripe.models.Event.process(...)` with the per-livemode
   secret key, triggering both dj-stripe's handlers and the
   `@djstripe_receiver` hooks in `billing/webhooks.py`
   (`checkout.session.completed`, `customer.subscription.*`,
   `invoice.payment_*`).
5. `_link_customer_to_organization` ensures the `OrganizationCustomer`
   mapping exists, using email or explicit `organization_id` metadata.

### Plan tiers — current state

> **Note:** Two parallel tier definitions exist in the codebase. Treat
> `services/plans.py` as the source of truth for the API; `utils.py` is used
> by validators called from the import/project paths.

`label_studio/billing/services/plans.py`:

| Tier | max_projects | max_tasks |
|------|--------------|-----------|
| free | 1 | 2 |
| standard | 5 | 50 |
| pro | 100 | 50 |

`label_studio/billing/utils.py`:

| Tier (constant) | max_projects | max_tasks |
|-----------------|--------------|-----------|
| `TIER_FREE` | 1 | 1 |
| `TIER_PLUS` | 10 | 50 |
| `TIER_PRO` | unlimited | unlimited |

Stripe price selection (in `services/stripe.py`) accepts price IDs or lookup
keys via `STRIPE_STANDARD_{MONTHLY,YEARLY}_PRICE_{ID,LOOKUP_KEY}`,
`STRIPE_PRO_{MONTHLY,YEARLY}_PRICE_{ID,LOOKUP_KEY}`, plus legacy
`STRIPE_PRO_PRICE_ID` / `STRIPE_PRO_PRICE_LOOKUP_KEY`. There is no
"Enterprise" code path; the marketing page mentions enterprise as a contact
form only.

### Quota enforcement points

`billing/utils.py::validate_project_creation` and `validate_task_import` are
called from:
- `projects/api.py:269` — `ProjectListAPI.perform_create`
- `data_import/api.py:326,556,600,631` — `ImportAPI`, `ReImportAPI`,
  `HuggingFaceImportAPI` paths
- `data_import/uploader.py:43,298,392` — `bulk_create_tasks`
- `data_import/functions.py:15,56,68` — async import background

### dj-stripe model gotchas
- Use `.id` (not `.stripe_id`) to get Stripe object IDs on dj-stripe models
  (`Customer`, `Subscription`, `Price`, `Product`, `CheckoutSession`).
  `.djstripe_id` is the Django integer PK.
- `Subscription.status` is **not** a concrete DB column — it's derived from
  `stripe_data`. Don't filter on it at the ORM level; filter in Python via
  `s.is_status_current()` or `s.is_valid()`.

### Pricing UI / "already Pro" guard
`label_studio/billing/views.py::create_checkout` returns **409 Conflict**
when an org with `subscription.status in ("active","trialing")` tries to
re-purchase Pro. `web/apps/labelstudio/src/pages/Billing/BillingPage.tsx`
hides the `<stripe-pricing-table>` and shows a **Manage / Cancel
Subscription** button (calls `POST /api/billing/portal/` and redirects to
`portal_url`).

### Frontend
- `web/apps/labelstudio/src/pages/Billing/BillingPage.tsx` — billing landing
- `web/apps/labelstudio/src/pages/Billing/PricingTable.jsx` — embedded
  `<stripe-pricing-table>` with pre-bound customer
- `web/apps/labelstudio/src/pages/Billing/SubscriptionStatus.jsx` — current
  plan / usage display
- `web/apps/labelstudio/src/types/stripe-pricing-table.d.ts` — TS shim

### Required environment variables
```env
DJSTRIPE_WEBHOOK_SECRET=whsec_...
DJSTRIPE_WEBHOOK_VALIDATION=verify_signature   # or retrieve_event
STRIPE_LIVE_MODE=false
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICING_TABLE_ID=prctbl_...

# price selection (any of these will resolve)
STRIPE_STANDARD_MONTHLY_PRICE_ID=price_...
STRIPE_STANDARD_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
# or lookup keys
STRIPE_*_PRICE_LOOKUP_KEY=...
# or legacy
STRIPE_PRO_PRICE_ID=price_...

STRIPE_PORTAL_CONFIGURATION_ID=bpc_...
```

`python label_studio/manage.py init_djstripe [--force]` syncs the secret
keys into `djstripe.APIKey` records.

### Webhook testing
- Docker dev (this repo, nginx on 8082):
  `stripe listen --forward-to localhost:8082/stripe/webhook/`
- Direct app on 8080:
  `stripe listen --forward-to localhost:8080/stripe/webhook/`

---

## 3. Cloudflare Turnstile

**App:** `label_studio/turnstile/`.

| File | Purpose |
|------|---------|
| `turnstile/utils.py` | `is_enabled()`, `verify_turnstile(token, ip)` POSTs to `https://challenges.cloudflare.com/turnstile/v0/siteverify` |
| `turnstile/decorators.py` | `@require_turnstile` — on POST, checks `cf-turnstile-response` form field or `X-CF-Turnstile-Response` header |

Mounted at:
- `label_studio/users/views.py:41` — `user_signup`
- `label_studio/users/views.py:110` — `user_login`
- `label_studio/users/api.py:174` — `UserAPI.create`

Settings in `label_studio/core/settings/base.py:691-694`:
`TURNSTILE_ENABLED`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.
Cloudflare's test keys (`1x00000000000000000000AA` / `1x0000…AA`) always
pass and are useful for dev.

CSP for Turnstile is wired in `docker-compose.prod.yml` and Django
middleware so the script `https://challenges.cloudflare.com/...` loads.

---

## 4. Hugging Face dataset import

### Backend
- `label_studio/users/models.py:115-120` — `User.huggingface_token` (text,
  nullable). Migration `users/migrations/0011_user_huggingface_token.py`.
- `label_studio/users/serializers.py:122` — `UserHuggingFaceTokenSerializer`.
- `label_studio/users/api.py:331-353` — `UserHuggingFaceTokenAPI`:
  `GET` returns `{configured: bool}`; `POST` stores token; `DELETE` clears.
- `label_studio/users/urls.py:27` — `api/current-user/huggingface-token`.
- `label_studio/data_import/huggingface.py` — `fetch_huggingface_rows(...)`
  hits `https://datasets-server.huggingface.co/rows` and converts rows to
  Label Studio tasks; `DEFAULT_IMPORT_LIMIT=100`, `MAX_IMPORT_LIMIT=1000`;
  attaches `import_source='huggingface'` and
  `import_tags=['hf:<dataset>', 'hf:<config>:<split>']` to each task.
- `label_studio/data_import/api.py:513-584` — `HuggingFaceImportAPI`
  (extends `ImportAPI`); reads `request.user.huggingface_token`; returns
  HTTP 400 with `huggingface_token_not_configured` when missing.
- `label_studio/data_import/serializers.py:30` — `HuggingFaceImportSerializer`.
- `label_studio/data_import/urls.py:15` — `<int:pk>/import/huggingface`.

No `huggingface_hub` Python dependency — uses raw `requests`.

### Frontend
- `web/apps/labelstudio/src/config/ApiConfig.js:37,91-93` — endpoints:
  `importHuggingFace`, `huggingFaceTokenSettings*`.
- `web/apps/labelstudio/src/pages/CreateProject/Import/Import.jsx:230-235,590-648,755-786,943-961`
  — HF dataset/subset/split/offset/limit form, `onLoadHuggingFace` handler,
  preview card, "Add HF Dataset" button.
- `Import.jsx:626-630` — redirects to settings if backend returns
  `huggingface_token_not_configured`.
- `web/apps/labelstudio/src/pages/CreateProject/Import/useImportPage.js:18-19,108-115,144-162`
  — `huggingFaceImport` state, prepared/cleared callbacks, `importHuggingFace`
  finalize call.
- `web/libs/app-common/src/pages/AccountSettings/sections/HuggingFaceTokenSettings.tsx`
  — full token CRUD section.
- `web/libs/app-common/src/pages/AccountSettings/sections/index.tsx:38-42`
  — registers the "Hugging Face" section in Account Settings.
- `web/apps/labelstudio/src/pages/CreateProject/Import/samples.json` — HF
  sample-dataset rows.

---

## 5. Per-task batch tags & data manager surfacing

**Goal:** annotators can tag groups of tasks at import time and filter the
data manager by tag or batch.

### Schema
`label_studio/tasks/models.py:112-133`:
- `import_tags` — `JSONField(default=list, null=True, blank=True)`
- `import_batch_id` — `CharField(max_length=255, null=True, blank=True)`
- `import_source` — `CharField(max_length=255, null=True, blank=True)`
- Index on `import_batch_id` (`tasks/models.py:199`)

Migrations: `tasks/migrations/0055_task_import_tags.py`,
`0056_rename_task_import_batch_idx_task_import__467338_idx.py`.

### Import propagation
- `data_import/uploader.py:367-393` — `_parse_meta` reads `import_tags`
  from form data, defaults `import_source='ui'`.
- `data_import/api.py:246-288` — `ImportAPI._parse_import_meta_from_request`
  parses **per-file** `file_upload_tags` JSON map plus legacy
  `import_tags` / `import_source`.
- Applied in sync_import (`api.py:328-352`), sync_reimport
  (`api.py:602-626`), and HF import.

### Data Manager columns & filters
`label_studio/data_manager/functions.py`:
- `filename` (Title) — original filename extracted from upload path
  (lines 119-127).
- `import_tags` (List type) — lines 128-136.
- `file_upload`, `storage_filename` — lines 220-237.

`label_studio/data_manager/managers.py`:
- Lines 335-359 — `import_tags` filter operators
  (`CONTAINS`, `NOT_CONTAINS`, `EMPTY`) using JSONField `__contains` and
  null-or-empty checks.
- Lines 361-367 — `filename` filter remaps to `data__image`.
- Lines 619-624 — `annotate_storage_filename` annotates queryset by
  concatenating storage key fields.

`label_studio/data_manager/serializers.py`:
- `extract_original_filename` is imported and used in `get_filename`
  (lines 421-433). Original filename is parsed from the
  `{8-char-hash}-{original}` upload pattern via
  `data_import/models.py:32-62::extract_original_filename`.

### Frontend
- `web/apps/labelstudio/src/pages/CreateProject/Import/Import.jsx:138-205`
  — `FileRow` per-file Import-Tag badges.
- `Import.jsx:228-501` — selection state, drag-select, bulk tag input
  (`bulkTagInput`, `handleBulkTag*`), per-file `fileTags` map keyed by
  file_upload_id.
- `Import.jsx:672-679` — propagates `file_upload_tags` and `import_source`
  via `setReimportExtras`.
- `Import.jsx:870-941` — Sources/Files card with bulk-tag UI + selection.
- `useImportPage.js:18-23,89-140` — `reimportExtras` state, `finishUpload`
  forwards extras into the reimport body; `uploadSample` includes
  `file_upload_tags` and `import_source`.
- `utils.ts:1-40` — `importFiles` helper.

> **Note:** The current Import UI has **no separate "Batch ID" text input**.
> Batch metadata is only `import_tags` (per-file) plus a hardcoded
> `import_source: "ui"`. The `import_batch_id` *backend column* still
> exists and accepts values via direct API calls — it is just not surfaced
> in the React import flow today.

---

## 6. Region metadata: area, bbox, mean R/G/B

End-to-end pipeline that powers Outliner sort/filter, Region Statistics,
and Biowork CSV export.

### ML-backend writes per-result `meta`
In `biowork-ml-backend`:

| File | Notes |
|------|-------|
| `label_studio_ml/examples/segment_anything_model/sam_predictor.py` | SAM (point/box) — RGB + area + bbox |
| `label_studio_ml/examples/segment_anything_2_image/model.py` | SAM2 — `_compute_mask_geometry` writes brush + polygon `meta` |
| `label_studio_ml/examples/FastSAM/model.py` | FastSAM — same `_compute_mask_geometry` pattern |

Resulting region payload:
```json
{
  "meta": {
    "area": 919,
    "bbox": {"x": 302, "y": 690, "width": 244, "height": 188},
    "mean_r": 134.2, "mean_g": 110.8, "mean_b": 96.4
  }
}
```
Grayscale input → `r ≈ g ≈ b`; no separate gray channel is stored.

### Frontend deserialization
- `web/libs/editor/src/stores/Annotation/Annotation.js:1274` — includes
  `meta` in area snapshot.
- `web/libs/editor/src/mixins/AreaMixin.js:206-211` —
  `applyAdditionalDataFromResult` merges `result.meta` into `region.meta`.

### Region Details panel
`web/libs/editor/src/components/SidePanels/DetailsPanel/RegionDetails.tsx`:
shows "Area (px)" and "BBox (px)" when `region.meta.area` / `meta.bbox` is
present.

### Region Statistics tab
`web/libs/editor/src/components/SidePanels/DetailsPanel/DetailsPanel.tsx`:
- `type RegionStats` (L33), `computeRegionStats(regions)` (L98),
  rendered under the "Region Statistics" heading (L328).
- Computes count, mean, population standard deviation, p25 / median / p75
  (linear interpolation) for `area`, `bbox.width`, `bbox.height`,
  `mean_r`, `mean_g`, `mean_b`.
- Operates on selected regions if any, otherwise all non-classification
  regions of the current image.

### Outliner — sort, filter, group
`web/libs/editor/src/components/SidePanels/OutlinerPanel/ViewControls.tsx`
adds, when grouping is **Manual**:
- **Sort** by `area`, `bbox_width`, `bbox_height`, `intensity_r/g/b`
  (existing `date`, `score` retained).
- **Filter** dropdown with min/max bounds for `w`, `h`, `a`, `r`, `g`, `b`
  (AND-combined). On Apply: `RegionStore.filterByMetrics(...)` →
  `setFilteredRegions(...)`, plus auto-select via `selectRegionsByIds(...)`.
- **Group** input — writes a free-text string into `region.meta.group` via
  `setMetaGroup(group)` defined in
  `web/libs/editor/src/mixins/Normalization.ts:38,60`.

`RegionStore.filterByMetrics` lives at
`web/libs/editor/src/stores/RegionStore.js:614`.

Sort fallback: when `meta.mean_r/g/b` is missing, the frontend computes a
luma approximation from the region display color.

---

## 7. Biowork CSV / XLSX export (`SEG_CSV`)

`label_studio/data_export/formats/segmentation_csv_exporter.py` (~645
lines). Wired into `data_export/models.py:159-180` (format appears when the
project has `BrushLabels` or `PolygonLabels`) and dispatched at
`data_export/models.py:197-201` for `output_format == 'SEG_CSV'`.

Computes per-region stats by:
- Resolving `ImageSource` from the task (`_resolve_image_source`).
- Decoding brush RLE (`_decode_brush_rle_to_mask`) or rasterizing polygon
  points (`_polygon_points_percent_to_px`, `_rasterize_polygon`).
- Computing bbox + area (`_compute_bbox_and_area`) and gray + RGB means
  (`_compute_intensities`).
- Preferring `result.meta.mean_r/g/b` if present; otherwise falling back to
  legacy textarea inputs (`_parse_textarea_means`).

Output:
- **Single image, ≥1 region** → `.csv` with per-region columns including
  `mean_r`, `mean_g`, `mean_b`, area, bbox, label, `meta.group`.
- **Multiple images** → `.xlsx` with a **Summary** sheet (cross-image
  statistics) plus one sheet per image.
- **No regions** → zip with README.

Dependencies: `openpyxl ≥ 3.1.0`, `pandas` (already pulled by upstream).

---

## 8. Toolbar & default tool selection

Goal: keep control tools always visible; swap segmentation tools between
regular and smart variants based on the auto-annotation toggle.

- `web/libs/editor/src/components/Toolbar/Toolbar.jsx:34-89` splits tools
  into three buckets: `controlTools` (group `"control"`, always visible),
  regular tools, and smart tools. Control tools render unconditionally;
  regular vs smart swap based on `store.autoAnnotation`.
- `web/libs/editor/src/tools/Base.jsx:42-58` — `shouldRenderView`: regular
  (non-dynamic) tools always render if they have an icon; smart (dynamic)
  tools render only when `smartEnabled`. This was needed so the regular
  KeyPoint/Rectangle versions of `smart="true"` tags still appear when
  auto-annotation is OFF.
- `web/libs/editor/src/tools/Selection.js:27-32` — Move tool marked
  `default: true`, group `"control"` (default selection for image tasks).
- `web/libs/editor/src/tools/Manager.js:151-241` — `selectDefault`,
  `selectSmartDefault(control)`, `findToolsForControl`, `findBaseForControl`,
  `findSmartForControl`, `findSmartCounterpart` (helpers for swapping).
- `web/libs/editor/src/tags/control/Label.jsx:202` — calls
  `manager.selectSmartDefault(self.parent?.name)` on label click when
  auto-annotation is active.

Auto-annotation toggle:
- `web/libs/editor/src/components/AnnotationTab/DynamicPreannotationsToggle.jsx:9-47`
  — on enable, calls `inst.selectSmartDefault()` for managers with active
  selection; on disable, reverts only managers whose currently selected
  tool is `dynamic`.
- Consumed in `web/libs/editor/src/components/TopBar/TopBar.jsx` and
  `web/libs/editor/src/components/BottomBar/Actions.jsx`.

---

## 9. Multi-organization ML backend (token resolution)

**Why:** Biowork's signup model puts each user in their own organization
(or invitation-only joins), so a single static `LABEL_STUDIO_ACCESS_TOKEN`
on the ML backend cannot serve all orgs. The ML backend resolves
credentials dynamically per request.

### Where it lives (in `biowork-ml-backend`)

The middleware exists **only** in the FastSAM and SAM2 examples. The legacy
`segment_anything_model/` example is upstream (no middleware, no `meta`).

| File | Purpose |
|------|---------|
| `label_studio_ml/examples/{FastSAM,segment_anything_2_image}/ls_ml_backend_SAM_middleware.py` | Real `OrganizationAPIMiddlewareV3` impl (~553 lines, identical between the two examples) |
| `label_studio_ml/examples/{FastSAM,segment_anything_2_image}/org_api_middleware_v3.py` | Thin shim (~57 lines) that imports `OrganizationAPIMiddlewareV3` and falls back to a `_Shim` returning env-only creds if import fails |
| `label_studio_ml/examples/{FastSAM,segment_anything_2_image}/MIDDLEWARE_DEBUG_SUMMARY.md` | Runbook for the shim/import behaviour |

> The previous knowledge-map references to `org_api_middleware.py` and
> `org_api_middleware_v2.py` are **stale** — only `_v3` is present in the
> repo. Treat V3 + the shim as the current contract.

### How it works
1. Middleware opens the Label Studio DB read-only.
   - SQLite by default (`LABEL_STUDIO_DB_PATH`, default
     `/label-studio/data/label_studio.sqlite3`).
   - PostgreSQL when `LABEL_STUDIO_DB_TYPE=postgresql` (uses
     `LABEL_STUDIO_DB_HOST/PORT/NAME/USER/PASSWORD`); the helper rewrites
     `?` → `%s` in queries (`ls_ml_backend_SAM_middleware.py:137-189`).
2. For a given task, queries `project` → `organization` → tokens:
   ```sql
   SELECT organization_id FROM project       WHERE id = ?;
   SELECT created_by_id   FROM organization WHERE id = ?;
   SELECT key             FROM authtoken_token WHERE user_id = ?;
   ```
   Then reads `jwt_auth_jwtsettings.api_tokens_enabled` /
   `legacy_api_tokens_enabled` to decide which token type to use.
3. Token-type strategy:
   - Legacy first (`authtoken_token.key`).
   - JWT refresh tokens via `token_blacklist_outstandingtoken` minus
     blacklisted, then `POST {host}/api/token/refresh/` to mint a 5-min
     access token (cached in `_jwt_access_token_cache`).
4. `@lru_cache(maxsize=128)` on the project→org and org→token lookups.
5. `clear_cache()` resets all caches.
6. Falls back to env-only static `LABEL_STUDIO_ACCESS_TOKEN` when
   middleware import fails or no record matches.

### Predictor wiring
- FastSAM: `sam_predictor.py:18-47` toggles middleware via
  `USE_ORG_MIDDLEWARE`; lazy-imports `org_api_middleware_v3.get_middleware`.
  `_wsgi.py:20-29` initializes at gunicorn start with a status print.
- SAM2: `model.py:399,466,593` imports the middleware lazily inline (no
  top-level `USE_ORG_MIDDLEWARE` check — middleware is always tried).

### ML-backend env vars
```bash
USE_ORG_MIDDLEWARE=true
LABEL_STUDIO_DB_PATH=/label-studio-data/label_studio.sqlite3
LABEL_STUDIO_HOST=http://host.docker.internal:8080
# fallback only:
LABEL_STUDIO_ACCESS_TOKEN=...
```

### Docker
Mount the Label Studio data dir read-only into the ML backend container:
```yaml
volumes:
  - "/host/path/to/label-studio/data:/label-studio-data:ro"
```

---

## 10. Branding, landing, signup, Heidi tips

- **Logo / rebrand** — `web/apps/labelstudio/src/assets/images/logo.svg`
  is the only rebrand asset (`aria-label="Biowork"`). The component name
  (`LSLogo`) and alt text still say "Label Studio Logo" — the React layer
  was not rewritten. The logo renders only in
  `web/apps/labelstudio/src/components/Menubar/Menubar.jsx:15,140`.
- **Landing / marketing pages (Django-served)** —
  `label_studio/templates/landing.html`, `features.html`, `pricing.html`.
  No equivalent React landing page exists; `HomePage.tsx` is the in-app
  dashboard, not a public landing page.
- **Auth pages** are Django templates under
  `label_studio/users/templates/users/new-ui/user_*.html`. Turnstile is
  embedded server-side here (no React Turnstile widget exists in the
  workspace).
- **Heidi tips kill switch** — feature flag
  `fflag_feat_front_hide_heidi_tips_short` (constant `FF_HIDE_HEIDI_TIPS`
  in `web/libs/core/src/lib/utils/feature-flags/flags.ts:102-104`). When
  set:
  - React `web/apps/labelstudio/src/components/HeidiTips/HeidiTips.tsx`
    returns `null` at the top.
  - Backend `label_studio/core/views.py::heidi_tips` returns 404.
  - `label_studio/users/templates/users/new-ui/user_base.html` skips
    embedding tips.
  Set via env (any prefix accepted by `core.feature_flags.flag_set()`):
  `fflag_feat_front_hide_heidi_tips_short=true`.

---

## 11. Settings & environment surface

`label_studio/core/settings/base.py`:

| Range | Adds |
|-------|------|
| 248-249 | `INSTALLED_APPS += ['djstripe', 'billing']` |
| 691-694 | `TURNSTILE_*` |
| 885-893 | Stripe credentials and `STRIPE_PRICING_TABLE_ID` |
| 895-900 | `DJSTRIPE_*` (native JSONField, FK to id, webhook secret + validation) |

`label_studio/core/settings/label_studio.py`:

| Range | Adds |
|-------|------|
| 20-22 | `ADD_DEFAULT_ML_BACKENDS`, `DEFAULT_ML_BACKEND_URL`, `DEFAULT_ML_BACKEND_TITLE` |
| 39-54 | `RQ_ENABLED` toggled by `REDIS_HOST`; full RQ_QUEUES (`critical/high/default/low`) — Biowork enables RQ where upstream community disabled it |

`label_studio/core/urls.py:30-122` — mounts `billing.views.billing_page`,
`include('billing.urls')` at `/` and `/api/billing/`,
`stripe/webhook/` and `include('djstripe.urls')`.

### Env-variable resolution (unchanged from upstream)
`get_env(name)` looks up `LABEL_STUDIO_<NAME>` → `HEARTEX_<NAME>` →
`<NAME>`. So `LABEL_STUDIO_BASE_DATA_DIR` overrides `BASE_DATA_DIR`.

### Default ML backend env vars
```env
ADD_DEFAULT_ML_BACKENDS=true
DEFAULT_ML_BACKEND_URL=http://sam-ml-backend:9090   # service name in docker
DEFAULT_ML_BACKEND_TITLE=SAM Interactive Segmentation
BASE_DATA_DIR=/label-studio/data                    # container path
```

---

## 12. Docker & build matrix

| File | Purpose |
|------|---------|
| `Dockerfile` | primary multi-stage image |
| `Dockerfile.development` | dev image with `INCLUDE_DEV=true`, Node 18 + Python 3.12 |
| `Dockerfile.cloudrun` | Google Cloud Run; sets `LABEL_STUDIO_ONE_CLICK_DEPLOY=1`, `STORAGE_PERSISTENCE=0` |
| `Dockerfile.heroku` | Heroku one-click deploy |
| `Dockerfile.hgface` | Hugging Face Spaces; `STORAGE_PERSISTENCE=0`, samesite=None cookies, `--host=$SPACE_HOST` |
| `Dockerfile.testing` | test image used by `make build-testing-image` |
| `docker-compose.yml` | `biowork-dev` stack (nginx-dev + app-dev + rqworker-dev + redis-dev + db-dev), image `gavinlouuu/label-studio-custom:dev`, ports 8082/8083, env from `.env` |
| `docker-compose.mib.yml` / `.mib.prod.yml` | "MIB" deployment stack with cloudflared tunnel; env in `deploy/apps/mib/.env.dev`; ports bound to 127.0.0.1:8080/8081 |
| `docker-compose.minio.yml` | MinIO storage variant |
| `docker-compose.mysql.yml` | MySQL DB variant |
| `docker-compose.prod.yml` | main production compose |
| `docker-compose.override.example.yml` | example local override |

### Versioned builds
- `make build-versioned` → `gavinlouuu/label-studio-custom:<version>` and
  `:latest`, where `<version>` is parsed from `pyproject.toml`.
- `make build-tagged TAG=v1.21.0-beta` for custom tags.
- `IMAGE_TAG=...` and `IMAGE_NAME=...` env vars override.
- `make build-and-start-versioned` builds then `docker-compose up`.

### Node 18 pin
`web/package.json` pins `copy-files-from-to@3.12.1` and Yarn `resolutions`
force `yargs@17.7.2`/`yargs-parser@21.1.1` so the `postinstall` hook works
on Node 18 inside the frontend-builder stage.

---

## 13. biowork-ml-backend (sibling repo) — components

Repo root: `/home/user/biowork-ml-backend/`.

Of the 22 example directories under `label_studio_ml/examples/`, **only
two** are biowork-modified. The legacy `segment_anything_model/` is
unmodified upstream (no middleware, no `meta`).

### `segment_anything_2_image/` (biowork-modified)
Files: `model.py` (with `_compute_mask_geometry`, RGB intensity helpers,
`SAM_PREANNOTATE` env flag for full-auto AMG mode, AMG tunables
`SAM_AMG_*`, IoU-based NMS post-AMG), `org_api_middleware_v3.py` (shim),
`ls_ml_backend_SAM_middleware.py` (real V3 middleware ~553 lines),
`MIDDLEWARE_DEBUG_SUMMARY.md`, `Dockerfile`, `docker-compose.yml`,
`docker-compose.prod.yml`, `start.sh`.
- Image: `gavinlouuu/sam2-backend:v0`.
- `SAM2_CHOICE` env (default `large`).
- Used by the SAM2 ("Semi Auto Detection") template.

### `FastSAM/` (biowork-modified)
Files: `model.py` (full-auto everything-mode + interactive prompts +
`_compute_mask_geometry` + RGB intensity helpers + `extract_largest_contour_polygon`),
`sam_predictor.py` (wraps `ultralytics.FastSAM`), `fastsam_prompt.py`
(vendored prompt impl), `org_api_middleware_v3.py` (shim),
`ls_ml_backend_SAM_middleware.py` (identical V3 middleware as SAM2),
`MIDDLEWARE_DEBUG_SUMMARY.md`, `Dockerfile`, `docker-compose.yml`,
`docker-compose.prod.yml`, `start.sh`.
- Image: `gavinlouuu/fastsam-backend:latest`.
- Env knobs: `RESPONSE_TYPE` (brush/polygon/both),
  `POLYGON_DETAIL_LEVEL`, `MAX_RESULTS`, `USE_ORG_MIDDLEWARE`.
- Used by the FastSAM ("Full Auto Detection") template.

### `segment_anything_model/` (NOT biowork-modified — upstream)
Static-token SAM (1.0). Useful as a reference but doesn't emit `meta` and
doesn't use the org middleware. Don't depend on this for new biowork
features; use `segment_anything_2_image/` or `FastSAM/`.

### Cross-cutting notes
- Intensity/geometry helpers and the V3 middleware files are **duplicated
  verbatim** between FastSAM and SAM2 — there is no shared utility module.
- No tests exist for the middleware, multi-org token resolution, RGB
  intensity computation, or `meta` schema. Rely on the runtime
  `MIDDLEWARE_DEBUG_SUMMARY.md` runbook + manual checks.
- Both biowork backends mount Label Studio data read-only at
  `LABEL_STUDIO_DB_PATH` for dynamic credentials and expose port 9090 on
  their docker network so the app reaches them via service names
  (`sam2-backend`, `fastsam-backend`).

---

## 14. Where to look first

| If you want to… | Start here |
|-----------------|-----------|
| Add a new project template | `label_studio/annotation_templates/biowork/` |
| Change the default labeling interface | `label_studio/projects/models.py:143-181` |
| Add a billing tier / change limits | `billing/services/plans.py` + `billing/utils.py` (and Stripe Dashboard) |
| Wire a new Stripe webhook event | `billing/webhooks.py` (`@djstripe_receiver`) |
| Enforce a new quota | `billing.utils.validate_*` and call sites in `data_import/` and `projects/api.py` |
| Add a Data Manager column | `data_manager/functions.py` + `data_manager/serializers.py` + `data_manager/managers.py` (filter) |
| Change how the Outliner sorts/filters regions | `web/libs/editor/src/components/SidePanels/OutlinerPanel/ViewControls.tsx` and `stores/RegionStore.js` |
| Change region statistics | `DetailsPanel.tsx::computeRegionStats` |
| Change exporter columns | `label_studio/data_export/formats/segmentation_csv_exporter.py` |
| Add an HF integration field | `users/models.py` + `users/api.py` + `data_import/huggingface.py` |
| Toggle Turnstile | `TURNSTILE_ENABLED` env + `users/views.py` / `users/api.py` decorators |
| Change ML backend auth | `biowork-ml-backend/.../org_api_middleware_v3.py` |
