"""Billing models for linking organizations to Stripe customers."""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

STRIPE_WEBHOOK_STATUS_RECEIVED = 'received'
STRIPE_WEBHOOK_STATUS_QUEUED = 'queued'
STRIPE_WEBHOOK_STATUS_PROCESSED = 'processed'
STRIPE_WEBHOOK_STATUS_FAILED = 'failed'


class OrganizationCustomer(models.Model):
    """Link Organization to dj-stripe Customer."""

    organization = models.OneToOneField(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='stripe_customer',
        help_text='Organization linked to Stripe customer',
    )
    customer = models.ForeignKey(
        'djstripe.Customer',
        on_delete=models.CASCADE,
        related_name='organization_customers',
        help_text='Stripe customer',
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        db_table = 'billing_organization_customer'
        verbose_name = _('Organization Customer')
        verbose_name_plural = _('Organization Customers')

    def __str__(self):
        return f'{self.organization.title} - {self.customer.id}'


class StripeWebhookIngest(models.Model):
    """Persist Stripe webhook payloads for idempotent async processing.

    This model is used by `/api/billing/webhook/` to:
    - dedupe events by Stripe event id
    - enqueue background processing
    - track processing status/errors
    """

    stripe_event_id = models.CharField(
        _('stripe event id'),
        max_length=255,
        unique=True,
        db_index=True,
        help_text='Stripe Event ID, e.g. evt_123',
    )
    event_type = models.CharField(_('event type'), max_length=255, blank=True, default='')
    livemode = models.BooleanField(_('livemode'), default=False)
    payload = models.JSONField(_('payload'))

    status = models.CharField(
        _('status'),
        max_length=32,
        default=STRIPE_WEBHOOK_STATUS_RECEIVED,
        choices=[
            (STRIPE_WEBHOOK_STATUS_RECEIVED, _('received')),
            (STRIPE_WEBHOOK_STATUS_QUEUED, _('queued')),
            (STRIPE_WEBHOOK_STATUS_PROCESSED, _('processed')),
            (STRIPE_WEBHOOK_STATUS_FAILED, _('failed')),
        ],
    )
    job_id = models.CharField(_('rq job id'), max_length=255, blank=True, default='')
    attempts = models.PositiveIntegerField(_('attempts'), default=0)
    last_error = models.TextField(_('last error'), blank=True, default='')

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        db_table = 'billing_stripe_webhook_ingest'
        verbose_name = _('Stripe Webhook Ingest')
        verbose_name_plural = _('Stripe Webhook Ingests')

    def __str__(self):
        return f'{self.stripe_event_id} ({self.event_type}) [{self.status}]'



