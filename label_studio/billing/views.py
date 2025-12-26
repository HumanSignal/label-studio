"""Views for billing app."""
import json
import logging

import stripe
from django.conf import settings
from django.contrib.auth import logout
from django.db import IntegrityError, transaction
from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def webhook_view(request):
    """Ingest Stripe webhooks, enqueue background processing, and ACK fast.

    Best-practice pattern:
    - verify signature
    - persist payload for idempotency
    - enqueue background processing (RQ)
    - return 2xx quickly
    """
    from billing.jobs import process_stripe_webhook_ingest
    from billing.models import (
        STRIPE_WEBHOOK_STATUS_FAILED,
        STRIPE_WEBHOOK_STATUS_PROCESSED,
        STRIPE_WEBHOOK_STATUS_QUEUED,
        StripeWebhookIngest,
    )
    from core.redis import redis_connected, start_job_async_or_sync

    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    if not sig_header:
        return HttpResponseBadRequest('Missing Stripe-Signature header')

    payload_bytes = request.body or b''
    try:
        stripe_event = stripe.Webhook.construct_event(
            payload=payload_bytes,
            sig_header=sig_header,
            secret=settings.DJSTRIPE_WEBHOOK_SECRET,
        )
    except ValueError:
        # Invalid payload
        return HttpResponseBadRequest('Invalid payload')
    except stripe.error.SignatureVerificationError:
        return HttpResponseBadRequest('Invalid signature')

    def _event_get(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    stripe_event_id = _event_get(stripe_event, 'id')
    if not stripe_event_id:
        return HttpResponseBadRequest('Missing Stripe event id')

    event_type = _event_get(stripe_event, 'type', '') or ''
    livemode = bool(_event_get(stripe_event, 'livemode', False))

    if hasattr(stripe_event, 'to_dict_recursive'):
        payload_dict = stripe_event.to_dict_recursive()
    elif hasattr(stripe_event, 'to_dict'):
        payload_dict = stripe_event.to_dict()
    else:
        payload_dict = json.loads(payload_bytes.decode('utf-8'))

    try:
        with transaction.atomic():
            ingest, created = StripeWebhookIngest.objects.get_or_create(
                stripe_event_id=stripe_event_id,
                defaults={
                    'event_type': event_type,
                    'livemode': livemode,
                    'payload': payload_dict,
                },
            )
            if not created:
                # Already fully processed: ACK without doing any work.
                if ingest.status == STRIPE_WEBHOOK_STATUS_PROCESSED:
                    return HttpResponse(status=200)
                # Already queued: ACK without enqueueing again.
                if ingest.status == STRIPE_WEBHOOK_STATUS_QUEUED:
                    return HttpResponse(status=200)

                # Update stored payload and mark for (re)queue.
                ingest.event_type = event_type or ingest.event_type
                ingest.livemode = livemode
                ingest.payload = payload_dict
                ingest.save(update_fields=['event_type', 'livemode', 'payload', 'updated_at'])
    except IntegrityError:
        ingest = StripeWebhookIngest.objects.get(stripe_event_id=stripe_event_id)
        if ingest.status == STRIPE_WEBHOOK_STATUS_PROCESSED:
            return HttpResponse(status=200)
        if ingest.status == STRIPE_WEBHOOK_STATUS_QUEUED:
            return HttpResponse(status=200)

    # Require Redis for async processing. If Redis is down, do not ACK success: let Stripe retry.
    if not redis_connected():
        return HttpResponse(status=503)

    job = start_job_async_or_sync(process_stripe_webhook_ingest, ingest_id=ingest.id, queue_name='default')

    ingest.status = STRIPE_WEBHOOK_STATUS_QUEUED
    ingest.job_id = getattr(job, 'id', '') if job is not None else ''
    ingest.save(update_fields=['status', 'job_id', 'updated_at'])

    return HttpResponse(status=200)


def billing_page(request):
    """Render the billing page (handled by React router)."""
    user = request.user

    if user.is_authenticated:
        if user.active_organization is None and 'organization_pk' not in request.session:
            logout(request)
            return redirect(reverse('user-login'))
        return render(request, 'home/home.html')

    # not authenticated
    return redirect(reverse('user-login'))


def billing_success(request):
    """Redirect to billing page after successful checkout."""
    return redirect('/billing')


def billing_cancel(request):
    """Redirect to billing page after cancelled checkout."""
    return redirect('/billing')
