"""URL configuration for billing app."""
from django.urls import path

from billing import api, views

app_name = 'billing'

urlpatterns = [
    # Billing page (handled by React router)
    path('billing/', views.billing_page, name='billing-page'),
    # API endpoints
    path('api/billing/pricing/', api.PricingTableAPI.as_view(), name='billing-pricing'),
    path('api/billing/stripe-config/', api.StripeConfigAPI.as_view(), name='billing-stripe-config'),
    path('api/billing/checkout/', api.CheckoutSessionAPI.as_view(), name='billing-checkout'),
    path('api/billing/subscription/', api.SubscriptionStatusAPI.as_view(), name='billing-subscription'),
    # Alias for backward compatibility
    path('api/billing/status/', api.SubscriptionStatusAPI.as_view(), name='billing-status'),
    # Webhook endpoint (handled by dj-stripe)
    path('api/billing/webhook/', views.webhook_view, name='billing-webhook'),
    # Success and cancel pages
    path('billing/success/', views.billing_success, name='billing-success'),
    path('billing/cancel/', views.billing_cancel, name='billing-cancel'),
]
