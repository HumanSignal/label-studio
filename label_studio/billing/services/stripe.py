# This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.

import logging
from typing import Optional, Tuple

import stripe
from django.conf import settings
from django.http import HttpRequest
from djstripe.models import Customer, Subscription

logger = logging.getLogger(__name__)

Plan = str
Interval = str


def _configure_stripe_api_key() -> None:
    """
    Ensure Stripe API key is configured for direct stripe-python calls.
    dj-stripe uses its own settings, but our Checkout/Portal helpers call stripe
    directly and require `stripe.api_key` to be set.
    """
    api_key = getattr(settings, "STRIPE_SECRET_KEY", "") or ""
    if not api_key:
        raise ValueError(
            "Stripe secret key is not configured. Set STRIPE_TEST_SECRET_KEY (test mode) or "
            "STRIPE_LIVE_SECRET_KEY (live mode), and ensure STRIPE_LIVE_MODE is correct."
        )
    stripe.api_key = api_key


def _get_price_id_from_lookup_key(lookup_key: str) -> str:
    prices = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1)
    if not prices.data:
        raise ValueError(f"Stripe price lookup_key '{lookup_key}' not found (no active Price).")
    return prices.data[0].id


def _get_price_id(plan: Plan, interval: Interval) -> str:
    """
    Resolve the Stripe Price ID for (plan, interval).

    Preferred: explicit *_PRICE_ID settings (e.g. 'price_...').
    Fallback: *_PRICE_LOOKUP_KEY (Stripe Price.lookup_key).

    Backwards compat:
    - if only STRIPE_PRO_PRICE_ID / STRIPE_PRO_PRICE_LOOKUP_KEY are set, treat as Pro monthly.
    """
    plan = (plan or "").strip().lower()
    interval = (interval or "").strip().lower()

    if plan not in ("standard", "pro"):
        raise ValueError("Unsupported plan for checkout. Allowed: standard, pro.")
    if interval not in ("monthly", "yearly"):
        raise ValueError("Unsupported interval for checkout. Allowed: monthly, yearly.")

    if plan == "standard":
        price_id = (
            getattr(settings, "STRIPE_STANDARD_MONTHLY_PRICE_ID" if interval == "monthly" else "STRIPE_STANDARD_YEARLY_PRICE_ID", "")
            or ""
        ).strip()
        if price_id:
            return price_id

        lookup_key = (
            getattr(
                settings,
                "STRIPE_STANDARD_MONTHLY_PRICE_LOOKUP_KEY" if interval == "monthly" else "STRIPE_STANDARD_YEARLY_PRICE_LOOKUP_KEY",
                "",
            )
            or ""
        ).strip()
        if not lookup_key:
            raise ValueError("Stripe Standard price is not configured for this interval.")
        return _get_price_id_from_lookup_key(lookup_key)

    # plan == "pro"
    price_id = (
        getattr(settings, "STRIPE_PRO_MONTHLY_PRICE_ID" if interval == "monthly" else "STRIPE_PRO_YEARLY_PRICE_ID", "") or ""
    ).strip()
    if price_id:
        return price_id

    lookup_key = (
        getattr(settings, "STRIPE_PRO_MONTHLY_PRICE_LOOKUP_KEY" if interval == "monthly" else "STRIPE_PRO_YEARLY_PRICE_LOOKUP_KEY", "")
        or ""
    ).strip()
    if lookup_key:
        return _get_price_id_from_lookup_key(lookup_key)

    # legacy fallback: Pro monthly only
    legacy_price_id = (getattr(settings, "STRIPE_PRO_PRICE_ID", "") or "").strip()
    if legacy_price_id and legacy_price_id != "price_test_price_id" and interval == "monthly":
        return legacy_price_id
    legacy_lookup_key = (getattr(settings, "STRIPE_PRO_PRICE_LOOKUP_KEY", "") or "").strip()
    if legacy_lookup_key and interval == "monthly":
        return _get_price_id_from_lookup_key(legacy_lookup_key)

    raise ValueError("Stripe Pro price is not configured for this interval.")


def _get_pro_price_id() -> str:
    """
    Resolve the Stripe Price ID for the Pro subscription.

    Preferred: settings.STRIPE_PRO_PRICE_ID (e.g. 'price_...')
    Fallback: settings.STRIPE_PRO_PRICE_LOOKUP_KEY (Price.lookup_key in Stripe)
    """
    # legacy behavior used by older clients (Pro monthly)
    return _get_price_id("pro", "monthly")


def subscriber_from_request(request: HttpRequest) -> Optional['organizations.Organization']:
    """Callback to get the subscriber (Organization) from the request for dj-stripe."""
    if hasattr(request, 'user') and request.user.is_authenticated:
        return request.user.active_organization
    return None


