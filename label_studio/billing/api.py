"""Billing API views."""
import logging

import djstripe
import stripe
from django.conf import settings
from django.urls import reverse
from django.utils.decorators import method_decorator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models import OrganizationCustomer
from billing.serializers import (
    CheckoutSessionResponseSerializer,
    CheckoutSessionSerializer,
    PriceSerializer,
    PricingTableSerializer,
    StripeConfigSerializer,
    SubscriptionStatusSerializer,
)
from core.permissions import all_permissions

logger = logging.getLogger(__name__)

# Configure Stripe API key using dj-stripe settings
# dj-stripe automatically sets stripe.api_key based on STRIPE_LIVE_MODE
# But we ensure it's set here for direct Stripe API calls
# API key is read from environment variables via Django settings
def _get_stripe_api_key():
    """Get Stripe API key from environment variables via settings."""
    if settings.STRIPE_LIVE_MODE:
        api_key = settings.STRIPE_LIVE_SECRET_KEY
        if not api_key:
            logger.warning('STRIPE_LIVE_SECRET_KEY is not set in environment variables')
    else:
        api_key = settings.STRIPE_TEST_SECRET_KEY
        if not api_key:
            logger.warning('STRIPE_TEST_SECRET_KEY is not set in environment variables')
    return api_key

