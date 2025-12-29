"""Tests for billing API views."""

from datetime import datetime, timedelta, timezone

import djstripe
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from billing.models import OrganizationCustomer


@pytest.mark.django_db
def test_stripe_config_no_customer(django_user_model):
    """StripeConfigAPI returns publishable key and null customer fields when no customer exists."""
    user = django_user_model.objects.create_user(
        username="user-no-customer",
        email="no-customer@example.com",
        password="password",
    )

    # Attach a fake active organization to the user if the model supports it
    # This mirrors how the main app expects `active_organization`.
    if not hasattr(user, "active_organization"):
        pytest.skip("User model does not support `active_organization` attribute")

    client = APIClient()
    client.force_authenticate(user=user)

    url = reverse("billing:billing-stripe-config")
    response = client.get(url)

    assert response.status_code == 200
    body = response.json()
    assert "publishable_key" in body
    assert "pricing_table_id" in body
    # No OrganizationCustomer mapping yet
    assert body["customer_email"] == user.email
    assert body["customer_id"] is None


@pytest.mark.django_db
def test_stripe_config_with_customer(django_user_model, settings):
    """StripeConfigAPI exposes the dj-stripe Customer.id as customer_id."""
    user = django_user_model.objects.create_user(
        username="user-with-customer",
        email="with-customer@example.com",
        password="password",
    )

    if not hasattr(user, "active_organization"):
        pytest.skip("User model does not support `active_organization` attribute")

    organization = user.active_organization
    assert organization is not None

    # Create a dj-stripe customer linked to this subscriber
    customer = djstripe.models.Customer.objects.create(
        id="cus_test_123",
        livemode=settings.STRIPE_LIVE_MODE,
        subscriber=None,
    )
    OrganizationCustomer.objects.create(organization=organization, customer=customer)

    client = APIClient()
    client.force_authenticate(user=user)

    url = reverse("billing:billing-stripe-config")
    response = client.get(url)

    assert response.status_code == 200
    body = response.json()

    assert body["customer_email"] == user.email
    # Use Stripe customer ID from dj-stripe
    assert body["customer_id"] == "cus_test_123"


@pytest.mark.django_db
def test_subscription_status_no_organization(django_user_model):
    """SubscriptionStatusAPI returns 400 if user has no active organization."""
    user = django_user_model.objects.create_user(
        username="user-no-org",
        email="user-no-org@example.com",
        password="password",
    )

    if hasattr(user, "active_organization"):
        user.active_organization = None

    client = APIClient()
    client.force_authenticate(user=user)

    url = reverse("billing:billing-subscription")
    response = client.get(url)

    assert response.status_code == 400


@pytest.mark.django_db
def test_subscription_status_no_subscription(django_user_model, settings):
    """SubscriptionStatusAPI reports has_subscription=False when no subscriptions exist."""
    user = django_user_model.objects.create_user(
        username="user-no-sub",
        email="user-no-sub@example.com",
        password="password",
    )

    if not hasattr(user, "active_organization"):
        pytest.skip("User model does not support `active_organization` attribute")

    organization = user.active_organization
    assert organization is not None

    # No OrganizationCustomer for this organization yet
    client = APIClient()
    client.force_authenticate(user=user)

    url = reverse("billing:billing-subscription")
    response = client.get(url)

    assert response.status_code == 200
    data = response.json()
    assert data["has_subscription"] is False
    assert data["status"] is None


@pytest.mark.django_db
def test_subscription_status_with_active_subscription(django_user_model, settings):
    """SubscriptionStatusAPI prefers a current active/trialing subscription."""
    user = django_user_model.objects.create_user(
        username="user-active-sub",
        email="active-sub@example.com",
        password="password",
    )

    if not hasattr(user, "active_organization"):
        pytest.skip("User model does not support `active_organization` attribute")

    organization = user.active_organization
    assert organization is not None

    # Create dj-stripe Product, Price, Customer, Subscription, and SubscriptionItem
    product = djstripe.models.Product.objects.create(
        id="prod_test_123",
        livemode=settings.STRIPE_LIVE_MODE,
        name="Test Product",
        active=True,
    )
    price = djstripe.models.Price.objects.create(
        id="price_test_123",
        livemode=settings.STRIPE_LIVE_MODE,
        currency="usd",
        product=product,
        active=True,
    )
    customer = djstripe.models.Customer.objects.create(
        id="cus_sub_123",
        livemode=settings.STRIPE_LIVE_MODE,
        subscriber=None,
    )
    OrganizationCustomer.objects.create(organization=organization, customer=customer)

    now = datetime.now(timezone.utc)
    subscription = djstripe.models.Subscription.objects.create(
        id="sub_test_123",
        livemode=settings.STRIPE_LIVE_MODE,
        customer=customer,
        stripe_data={
            "status": "active",
            "current_period_start": int(now.timestamp()),
            "current_period_end": int((now + timedelta(days=30)).timestamp()),
            "cancel_at_period_end": False,
            "canceled_at": None,
        },
    )
    djstripe.models.SubscriptionItem.objects.create(
        id="si_test_123",
        livemode=settings.STRIPE_LIVE_MODE,
        subscription=subscription,
        price=price,
        stripe_data={},
    )

    client = APIClient()
    client.force_authenticate(user=user)

    url = reverse("billing:billing-subscription")
    response = client.get(url)

    assert response.status_code == 200
    data = response.json()

    assert data["has_subscription"] is True
    assert data["status"] == "active"
    assert data["plan_name"] == product.name
    assert data["plan_currency"] == "usd"