def create_checkout_session(organization, success_url: str, cancel_url: str, plan: Plan = "pro", interval: Interval = "monthly") -> str:
    """Create a Stripe Checkout Session for upgrading to a paid plan."""
    try:
        _configure_stripe_api_key()

        # Use dj-stripe helper (creates Stripe customer + stores real Stripe customer id)
        customer, _created = Customer.get_or_create(subscriber=organization)
        price_id = _get_price_id(plan, interval)

        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            allow_promotion_codes=True,  # Enable coupon codes
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=str(organization.id),
            metadata={
                'organization_id': str(organization.id),
                'organization_title': organization.title,
                'plan': str(plan),
                'interval': str(interval),
            },
        )

        logger.info(f"Created checkout session {checkout_session.id} for org {organization.id}")
        return checkout_session.url

    except Exception as e:
        logger.error(f"Failed to create checkout session for org {organization.id}: {e}")
        raise


def create_customer_portal_session(organization, return_url: str) -> str:
    """Create a Stripe Customer Portal session for managing subscription."""
    try:
        _configure_stripe_api_key()

        # Handle multiple customers by using the most recent one
        # (same logic as sync_org_from_stripe)
        customer = Customer.objects.filter(subscriber=organization).order_by('-created').first()
        if not customer:
            # No customer exists yet - create one
            customer, _created = Customer.get_or_create(subscriber=organization)

        # Create portal session
        portal_session = stripe.billing_portal.Session.create(
            customer=customer.id,
            return_url=return_url,
            configuration=settings.STRIPE_PORTAL_CONFIGURATION_ID or None,
        )

        logger.info(f"Created portal session {portal_session.id} for org {organization.id}")
        return portal_session.url

    except Customer.DoesNotExist:
        raise ValueError(f"No Stripe customer found for organization {organization.id}")
    except Exception as e:
        logger.error(f"Failed to create portal session for org {organization.id}: {e}")
        raise


def sync_org_from_stripe(organization) -> dict:
    """
    Sync organization's Stripe Customer and Subscriptions from Stripe API.
    Forces a refresh of local dj-stripe models from Stripe's authoritative data.
    """
    try:
        _configure_stripe_api_key()
        
        # Get the dj-stripe Customer (handle multiple customers by taking the most recent)
        # If customer doesn't exist in Stripe yet, nothing to sync
        dj_customer = Customer.objects.filter(subscriber=organization).order_by('-created').first()
        
        if not dj_customer:
            # No customer linked in dj-stripe - try to find by email in Stripe API
            org_email = organization.get_stripe_email()
            if org_email:
                try:
                    # Search Stripe for customers with this email
                    stripe_customers = stripe.Customer.list(email=org_email, limit=10)
                    
                    # If we found customers in Stripe, sync the first one and link it
                    if stripe_customers.data:
                        stripe_customer_data = stripe_customers.data[0]
                        sync_customer = getattr(Customer, "sync_from_stripe_data", None)
                        if callable(sync_customer):
                            dj_customer = sync_customer(stripe_customer_data)
                            # Link the customer to this organization
                            dj_customer.subscriber = organization
                            dj_customer.save()
                            logger.info(f"Found and linked Stripe customer {dj_customer.id} to org {organization.id} via email {org_email}")
                except stripe.error.StripeError as e:
                    logger.warning(f"Failed to search Stripe for customer by email {org_email}: {e}")
            
            # If still no customer found, return free status
            if not dj_customer:
                logger.info(f"No Stripe customer found for org {organization.id}, returning free status")
                return get_org_subscription_status(organization)
        
        # If there are multiple customers, log a warning and use the most recent one
        customer_count = Customer.objects.filter(subscriber=organization).count()
        if customer_count > 1:
            logger.warning(f"Found {customer_count} customers for org {organization.id}, using most recent: {dj_customer.id}")
        
        # If customer exists but has no Stripe ID yet, nothing to sync
        if not dj_customer.id or not dj_customer.id.startswith('cus_'):
            logger.info(f"Customer {dj_customer.id} for org {organization.id} has no Stripe ID yet")
            return get_org_subscription_status(organization)
        
        # Sync the Customer from Stripe API
        try:
            stripe_customer = stripe.Customer.retrieve(dj_customer.id)
            sync_customer = getattr(Customer, "sync_from_stripe_data", None)
            if callable(sync_customer):
                dj_customer = sync_customer(stripe_customer)
                # Ensure subscriber link is preserved after sync
                if dj_customer.subscriber != organization:
                    dj_customer.subscriber = organization
                    dj_customer.save()
        except stripe.error.InvalidRequestError as e:
            # Customer doesn't exist in Stripe (might have been deleted)
            logger.warning(f"Stripe customer {dj_customer.id} not found in Stripe: {e}")
            # Continue to try syncing subscriptions anyway
        
        # Sync all subscriptions for this customer
        try:
            stripe_subscriptions = stripe.Subscription.list(customer=dj_customer.id, limit=100)
            sync_subscription = getattr(Subscription, "sync_from_stripe_data", None)
            
            if callable(sync_subscription):
                for sub_data in stripe_subscriptions.data:
                    try:
                        sync_subscription(sub_data)
                    except Exception as sub_err:
                        logger.warning(f"Failed to sync subscription {sub_data.get('id')}: {sub_err}")
        except stripe.error.InvalidRequestError as e:
            logger.warning(f"Failed to list subscriptions for customer {dj_customer.id}: {e}")
        
        logger.info(f"Synced Stripe data for org {organization.id} (customer {dj_customer.id})")
        
        # Return refreshed status
        return get_org_subscription_status(organization)
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error syncing org {organization.id}: {e}")
        raise ValueError(f"Failed to sync from Stripe: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to sync org {organization.id} from Stripe: {e}", exc_info=True)
        raise