# Set Stripe API key at module level (will be None if not configured)
stripe.api_key = _get_stripe_api_key()


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Billing'],
        x_fern_sdk_group_name='billing',
        x_fern_sdk_method_name='get_pricing',
        operation_summary='Get pricing table',
        operation_description='Fetch active pricing tables from Stripe.',
        responses={200: PricingTableSerializer()},
    ),
)
class PricingTableAPI(APIView):
    """API endpoint to fetch active pricing tables from Stripe."""

    permission_classes = [IsAuthenticated]
    permission_required = all_permissions.organizations_view

    def get(self, request):
        """Get active pricing tables."""
        try:
            # Fetch active prices from dj-stripe
            prices = djstripe.models.Price.objects.filter(active=True).select_related('product')

            price_data = []
            for price in prices:
                product = price.product
                price_data.append({
                    'id': price.stripe_id,  # Use Stripe ID for checkout
                    'product_id': product.stripe_id,
                    'product_name': product.name,
                    'amount': price.unit_amount or 0,
                    'currency': price.currency,
                    'interval': price.recurring.interval if price.recurring else None,
                    'interval_count': price.recurring.interval_count if price.recurring else 1,
                    'active': price.active,
                    'description': product.description,
                })

            serializer = PricingTableSerializer({'prices': price_data})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Error fetching pricing table: %s', e)
            return Response({'error': 'Failed to fetch pricing table'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Billing'],
        x_fern_sdk_group_name='billing',
        x_fern_sdk_method_name='create_checkout',
        operation_summary='Create checkout session',
        operation_description='Create a Stripe Checkout session for subscription.',
        request_body=CheckoutSessionSerializer,
        responses={200: CheckoutSessionResponseSerializer()},
    ),
)
class CheckoutSessionAPI(APIView):
    """API endpoint to create Stripe Checkout session."""

    permission_classes = [IsAuthenticated]
    permission_required = all_permissions.organizations_change

    def post(self, request):
        """Create checkout session."""
        serializer = CheckoutSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        organization = request.user.active_organization
        if not organization:
            return Response({'error': 'No active organization'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get or create Stripe customer for organization
            customer = self._get_or_create_customer(organization, request.user)

            # Get price (price_id should be Stripe price ID)
            price_id = serializer.validated_data['price_id']
            try:
                # Try to get by stripe_id first (if passed as Stripe ID)
                price = djstripe.models.Price.objects.get(stripe_id=price_id)
            except djstripe.models.Price.DoesNotExist:
                # Fallback to Django model ID
                price = djstripe.models.Price.objects.get(id=price_id)
                price_id = price.stripe_id

            # Build success and cancel URLs
            success_url = serializer.validated_data.get('success_url')
            cancel_url = serializer.validated_data.get('cancel_url')

            if not success_url:
                success_url = request.build_absolute_uri(reverse('billing-success'))
            if not cancel_url:
                cancel_url = request.build_absolute_uri(reverse('billing-cancel'))

            # Create checkout session using Stripe API directly
            checkout_session = stripe.checkout.Session.create(
                customer=customer.stripe_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,  # Use Stripe price ID
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    'organization_id': str(organization.id),
                },
            )

            # Sync checkout session to database
            checkout_session_obj = djstripe.models.CheckoutSession.sync_from_stripe_data(checkout_session)

            response_serializer = CheckoutSessionResponseSerializer({
                'session_id': checkout_session_obj.stripe_id,
                'url': checkout_session.url,
            })
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except djstripe.models.Price.DoesNotExist:
            return Response({'error': 'Price not found'}, status=status.HTTP_404_NOT_FOUND)
        except stripe.error.StripeError as e:
            logger.exception('Stripe API error creating checkout session: %s', e)
            return Response({'error': f'Stripe error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception('Error creating checkout session: %s', e)
            return Response({'error': 'Failed to create checkout session'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_or_create_customer(self, organization, user):
        """Get or create Stripe customer for organization."""
        try:
            org_customer = OrganizationCustomer.objects.get(organization=organization)
            return org_customer.customer
        except OrganizationCustomer.DoesNotExist:
            # Create customer in Stripe using Stripe API directly
            stripe_customer = stripe.Customer.create(
                email=user.email,
                name=organization.title,
                metadata={
                    'organization_id': str(organization.id),
                },
            )
            # Sync customer to database (dj-stripe handles this automatically)
            customer = djstripe.models.Customer.sync_from_stripe_data(stripe_customer)

            # Link to organization
            OrganizationCustomer.objects.create(organization=organization, customer=customer)
            return customer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Billing'],
        x_fern_sdk_group_name='billing',
        x_fern_sdk_method_name='get_subscription',
        operation_summary='Get subscription status',
        operation_description='Get current organization subscription status.',
        responses={200: SubscriptionStatusSerializer()},
    ),
)
class SubscriptionStatusAPI(APIView):
    """API endpoint to get subscription status."""

    permission_classes = [IsAuthenticated]
    permission_required = all_permissions.organizations_view

    def get(self, request):
        """Get subscription status."""
        organization = request.user.active_organization
        if not organization:
            return Response({'error': 'No active organization'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            org_customer = OrganizationCustomer.objects.get(organization=organization)
            customer = org_customer.customer

            # Get active subscription
            subscriptions = djstripe.models.Subscription.objects.filter(customer=customer, status='active').order_by('-created')
            if subscriptions.exists():
                subscription = subscriptions.first()
                price = subscription.items.first().price if subscription.items.exists() else None
                product = price.product if price else None

                data = {
                    'status': subscription.status,
                    'current_period_start': subscription.current_period_start,
                    'current_period_end': subscription.current_period_end,
                    'cancel_at_period_end': subscription.cancel_at_period_end,
                    'canceled_at': subscription.canceled_at,
                    'plan_name': product.name if product else None,
                    'plan_amount': price.unit_amount if price else None,
                    'plan_currency': price.currency if price else None,
                    'plan_interval': price.recurring.interval if price and price.recurring else None,
                    'has_subscription': True,
                }
            else:
                # Check for other subscription statuses
                all_subscriptions = djstripe.models.Subscription.objects.filter(customer=customer).order_by('-created')
                if all_subscriptions.exists():
                    subscription = all_subscriptions.first()
                    price = subscription.items.first().price if subscription.items.exists() else None
                    product = price.product if price else None

                    data = {
                        'status': subscription.status,
                        'current_period_start': subscription.current_period_start,
                        'current_period_end': subscription.current_period_end,
                        'cancel_at_period_end': subscription.cancel_at_period_end,
                        'canceled_at': subscription.canceled_at,
                        'plan_name': product.name if product else None,
                        'plan_amount': price.unit_amount if price else None,
                        'plan_currency': price.currency if price else None,
                        'plan_interval': price.recurring.interval if price and price.recurring else None,
                        'has_subscription': True,
                    }
                else:
                    data = {
                        'status': None,
                        'current_period_start': None,
                        'current_period_end': None,
                        'cancel_at_period_end': False,
                        'canceled_at': None,
                        'plan_name': None,
                        'plan_amount': None,
                        'plan_currency': None,
                        'plan_interval': None,
                        'has_subscription': False,
                    }

            serializer = SubscriptionStatusSerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except OrganizationCustomer.DoesNotExist:
            data = {
                'status': None,
                'current_period_start': None,
                'current_period_end': None,
                'cancel_at_period_end': False,
                'canceled_at': None,
                'plan_name': None,
                'plan_amount': None,
                'plan_currency': None,
                'plan_interval': None,
                'has_subscription': False,
            }
            serializer = SubscriptionStatusSerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Error fetching subscription status: %s', e)
            return Response({'error': 'Failed to fetch subscription status'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Billing'],
        x_fern_sdk_group_name='billing',
        x_fern_sdk_method_name='get_stripe_config',
        operation_summary='Get Stripe configuration',
        operation_description='Get Stripe publishable key and pricing table ID for frontend.',
        responses={200: StripeConfigSerializer()},
    ),
)
class StripeConfigAPI(APIView):
    """API endpoint to get Stripe configuration for frontend."""

    permission_classes = [IsAuthenticated]
    permission_required = all_permissions.organizations_view

    def get(self, request):
        """Get Stripe configuration."""
        try:
            # Determine publishable key based on live mode
            if settings.STRIPE_LIVE_MODE:
                publishable_key = settings.STRIPE_LIVE_PUBLISHABLE_KEY
            else:
                publishable_key = settings.STRIPE_TEST_PUBLISHABLE_KEY

            # Get customer information for the current user's organization
            customer_email = request.user.email if request.user.is_authenticated else None
            customer_id = None

            organization = request.user.active_organization
            if organization:
                try:
                    org_customer = OrganizationCustomer.objects.get(organization=organization)
                    customer_id = org_customer.customer.stripe_id
                except OrganizationCustomer.DoesNotExist:
                    # No existing customer for this organization
                    pass

            config_data = {
                'publishable_key': publishable_key,
                'pricing_table_id': settings.STRIPE_PRICING_TABLE_ID,
                'customer_email': customer_email,
                'customer_id': customer_id,
            }

            serializer = StripeConfigSerializer(config_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Error fetching Stripe config: %s', e)
            return Response({'error': 'Failed to fetch Stripe config'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

