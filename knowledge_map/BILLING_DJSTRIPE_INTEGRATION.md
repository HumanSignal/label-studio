## Billing & dj-stripe Integration

This document summarizes how billing is implemented using `dj-stripe` and how it connects to organizations and the frontend.

### Core dj-stripe models in use

- **Customer (`djstripe.models.Customer`)**
  - Stripe customer ID is stored in the `id` field (e.g. `cus_123`).
  - Django primary key is `djstripe_id` (integer auto field).
  - Linked to an organization via `billing.models.OrganizationCustomer.customer`.

- **Subscription (`djstripe.models.Subscription`)**
  - Stripe subscription ID is stored in `id` (e.g. `sub_123`).
  - Status and period data live in `stripe_data`, exposed via properties:
    - `status`, `current_period_start`, `current_period_end`,
    - `cancel_at_period_end`, `canceled_at`, etc.
  - Convenience methods:
    - `is_status_current()` – `True` for `trialing`/`active`.
    - `is_valid()` – status current and period current.

- **SubscriptionItem (`djstripe.models.SubscriptionItem`)**
  - Links a `Subscription` to a `Price`.
  - Reverse relation from `Subscription` is `subscription.items`.

- **Price (`djstripe.models.Price`) and Product (`djstripe.models.Product`)**
  - Stripe IDs in `id` (e.g. `price_123`, `prod_123`).
  - Exposed in billing API for plan metadata:
    - `Price.unit_amount`, `Price.currency`, `Price.recurring`.
    - `Product.name`, `Product.description`.

### Organization ↔ Stripe customer mapping

- **Model**: `billing.models.OrganizationCustomer`
  - `organization`: One-to-one with `organizations.Organization`.
  - `customer`: FK to `djstripe.Customer`.
  - Acts as the single source of truth linking an org to a Stripe customer.

- **Creation and linking**
  - Checkout flow (`CheckoutSessionAPI._get_or_create_customer`):
    - If an `OrganizationCustomer` exists, reuse the linked `Customer`.
    - Otherwise:
      - Create a Stripe customer via `stripe.Customer.create`.
      - Sync into dj-stripe: `djstripe.models.Customer.sync_from_stripe_data`.
      - Create `OrganizationCustomer(organization=org, customer=customer)`.
  - Webhooks (`billing/webhooks.py`):
    - `checkout.session.completed`, `customer.subscription.*`, and `invoice.payment_*`
      events are processed via `djstripe_receiver` handlers.
    - Handlers use `Customer.objects.get(id=<stripe customer id>)` and
      `_link_customer_to_organization` to ensure the mapping exists, using either
      email or explicit `organization_id` metadata.

### Webhook ingestion flow

- **Entry point**: `billing.views.webhook_view`
  - Verifies the Stripe event using either:
    - Signature verification (`stripe.Webhook.construct_event`) when
      `DJSTRIPE_WEBHOOK_VALIDATION="verify_signature"`, or
    - Event retrieval (`stripe.Event.retrieve`) when
      `DJSTRIPE_WEBHOOK_VALIDATION="retrieve_event"`.
  - Persists every event into `StripeWebhookIngest` with:
    - `stripe_event_id`, `event_type`, `livemode`, and full JSON payload.
  - Uses Redis/RQ via `process_stripe_webhook_ingest` in `billing.jobs` for async
    processing and returns a fast 2xx to Stripe.

- **Background job**: `billing.jobs.process_stripe_webhook_ingest`
  - Selects the correct API key based on `ingest.livemode`:
    - Live: `STRIPE_LIVE_SECRET_KEY`.
    - Test: `STRIPE_TEST_SECRET_KEY`.
  - Calls `djstripe.models.Event.process(ingest.payload, api_key=api_key)`:
    - Creates/updates dj-stripe `Event` plus downstream models (`Customer`,
      `Subscription`, `Invoice`, etc.).
    - Triggers dj-stripe’s event handlers and our custom `djstripe_receiver`
      hooks in `billing/webhooks.py`.
  - Marks `StripeWebhookIngest.status` as:
    - `processed` on success.
    - `failed` on exception, with `last_error` populated.

### Billing APIs using dj-stripe

- **PricingTableAPI (`GET /api/billing/pricing/`)**
  - Reads active prices from dj-stripe:
    - `djstripe.models.Price.objects.filter(active=True).select_related("product")`.
  - Exposes Stripe IDs directly:
    - `id` → `Price.id` (Stripe price ID).
    - `product_id` → `Product.id` (Stripe product ID).