def get_org_subscription_status(organization) -> dict:
    """Get the current subscription status for an organization."""
    try:
        # Handle multiple customers by using the most recent one
        customer = Customer.objects.filter(subscriber=organization).order_by('-created').first()
        
        if not customer:
            return {
                'plan': 'free',
                'subscription': {
                    'plan': 'free',
                    'interval': None,
                    'subscription_id': None,
                    'status': None,
                    'current_period_end': None,
                },
            }

        # dj-stripe exposes `status` as a property (from stripe_data) and it is
        # not always queryable as a DB field. Fetch subscriptions and evaluate
        # status in Python to avoid ORM field errors.
        subscriptions = Subscription.objects.filter(customer=customer).order_by('-created')
        active_subscription = next(
            (
                s for s in subscriptions
                if getattr(s, 'status', None) in ('active', 'trialing')
            ),
            None,
        )

        if active_subscription:
            plan, interval = _detect_plan_and_interval(active_subscription)
            return {
                'plan': plan,
                'subscription': {
                    'plan': plan,
                    'interval': interval,
                    'subscription_id': active_subscription.id,
                    'status': active_subscription.status,
                    'current_period_end': active_subscription.current_period_end,
                },
            }
        else:
            return {
                'plan': 'free',
                'subscription': {
                    'plan': 'free',
                    'interval': None,
                    'subscription_id': None,
                    'status': None,
                    'current_period_end': None,
                },
            }

    except Customer.DoesNotExist:
        return {
            'plan': 'free',
            'subscription': {
                'plan': 'free',
                'interval': None,
                'subscription_id': None,
                'status': None,
                'current_period_end': None,
            },
        }


def _price_map() -> dict:
    """
    Build a map: price_id -> (plan, interval).
    Only includes configured prices.
    """
    mapping = {}
    for plan, interval, id_attr, key_attr in [
        ("standard", "monthly", "STRIPE_STANDARD_MONTHLY_PRICE_ID", "STRIPE_STANDARD_MONTHLY_PRICE_LOOKUP_KEY"),
        ("standard", "yearly", "STRIPE_STANDARD_YEARLY_PRICE_ID", "STRIPE_STANDARD_YEARLY_PRICE_LOOKUP_KEY"),
        ("pro", "monthly", "STRIPE_PRO_MONTHLY_PRICE_ID", "STRIPE_PRO_MONTHLY_PRICE_LOOKUP_KEY"),
        ("pro", "yearly", "STRIPE_PRO_YEARLY_PRICE_ID", "STRIPE_PRO_YEARLY_PRICE_LOOKUP_KEY"),
        # legacy pro monthly
        ("pro", "monthly", "STRIPE_PRO_PRICE_ID", "STRIPE_PRO_PRICE_LOOKUP_KEY"),
    ]:
        price_id = (getattr(settings, id_attr, "") or "").strip()
        if price_id and price_id != "price_test_price_id":
            mapping[price_id] = (plan, interval)
            continue
        lookup_key = (getattr(settings, key_attr, "") or "").strip()
        if lookup_key:
            # resolve lazily only when Stripe is configured
            mapping[f"lookup:{lookup_key}"] = (plan, interval)
    return mapping


def _detect_plan_and_interval(active_subscription: Subscription) -> Tuple[str, Optional[str]]:
    """
    Detect plan/interval for an active subscription.

    We retrieve the Stripe subscription with expanded price data to avoid relying on dj-stripe's
    DB fields which can vary across versions.
    """
    # Default for backwards compatibility
    default_plan = "pro"
    default_interval = None

    price_mapping = _price_map()

    try:
        _configure_stripe_api_key()

        # Resolve any lookup_key entries to actual price IDs once we know Stripe is configured
        resolved_mapping = {}
        for key, value in price_mapping.items():
            if key.startswith("lookup:"):
                resolved_mapping[_get_price_id_from_lookup_key(key.replace("lookup:", ""))] = value
            else:
                resolved_mapping[key] = value

        sub = stripe.Subscription.retrieve(active_subscription.id, expand=["items.data.price"])
        items = (sub.get("items") or {}).get("data") or []
        first_item = items[0] if items else None
        price = (first_item or {}).get("price") or {}
        price_id = price.get("id")
        recurring = price.get("recurring") or {}
        interval = recurring.get("interval")

        if price_id and price_id in resolved_mapping:
            plan, configured_interval = resolved_mapping[price_id]
            return plan, configured_interval or interval

        if interval:
            # If interval is known but we can't map, keep pro as a safe paid-tier default
            return default_plan, interval

        return default_plan, default_interval
    except Exception as e:
        logger.warning(f"Failed to detect plan/interval for subscription {active_subscription.id}: {e}")
        return default_plan, default_interval
