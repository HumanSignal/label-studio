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

    return HttpResponse(status=200)


