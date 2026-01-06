"""Billing API views."""
import logging

import djstripe
import stripe
from datetime import datetime, timezone as dt_timezone
from django.conf import settings
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.utils import timezone
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
    CustomerPortalResponseSerializer,
    PriceSerializer,
    PricingTableSerializer,
    StripeConfigSerializer,
    SubscriptionStatusSerializer,
    UsageLimitsSerializer,
)
from billing.utils import check_project_limit, check_task_limit, get_membership_tier, get_usage_limits
from core.permissions import all_permissions
from projects.models import Project
from tasks.models import Task

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
                recurring = price.recurring or {}
                price_data.append({
                    # dj-stripe stores the Stripe object ID in the `id` field
                    'id': price.id,
                    'product_id': product.id,
                    'product_name': product.name,
                    'amount': price.unit_amount or 0,
                    'currency': price.currency,
                    'interval': recurring.get('interval'),
                    'interval_count': recurring.get('interval_count', 1),
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
                # dj-stripe uses `id` for the Stripe Price ID.
                # Allow both Stripe price IDs and local primary keys (djstripe_id).
                try:
                    # Prefer matching by Stripe price ID
                    price = djstripe.models.Price.objects.get(id=price_id)
                except djstripe.models.Price.DoesNotExist:
                    # Fallback to local primary key (e.g. when an internal ID is passed)
                    price = djstripe.models.Price.objects.get(pk=price_id)
                stripe_price_id = price.id
            except (djstripe.models.Price.DoesNotExist, ValueError, TypeError):
                # Normalize lookup errors to Price.DoesNotExist so outer handler can return 404
                raise djstripe.models.Price.DoesNotExist()

            # Build success and cancel URLs
            success_url = serializer.validated_data.get('success_url')
            cancel_url = serializer.validated_data.get('cancel_url')

            if not success_url:
                success_url = request.build_absolute_uri(reverse('billing:billing-success'))
            if not cancel_url:
                cancel_url = request.build_absolute_uri(reverse('billing:billing-cancel'))

            # Create checkout session using Stripe API directly
            checkout_session = stripe.checkout.Session.create(
                # dj-stripe stores Stripe customer ID in `id`
                customer=customer.id,
                payment_method_types=['card'],
                line_items=[{
                    # Use Stripe price ID from dj-stripe model
                    'price': stripe_price_id,
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
                # dj-stripe stores Checkout Session ID in `id`
                'session_id': checkout_session_obj.id,
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

            # Sync customer and subscriptions from Stripe API to ensure we have the latest data
            try:
                # Retrieve and sync customer from Stripe
                stripe_customer = stripe.Customer.retrieve(customer.id)
                djstripe.models.Customer.sync_from_stripe_data(stripe_customer)
                logger.debug(f"Synced customer {customer.id} from Stripe")

                # Retrieve and sync all subscriptions for this customer from Stripe
                stripe_subscriptions = stripe.Subscription.list(customer=customer.id, limit=100)
                for stripe_subscription in stripe_subscriptions.data:
                    djstripe.models.Subscription.sync_from_stripe_data(stripe_subscription)
                logger.debug(f"Synced {len(stripe_subscriptions.data)} subscriptions for customer {customer.id} from Stripe")
            except stripe.error.StripeError as e:
                # If Stripe API call fails, log the error but continue with local data
                logger.warning(f"Failed to sync from Stripe API: {e}. Using local data as fallback.")
            except Exception as e:
                # Catch any other unexpected errors during sync
                logger.warning(f"Unexpected error during Stripe sync: {e}. Using local data as fallback.")

            # Fetch all subscriptions for this customer and evaluate status in Python.
            # dj-stripe stores status in `stripe_data`, so we avoid filtering on a non-existent DB field.
            all_subscriptions_qs = djstripe.models.Subscription.objects.filter(
                customer=customer
            ).order_by('-created')

            subscriptions = list(all_subscriptions_qs)

            # Prefer a valid, current subscription (trialing or active)
            active_subscription = next(
                (s for s in subscriptions if s.is_status_current()),
                None,
            )

            if active_subscription is not None:
                subscription = active_subscription
            elif subscriptions:
                # Fall back to the most recent subscription of any status
                subscription = subscriptions[0]
            else:
                subscription = None

            if subscription is not None:
                # Use related SubscriptionItem records to derive the current price/product.
                subscription_items_qs = subscription.items.all()
                price = None
                product = None
                if subscription_items_qs.exists():
                    first_item = subscription_items_qs.first()
                    if first_item and first_item.price:
                        price = first_item.price
                        product = price.product

                # Convert dj-stripe datetime properties to timezone-aware datetime objects
                # dj-stripe properties can return integers (Unix timestamps) instead of datetime objects
                def to_datetime(value):
                    """Convert integer timestamp or datetime to timezone-aware datetime."""
                    if value is None:
                        return None
                    if isinstance(value, int):
                        # Unix timestamp - convert to datetime
                        return datetime.fromtimestamp(value, tz=dt_timezone.utc)
                    if isinstance(value, datetime):
                        # Already a datetime - ensure timezone-aware
                        if value.tzinfo is None:
                            return timezone.make_aware(value)
                        return value
                    return value

                data = {
                    'status': subscription.status,
                    'current_period_start': to_datetime(subscription.current_period_start),
                    'current_period_end': to_datetime(subscription.current_period_end),
                    'cancel_at_period_end': subscription.cancel_at_period_end,
                    'canceled_at': to_datetime(subscription.canceled_at),
                    'plan_name': product.name if product else None,
                    'plan_amount': price.unit_amount if price else None,
                    'plan_currency': price.currency if price else None,
                    'plan_interval': (
                        price.recurring.get('interval') if price and price.recurring else None
                    ),
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


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Billing'],
        x_fern_sdk_group_name='billing',
        x_fern_sdk_method_name='get_public_stripe_config',
        operation_summary='Get public Stripe configuration',
        operation_description='Get Stripe publishable key and pricing table ID for public pricing page (no authentication required).',
        responses={200: StripeConfigSerializer()},
    ),
)
class PublicStripeConfigAPI(APIView):
    """Public API endpoint to get Stripe configuration for public pricing page."""

    permission_classes = []
    authentication_classes = []

    def get(self, request):
        """Get public Stripe configuration (no authentication required)."""
        try:
            # Determine publishable key based on live mode
            if settings.STRIPE_LIVE_MODE:
                publishable_key = settings.STRIPE_LIVE_PUBLISHABLE_KEY
            else:
                publishable_key = settings.STRIPE_TEST_PUBLISHABLE_KEY

            config_data = {
                'publishable_key': publishable_key,
                'pricing_table_id': settings.STRIPE_PRICING_TABLE_ID,
                'customer_email': None,
                'customer_id': None,
                'customer_session_client_secret': None,
            }

            serializer = StripeConfigSerializer(config_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Error fetching public Stripe config: %s', e)
            return Response({'error': 'Failed to fetch Stripe config'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Billing'],
        x_fern_sdk_group_name='billing',
        x_fern_sdk_method_name='create_customer_portal',
        operation_summary='Create customer portal session',
        operation_description='Create a Stripe billing portal session for managing subscription.',
        responses={200: CustomerPortalResponseSerializer()},
    ),
)
class CustomerPortalAPI(APIView):
    """API endpoint to create Stripe billing portal session."""

    permission_classes = [IsAuthenticated]
    permission_required = all_permissions.organizations_view

    def post(self, request):
        """Create customer portal session."""
        organization = request.user.active_organization
        if not organization:
            return Response({'error': 'No active organization'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get Stripe customer for organization
            org_customer = OrganizationCustomer.objects.get(organization=organization)
            customer = org_customer.customer

            # Build return URL to redirect back to billing page after portal interaction
            return_url = request.build_absolute_uri(reverse('billing:billing-page'))

            # Create billing portal session using Stripe API directly
            portal_session = stripe.billing_portal.Session.create(
                customer=customer.id,
                return_url=return_url,
            )

            response_serializer = CustomerPortalResponseSerializer({
                'url': portal_session.url,
            })
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except OrganizationCustomer.DoesNotExist:
            return Response({'error': 'No customer found for organization'}, status=status.HTTP_404_NOT_FOUND)
        except stripe.error.StripeError as e:
            logger.exception('Stripe API error creating portal session: %s', e)
            return Response({'error': f'Stripe error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception('Error creating portal session: %s', e)
            return Response({'error': 'Failed to create portal session'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Billing'],
        x_fern_sdk_group_name='billing',
        x_fern_sdk_method_name='get_usage_limits',
        operation_summary='Get usage limits',
        operation_description='Get current usage limits and status for the organization. Optionally include project_id to get task count for a specific project.',
        manual_parameters=[
            openapi.Parameter(
                name='project_id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_QUERY,
                description='Optional project ID to get task count for a specific project',
                required=False,
            ),
        ],
        responses={200: UsageLimitsSerializer()},
    ),
)
class UsageLimitsAPI(APIView):
    """API endpoint to get usage limits status."""

    permission_classes = [IsAuthenticated]
    permission_required = all_permissions.organizations_view

    def get(self, request):
        """Get usage limits status."""
        organization = request.user.active_organization
        if not organization:
            return Response({'error': 'No active organization'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tier = get_membership_tier(organization)
            limits = get_usage_limits(organization)
            current_projects, max_projects, can_create_project = check_project_limit(organization)
            current_tasks, max_tasks, can_import_tasks = check_task_limit(organization)

            # Get project task count if project_id is provided
            project_task_count = None
            project_id = request.query_params.get('project_id')
            if project_id:
                try:
                    project = Project.objects.for_user(request.user).get(pk=project_id)
                    project_task_count = Task.objects.filter(project=project).count()
                except Project.DoesNotExist:
                    return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

            data = {
                'tier': tier,
                'current_projects': current_projects,
                'max_projects': max_projects,
                'current_tasks': current_tasks,
                'max_tasks': max_tasks,
                'project_task_count': project_task_count,
                'can_create_project': can_create_project,
                'can_import_tasks': can_import_tasks,
            }

            serializer = UsageLimitsSerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Error fetching usage limits: %s', e)
            return Response({'error': 'Failed to fetch usage limits'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

