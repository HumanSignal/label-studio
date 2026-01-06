"""URL configuration for billing app."""
from django.urls import path
from django.views.generic import RedirectView

from billing import api, views

app_name = 'billing'

urlpatterns = [
    # Billing page (handled by React router)
    path('billing/', views.billing_page, name='billing-page'),
    # API endpoints
    path('api/billing/pricing/', api.PricingTableAPI.as_view(), name='billing-pricing'),
    path('api/billing/stripe-config/', api.StripeConfigAPI.as_view(), name='billing-stripe-config'),
    path('api/billing/public-stripe-config/', api.PublicStripeConfigAPI.as_view(), name='billing-public-stripe-config'),
    path('api/billing/checkout/', api.CheckoutSessionAPI.as_view(), name='billing-checkout'),
    path('api/billing/subscription/', api.SubscriptionStatusAPI.as_view(), name='billing-subscription'),
    # Alias for backward compatibility
    path('api/billing/status/', api.SubscriptionStatusAPI.as_view(), name='billing-status'),
    path('api/billing/usage-limits/', api.UsageLimitsAPI.as_view(), name='billing-usage-limits'),
    path('api/billing/portal/', api.CustomerPortalAPI.as_view(), name='billing-portal'),
    # Webhook endpoint (handled by dj-stripe)
    path('api/billing/webhook/', views.webhook_view, name='billing-webhook'),
    # Backward compatibility redirect for old webhook URL
    path('stripe/webhook/', RedirectView.as_view(url='/api/billing/webhook/', permanent=False), name='stripe-webhook-legacy'),
    # Success and cancel pages
    path('billing/success/', views.billing_success, name='billing-success'),
    path('billing/cancel/', views.billing_cancel, name='billing-cancel'),
]
