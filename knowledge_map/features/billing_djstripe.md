# dj-stripe Billing Integration

## Overview

Label Studio implements subscription billing via Stripe using the `dj-stripe` Django package.

This repo supports **multi-tier self-serve billing** with **monthly/yearly** intervals:

- **Free**: 1 project, 2 tasks/images total
- **Standard**: $5/mo, $50/yr, 5 projects, 50 tasks/images total
- **Pro**: $10/mo, $100/yr, 100 projects, 50 tasks/images total
- **Enterprise**: “Please contact” (no self-serve checkout)

## Architecture

### Billing State Management

- **Subscriber Model**: `organizations.Organization` (configured via `DJSTRIPE_SUBSCRIBER_MODEL`)
- **Plan Detection**: Organizations are considered paid (Standard/Pro) if they have an active or trialing Stripe subscription. The system detects the plan and interval by retrieving the Stripe subscription with expanded price info and matching configured Stripe price IDs/lookup keys.
- **Limits**: Limits are enforced server-side on project/task creation by `Organization.check_max_projects()` / `Organization.check_max_tasks()`.

### Key Components

- `billing/` Django app containing:
  - `services/stripe.py`: Stripe integration (checkout, portal, subscription status)
  - `services/plans.py`: Plan logic, limits, and usage calculations
  - `views.py`: API endpoints for billing operations
- Organization model methods: `check_max_projects()`, `check_max_tasks()`
- Quota enforcement in project/task creation APIs

## Setup

### Environment Variables

```env
# dj-stripe settings
DJSTRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...

# Stripe secret key selection
STRIPE_LIVE_MODE=false
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_LIVE_SECRET_KEY=sk_live_...

# Plan price IDs (recommended)
STRIPE_STANDARD_MONTHLY_PRICE_ID=price_...
STRIPE_STANDARD_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...

# Or plan price lookup keys (optional alternative)
STRIPE_STANDARD_MONTHLY_PRICE_LOOKUP_KEY=standard_monthly
STRIPE_STANDARD_YEARLY_PRICE_LOOKUP_KEY=standard_yearly
STRIPE_PRO_MONTHLY_PRICE_LOOKUP_KEY=pro_monthly
STRIPE_PRO_YEARLY_PRICE_LOOKUP_KEY=pro_yearly

# Legacy fallback (Pro monthly only)
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PRO_PRICE_LOOKUP_KEY=pro_monthly
```

### Stripe Configuration

1. **Create Products/Prices** in Stripe Dashboard:
   - Standard Plan: recurring monthly + yearly prices
   - Pro Plan: recurring monthly + yearly prices
   - Use a stable `lookup_key` per price if you prefer lookup-key configuration

2. **Webhook Configuration**:
   - Endpoint URL: `https://your-domain/stripe/webhook/`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy webhook signing secret to `DJSTRIPE_WEBHOOK_SECRET`

3. **Customer Portal** (optional):
   - Configure portal settings in Stripe Dashboard
   - Copy configuration ID to `STRIPE_PORTAL_CONFIGURATION_ID`

## API Endpoints

### Get Billing Status
```http
GET /api/billing/status/
```

Returns:
```json
{
  "plan": "free|standard|pro",
  "limits": {
    "max_projects": 1,
    "max_tasks": 2
  },
  "usage": {
    "projects_count": 1,
    "tasks_count": 15
  },
  "subscription": {
    "plan": "free|standard|pro",
    "interval": "monthly|yearly",
    "subscription_id": "sub_...",
    "status": "active",
    "current_period_end": "2024-01-01T00:00:00Z"
  }
}
```

### Create Checkout Session
```http
POST /api/billing/checkout/
```

Creates a Stripe Checkout session for upgrading to a paid plan. Expects JSON body:

```json
{ "plan": "standard|pro", "interval": "monthly|yearly" }
```

Returns `checkout_url` to redirect users to Stripe Checkout with promotion code support enabled.

### Create Customer Portal Session
```http
POST /api/billing/portal/
```

Creates a Stripe Customer Portal session for managing subscriptions. Returns `portal_url` to redirect users to the portal.

## Quota Enforcement

### Free Tier Limits

- **Projects**: Maximum 1 project per organization
- **Tasks**: Maximum 2 tasks total across all projects in the organization

### Standard Tier Limits

- **Projects**: Maximum 5 projects per organization
- **Tasks**: Maximum 50 tasks total across all projects in the organization

### Pro Tier Limits

- **Projects**: Maximum 100 projects per organization
- **Tasks**: Maximum 50 tasks total across all projects in the organization

### Enforcement Points

Limits are enforced server-side at creation time:

1. **Project Creation**: `ProjectListAPI.perform_create()` calls `organization.check_max_projects()`
2. **Task Import (Sync)**: `ImportAPI.sync_import()` calls `organization.check_max_tasks(len(tasks))`
3. **Task Import (Async)**: `async_import_background()` calls `organization.check_max_tasks(len(tasks))`
4. **Task Re-import**: `ReImportAPI.sync_reimport()` calls `organization.check_max_tasks(len(tasks))` after task removal
5. **Single Task Creation**: `ProjectTaskListAPI.perform_create()` calls `organization.check_max_tasks(1)`

## Local Development

### Stripe Test Mode

1. Create test products/prices in Stripe Dashboard
2. Use test API keys and webhook endpoints
3. Use test card numbers for checkout testing (e.g., `4242 4242 4242 4242`)

### Webhook Testing

- **Docker dev (this repo)**: the app is exposed via Nginx on `http://localhost:8082`, so forward to:
  - `stripe listen --forward-to localhost:8082/stripe/webhook/`
- **Non-docker**: if you run the app directly on port 8080, forward to:
  - `stripe listen --forward-to localhost:8080/stripe/webhook/`
- Or use ngrok to expose local server: `ngrok http 8080`

### Testing Quotas

- Create test organizations and verify limits are enforced
- Test both Free and Pro scenarios
- Verify async import limits are checked

## Monitoring

### Key Metrics

- Subscription conversion rates
- Failed payment rates
- Quota limit hit frequency

### Webhook Monitoring

- Monitor Stripe webhook delivery in dashboard
- Check application logs for webhook processing errors
- Verify subscription state sync between Stripe and dj-stripe

## Troubleshooting

### Common Issues

1. **Webhook Signature Verification Fails**: Ensure `DJSTRIPE_WEBHOOK_SECRET` matches Stripe webhook endpoint secret

2. **Subscription State Not Syncing**: Check webhook events are being processed and dj-stripe models are updated

3. **Quota Limits Not Enforced**: Verify billing app is installed and `Organization.check_max_*` methods are called in creation APIs

4. **Checkout Session Creation Fails**: Check Stripe API keys, price ID configuration, and network connectivity

### Debugging

- Check dj-stripe admin interface for subscription/customer data
- Review application logs for billing-related errors
- Use Stripe dashboard to verify webhook delivery and event processing