- **StripeConfigAPI (`GET /api/billing/stripe-config/`)**
  - Chooses publishable key based on `STRIPE_LIVE_MODE`.
  - For the authenticated user:
    - Uses `request.user.active_organization` to find the org.
    - If `OrganizationCustomer` exists, returns:
      - `customer_email`: `request.user.email`.
      - `customer_id`: `org_customer.customer.id` (Stripe customer ID).
    - Else, returns `customer_id=None`.
  - Frontend uses `customer_id` to pre-associate the Stripe Pricing Table with
    the existing Stripe customer:
    - `<stripe-pricing-table customer-id={stripeConfig.customer_id} />`.

- **CheckoutSessionAPI (`POST /api/billing/checkout/`)**
  - Uses `_get_or_create_customer` to obtain a dj-stripe `Customer`.
  - Resolves the requested price:
    - Tries `Price.objects.get(id=price_id)` (Stripe price ID).
    - Falls back to `Price.objects.get(pk=price_id)` (local `djstripe_id`), then
      uses `price.id` when talking to Stripe.
  - Calls `stripe.checkout.Session.create` with:
    - `customer=customer.id`.
    - `price=<Stripe price ID>` from `Price.id`.
  - Syncs the Checkout Session back into dj-stripe via:
    - `djstripe.models.CheckoutSession.sync_from_stripe_data`.

- **SubscriptionStatusAPI (`GET /api/billing/subscription/`)**
  - Uses `OrganizationCustomer` to find the org’s `Customer`.
  - Fetches all subscriptions for that customer:
    - `Subscription.objects.filter(customer=customer).order_by("-created")`.
  - Evaluates status in Python (since `status` is in `stripe_data`):
    - Prefers `subscription.is_status_current()` (trialing/active).
    - Falls back to the most recent subscription if none are current.
  - Derives plan metadata via `SubscriptionItem` and `Price`:
    - `subscription.items.first().price` → `price.product.name`, `price.unit_amount`,
      `price.currency`, `price.recurring.interval`.
  - Responds with:
    - `status`, period dates, cancel flags, plan name/amount/currency/interval,
      and `has_subscription` boolean.

### Common pitfalls and troubleshooting

- **FieldError: `Cannot resolve keyword 'status' into field`**
  - Cause: `Subscription.status` is *not* a concrete DB field in this dj-stripe
    version; it is derived from `stripe_data`.
  - Symptom: Queries such as
    `Subscription.objects.filter(status="active")` raise `FieldError`.
  - Fix:
    - Never filter on `status` at the ORM level for `Subscription`.
    - Fetch subscriptions and filter in Python using:
      - `s.status`, `s.is_status_current()`, or `s.is_valid()`.

- **`Customer` / `Price` / `Product` missing `stripe_id` attribute**
  - Cause: dj-stripe stores Stripe IDs in `id`, not `stripe_id`.
  - Symptom: AttributeError: `'Customer' object has no attribute 'stripe_id'`.
  - Fix:
    - Use `.id` whenever you need the Stripe ID for dj-stripe models
      (`Customer`, `Subscription`, `Price`, `Product`, `CheckoutSession`, etc.).
    - Keep in mind:
      - `id` → Stripe object ID (`cus_`, `sub_`, `price_`, `prod_`, `cs_`, ...).
      - `djstripe_id` → Django primary key (integer).

- **Webhook events not creating subscriptions/customers**
  - Verify:
    - `DJSTRIPE_WEBHOOK_SECRET` is set when using signature validation.
    - `STRIPE_TEST_SECRET_KEY` / `STRIPE_LIVE_SECRET_KEY` are set.
    - Redis is available (webhook view returns 503 if Redis is down).
  - Check:
    - `StripeWebhookIngest` rows for `status`, `attempts`, and `last_error`.
    - `djstripe.Event` rows corresponding to the Stripe event IDs.
    - Logs from:
      - `billing.jobs.process_stripe_webhook_ingest`.
      - `billing.webhooks` handlers.

### Operational notes

- **Migrations**
  - Ensure dj-stripe migrations are applied in the container:
    - `docker exec label-studio-app-dev python3 /label-studio/label_studio/manage.py migrate djstripe`.

- **Debugging a specific Stripe event**
  - Locate the `StripeWebhookIngest` row by `stripe_event_id`.
  - Re-run processing in an RQ shell or manually:
    - `process_stripe_webhook_ingest(ingest_id=<id>)`.
  - Inspect resulting `djstripe.Event` and linked `Customer`/`Subscription`.


