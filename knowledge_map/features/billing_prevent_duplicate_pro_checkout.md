# Prevent duplicate Pro purchases (and enable cancel)

## Problem
If an organization is **already subscribed to Pro**, we must **prevent paying again** and instead direct members to **manage/cancel** the subscription.

## What counts as “already subscribed”
On the backend, an organization is considered **paid** when it has a Stripe subscription with status:

- `active`
- `trialing`

This is determined in:
- `label_studio/billing/services/stripe.py:get_org_subscription_status()`

`GET /api/billing/status/` returns:
- `plan`: `free|standard|pro`
- `subscription.status`: `active|trialing|...`

## UI behavior
Billing page:
- If `billingStatus.plan === "pro"`:
  - Hide the Stripe `<stripe-pricing-table>` (prevents duplicate self-serve checkout)
  - Show **Manage / Cancel Subscription** button
    - Calls `POST /api/billing/portal/` and redirects to `portal_url`
- “Restore Purchase” remains available to sync state from Stripe.

Implemented in:
- `web/apps/labelstudio/src/pages/Billing/BillingPage.tsx`

## API guard (server-side)
Even if a client tries to hit checkout directly:

- `POST /api/billing/checkout/` with `{ "plan": "pro", ... }` will return **409 Conflict**
  - When org is already Pro with `subscription.status in ("active", "trialing")`
  - Response includes a human-readable error and may include `portal_url`

Implemented in:
- `label_studio/billing/views.py:create_checkout`

## Stripe portal configuration
Cancel happens inside the **Stripe Customer Portal**. Ensure portal settings allow cancellation:
- Configure in Stripe Dashboard and set `STRIPE_PORTAL_CONFIGURATION_ID`



