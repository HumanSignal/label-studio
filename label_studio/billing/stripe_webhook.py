# This file and its contents are licensed under the Apache License 2.0.
# Please see the included NOTICE for copyright information and LICENSE for a copy of the license.

import logging
from typing import Any, Callable

import stripe
from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

logger = logging.getLogger(__name__)


def _process_with_djstripe(event_data: Any) -> None:
    """
    Hand the Stripe event payload to dj-stripe so it can sync Customer/Subscription/etc.

    dj-stripe's API has changed slightly across versions; we try a couple of stable entrypoints.
    """
    from djstripe.models import Event  # local import to avoid import-time side effects

    process: Callable[..., Any] | None = getattr(Event, "process", None)
    if callable(process):
        process(event_data)
        return

    from_stripe_data: Callable[..., Any] | None = getattr(Event, "from_stripe_data", None)
    if callable(from_stripe_data):
        dj_event = from_stripe_data(event_data)
        if hasattr(dj_event, "process"):
            dj_event.process()
            return

    raise RuntimeError("Unsupported dj-stripe Event processing API (no Event.process / Event.from_stripe_data).")


@csrf_exempt
@require_POST
def stripe_webhook(request: HttpRequest) -> HttpResponse:
    """
    Stripe webhook endpoint.

    We implement this explicitly because in some deployments the bundled dj-stripe URLconf
    may not be mounted as expected, which leads to Stripe deliveries returning 404 and the
    subscription state never syncing (org stays on Free).
    """
    webhook_secret = (getattr(settings, "DJSTRIPE_WEBHOOK_SECRET", "") or "").strip()
    if not webhook_secret:
        logger.error("Stripe webhook received but DJSTRIPE_WEBHOOK_SECRET is not configured")
        return HttpResponse(status=500)

    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    payload = request.body

    try:
        # construct_event returns a StripeObject; convert to a plain dict for dj-stripe
        event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=webhook_secret)
        event_data = event.to_dict() if hasattr(event, "to_dict") else event
    except ValueError:
        logger.warning("Stripe webhook: invalid payload")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook: signature verification failed")
        return HttpResponse(status=400)

    try:
        _process_with_djstripe(event_data)
    except Exception:
        logger.exception("Stripe webhook: failed to process event via dj-stripe")
        return HttpResponse(status=500)

    # Post-processing: Handle specific events that need explicit syncing
    try:
        event_type = (event_data or {}).get("type")
        event_data_obj = (event_data or {}).get("data") or {}
        event_object = event_data_obj.get("object") or {}

        if event_type == "checkout.session.completed":
            # Option A: Pricing Table checkout creates Checkout Sessions without our custom API.
            # Bind the Stripe Customer created during checkout to the active Organization via client_reference_id.
            client_reference_id = event_object.get("client_reference_id")
            stripe_customer_id = event_object.get("customer")

            if client_reference_id and stripe_customer_id:
                from organizations.models import Organization
                from djstripe.models import Customer

                org = Organization.objects.filter(id=int(client_reference_id)).first()
                if not org:
                    logger.warning(f"Stripe webhook: unknown organization id {client_reference_id} in checkout session")
                else:
                    # dj-stripe should have synced the Customer already; if not, sync it now.
                    dj_customer = Customer.objects.filter(id=stripe_customer_id).first()
                    if not dj_customer:
                        stripe_customer = stripe.Customer.retrieve(stripe_customer_id)
                        sync = getattr(Customer, "sync_from_stripe_data", None)
                        if callable(sync):
                            dj_customer = sync(stripe_customer)
                        else:
                            # Fallback: try get_or_create using subscriber (will create in Stripe if missing)
                            dj_customer, _ = Customer.get_or_create(subscriber=org)

                    if dj_customer:
                        # Attach subscriber/org
                        dj_customer.subscriber = org
                        dj_customer.save()
                        logger.info(f"Stripe webhook: linked Stripe customer {stripe_customer_id} to org {org.id}")

        elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
            # Force sync subscription when it's updated or deleted to ensure plan changes are reflected
            subscription_id = event_object.get("id")
            customer_id = event_object.get("customer")

            if subscription_id and customer_id:
                from djstripe.models import Subscription, Customer
                from billing.services.stripe import sync_org_from_stripe

                # Find the organization via customer (handle multiple customers by using most recent)
                customer = Customer.objects.filter(id=customer_id).order_by('-created').first()
                if customer and customer.subscriber:
                    org = customer.subscriber
                    logger.info(f"Stripe webhook: subscription {subscription_id} updated/deleted for org {org.id}, forcing sync")
                    try:
                        # Force sync from Stripe API to get latest subscription data
                        sync_org_from_stripe(org)
                        logger.info(f"Stripe webhook: successfully synced subscription changes for org {org.id}")
                    except Exception as sync_error:
                        logger.error(f"Stripe webhook: failed to sync subscription for org {org.id}: {sync_error}")
                else:
                    logger.warning(f"Stripe webhook: subscription {subscription_id} (customer {customer_id}) has no linked organization")

    except Exception:
        logger.exception("Stripe webhook: post-processing failed")

    return HttpResponse(status=200)






