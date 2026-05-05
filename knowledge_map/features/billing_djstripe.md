# dj-stripe Billing Integration (deep dive)

Companion to `BIOWORK_FORK_OVERVIEW.md` §2 — kept for the deeper API
reference. Look there first for the high-level picture.

## Tier reality

The codebase has **two parallel tier definitions**. They disagree on the
exact numbers; treat `services/plans.py` as the source the
`/api/billing/*` endpoints actually use, and `utils.py` as what the import
/ project validators consult.

`label_studio/billing/services/plans.py:9-34`:

| PlanTier | max_projects | max_tasks |
|----------|--------------|-----------|
| `free` | 1 | 2 |
| `standard` | 5 | 50 |
| `pro` | 100 | 50 |

`label_studio/billing/utils.py:13-32`:

| Constant | max_projects | max_tasks |
|----------|--------------|-----------|
| `TIER_FREE` | 1 | 1 |
| `TIER_PLUS` | 10 | 50 |
| `TIER_PRO` | unlimited | unlimited |

Plus, `Stripe Product.metadata.max_projects` / `max_tasks` / `tier` can
override the `utils.py` defaults (`get_usage_limits()` in `utils.py`).

There is **no Enterprise** tier in code; the marketing pricing page lists
"Please contact" and points to a contact form only.

## API endpoints

| Endpoint | View | Purpose |
|----------|------|---------|
| `GET /api/billing/pricing/` | `PricingTableAPI` | active prices from dj-stripe |
| `GET /api/billing/public-pricing/` | `PublicPricingTableAPI` | unauthenticated pricing |
| `GET /api/billing/stripe-config/` | `StripeConfigAPI` | publishable key + customer id |
| `GET /api/billing/public-stripe-config/` | `PublicStripeConfigAPI` | unauthenticated config |
| `POST /api/billing/checkout/` | `CheckoutSessionAPI` | create Stripe Checkout session |
| `GET /api/billing/subscription/` (alias `status/`) | `SubscriptionStatusAPI` | per-org plan status |
| `GET /api/billing/usage-limits/` | `UsageLimitsAPI` | tier + project/task counts |
| `POST /api/billing/portal/` | `CustomerPortalAPI` | open Stripe Customer Portal |
| `POST /api/billing/webhook/` | `webhook_view` | Stripe webhook receiver |

`SubscriptionStatusAPI` returns:

```json
{
  "plan": "free|standard|pro",
  "subscription": {
    "plan": "free|standard|pro",
    "interval": "monthly|yearly",
    "subscription_id": "sub_...",
    "status": "active|trialing|...",
    "current_period_end": "..."
  },
  "limits": { "max_projects": 5, "max_tasks": 50 },
  "usage":  { "projects_count": 1, "tasks_count": 15 }
}
```

`UsageLimitsAPI` (`/api/billing/usage-limits/?project_id=...`) returns
`{tier, current_projects, max_projects, current_tasks, max_tasks,
project_task_count, can_create_project, can_import_tasks}`.

## Quota enforcement points

`billing.utils.validate_project_creation` and `validate_task_import` are
called from:
- `projects/api.py:269` (`ProjectListAPI.perform_create`)
- `data_import/api.py:326,556,600,631` (sync_import, sync_reimport, HF)
- `data_import/uploader.py:43,298,392`
- `data_import/functions.py:15,56,68` (async path)

## Webhook flow

1. `billing/views.py::webhook_view` verifies signature (or retrieves
   event) per `DJSTRIPE_WEBHOOK_VALIDATION`.
2. Persists payload in `StripeWebhookIngest` (idempotent).
3. Enqueues `billing.jobs.process_stripe_webhook_ingest(ingest_id)` via RQ.
4. Worker calls `djstripe.models.Event.process(...)` with the per-livemode
   secret key, triggering `@djstripe_receiver` handlers in
   `billing/webhooks.py` (`checkout.session.completed`,
   `customer.subscription.*`, `invoice.payment_*`).
5. `_link_customer_to_organization` ensures the `OrganizationCustomer`
   mapping using email or `organization_id` metadata.

## dj-stripe model gotchas

- Use `.id` (not `.stripe_id`) for Stripe IDs on dj-stripe models
  (`Customer`, `Subscription`, `Price`, `Product`, `CheckoutSession`).
  `.djstripe_id` is the Django integer PK.
- `Subscription.status` is **not** a concrete DB column — it's derived
  from `stripe_data`. Filter in Python (`s.is_status_current()` or
  `s.is_valid()`), not at the ORM level.

## Webhook testing

- Docker dev (this repo, nginx on 8082):
  `stripe listen --forward-to localhost:8082/stripe/webhook/`
- Direct app on 8080:
  `stripe listen --forward-to localhost:8080/stripe/webhook/`

## Operational notes

- Apply dj-stripe migrations:
  `docker exec <app> python3 /label-studio/label_studio/manage.py migrate djstripe`
- `python label_studio/manage.py init_djstripe [--force]` syncs secret
  keys into `djstripe.APIKey` records.
- Debug a specific Stripe event by `StripeWebhookIngest` row + manually
  re-running `process_stripe_webhook_ingest(ingest_id=<id>)`.
