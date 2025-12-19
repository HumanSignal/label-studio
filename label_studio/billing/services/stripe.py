# This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.

import logging
from typing import Optional

import stripe
from django.conf import settings
from django.http import HttpRequest
from djstripe.models import Customer, Subscription

logger = logging.getLogger(__name__)


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


def _get_pro_price_id() -> str:
    """
    Resolve the Stripe Price ID for the Pro subscription.

    Preferred: settings.STRIPE_PRO_PRICE_ID (e.g. 'price_...')
    Fallback: settings.STRIPE_PRO_PRICE_LOOKUP_KEY (Price.lookup_key in Stripe)
    """
    price_id = (getattr(settings, "STRIPE_PRO_PRICE_ID", "") or "").strip()
    if price_id and price_id != "price_test_price_id":
        return price_id

    lookup_key = (getattr(settings, "STRIPE_PRO_PRICE_LOOKUP_KEY", "") or "").strip()
    if not lookup_key:
        raise ValueError(
            "Stripe Pro price is not configured. Set STRIPE_PRO_PRICE_ID to a valid Stripe Price ID "
            "(e.g. 'price_...') or set STRIPE_PRO_PRICE_LOOKUP_KEY to an existing Stripe Price.lookup_key."
        )

    prices = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1)
    if not prices.data:
        raise ValueError(
            f"Stripe Pro price lookup_key '{lookup_key}' not found (no active Price). "
            "Create a recurring monthly Price in Stripe and set its lookup_key."
        )
    return prices.data[0].id


def subscriber_from_request(request: HttpRequest) -> Optional['organizations.Organization']:
    """Callback to get the subscriber (Organization) from the request for dj-stripe."""
    if hasattr(request, 'user') and request.user.is_authenticated:
        return request.user.active_organization
    return None


def create_checkout_session(organization, success_url: str, cancel_url: str) -> str:
    """Create a Stripe Checkout Session for upgrading to Pro plan."""
    try:
        _configure_stripe_api_key()

        # Use dj-stripe helper (creates Stripe customer + stores real Stripe customer id)
        customer, _created = Customer.get_or_create(subscriber=organization)
        pro_price_id = _get_pro_price_id()

        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=['card'],
            line_items=[{
                'price': pro_price_id,
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

        # Use dj-stripe helper (creates Stripe customer + stores real Stripe customer id)
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


def get_org_subscription_status(organization) -> dict:
    """Get the current subscription status for an organization."""
    try:
        customer = Customer.objects.get(subscriber=organization)

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
            return {
                'plan': 'pro',
                'subscription_id': active_subscription.id,
                'status': active_subscription.status,
                'current_period_end': active_subscription.current_period_end,
            }
        else:
            return {
                'plan': 'free',
                'subscription_id': None,
                'status': None,
                'current_period_end': None,
            }

    except Customer.DoesNotExist:
        return {
            'plan': 'free',
            'subscription_id': None,
            'status': None,
            'current_period_end': None,
        }
