"""Background jobs for billing."""

import logging

import djstripe
import stripe
from django.conf import settings
from django.db import transaction

from billing.models import (
    STRIPE_WEBHOOK_STATUS_FAILED,
    STRIPE_WEBHOOK_STATUS_PROCESSED,
    StripeWebhookIngest,
)

logger = logging.getLogger(__name__)


def process_stripe_webhook_ingest(*, ingest_id: int) -> str:
    """Process a persisted Stripe webhook payload via dj-stripe.

    This function is intended to run in an RQ worker.
    """
    ingest = StripeWebhookIngest.objects.get(id=ingest_id)

    if ingest.status == STRIPE_WEBHOOK_STATUS_PROCESSED:
        return ingest.stripe_event_id

    api_key = settings.STRIPE_LIVE_SECRET_KEY if ingest.livemode else settings.STRIPE_TEST_SECRET_KEY
    if not api_key:
        raise RuntimeError('Stripe API key is not configured for this webhook livemode')

    stripe.api_key = api_key

    try:
        with transaction.atomic():
            ingest.attempts += 1
            ingest.save(update_fields=['attempts', 'updated_at'])

        # Persist the Event via dj-stripe. This triggers dj-stripe signals/receivers.
        djstripe_event = djstripe.models.Event.process(ingest.payload, api_key=api_key)

        with transaction.atomic():
            ingest.status = STRIPE_WEBHOOK_STATUS_PROCESSED
            ingest.last_error = ''
            ingest.save(update_fields=['status', 'last_error', 'updated_at'])

        return djstripe_event.id
    except Exception as exc:
        logger.exception('Failed to process Stripe webhook ingest_id=%s event_id=%s', ingest_id, ingest.stripe_event_id)
        with transaction.atomic():
            ingest.status = STRIPE_WEBHOOK_STATUS_FAILED
            ingest.last_error = str(exc)
            ingest.save(update_fields=['status', 'last_error', 'updated_at'])
        raise


