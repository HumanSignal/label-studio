"""Serializers for billing API."""
from rest_framework import serializers


class PriceSerializer(serializers.Serializer):
    """Serializer for Stripe Price information."""

    id = serializers.CharField()
    product_id = serializers.CharField()
    product_name = serializers.CharField()
    amount = serializers.IntegerField()
    currency = serializers.CharField()
    interval = serializers.CharField()
    interval_count = serializers.IntegerField()
    active = serializers.BooleanField()
    description = serializers.CharField(required=False, allow_null=True)


class PricingTableSerializer(serializers.Serializer):
    """Serializer for pricing table response."""

    prices = PriceSerializer(many=True)


class CheckoutSessionSerializer(serializers.Serializer):
    """Serializer for creating checkout session."""

    price_id = serializers.CharField(required=True, help_text='Stripe Price ID')
    success_url = serializers.URLField(required=False, help_text='URL to redirect after successful payment')
    cancel_url = serializers.URLField(required=False, help_text='URL to redirect after cancelled payment')


class CheckoutSessionResponseSerializer(serializers.Serializer):
    """Serializer for checkout session response."""

    session_id = serializers.CharField()
    url = serializers.URLField()


class SubscriptionStatusSerializer(serializers.Serializer):
    """Serializer for subscription status."""

    status = serializers.CharField()
    current_period_start = serializers.DateTimeField(required=False, allow_null=True)
    current_period_end = serializers.DateTimeField(required=False, allow_null=True)
    cancel_at_period_end = serializers.BooleanField(required=False)
    canceled_at = serializers.DateTimeField(required=False, allow_null=True)
    plan_name = serializers.CharField(required=False, allow_null=True)
    plan_amount = serializers.IntegerField(required=False, allow_null=True)
    plan_currency = serializers.CharField(required=False, allow_null=True)
    plan_interval = serializers.CharField(required=False, allow_null=True)
    has_subscription = serializers.BooleanField()


class StripeConfigSerializer(serializers.Serializer):
    """Serializer for Stripe configuration."""

    publishable_key = serializers.CharField()
    pricing_table_id = serializers.CharField()
    customer_email = serializers.EmailField(required=False, allow_null=True)
    customer_id = serializers.CharField(required=False, allow_null=True)
    customer_session_client_secret = serializers.CharField(required=False, allow_null=True)


class CustomerPortalResponseSerializer(serializers.Serializer):
    """Serializer for customer portal session response."""

    url = serializers.URLField()


class UsageLimitsSerializer(serializers.Serializer):
    """Serializer for usage limits status."""

    tier = serializers.CharField(help_text='Membership tier: FREE, PLUS, or PRO')
    current_projects = serializers.IntegerField(help_text='Current number of projects')
    max_projects = serializers.IntegerField(required=False, allow_null=True, help_text='Maximum allowed projects (None for unlimited)')
    current_tasks = serializers.IntegerField(help_text='Current number of tasks across all projects')
    max_tasks = serializers.IntegerField(required=False, allow_null=True, help_text='Maximum allowed tasks (None for unlimited)')
    project_task_count = serializers.IntegerField(required=False, allow_null=True, help_text='Current number of tasks in the specified project (if project_id provided)')
    can_create_project = serializers.BooleanField(help_text='Whether a new project can be created')
    can_import_tasks = serializers.BooleanField(help_text='Whether tasks can be imported')

