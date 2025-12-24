# This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.

import logging

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services.plans import get_billing_status
from .services.stripe import create_checkout_session, create_customer_portal_session, sync_org_from_stripe

logger = logging.getLogger(__name__)


@login_required
def billing_page(request):
    """Serve the billing page - renders React app template."""
    return render(request, 'billing/billing.html')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def billing_status(request):
    """Get the current billing status for the user's active organization."""
    organization = request.user.active_organization

    if not organization:
        return Response(
            {'error': 'No active organization found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        status_data = get_billing_status(organization)
        return Response(status_data)
    except Exception as e:
        logger.error(f"Failed to get billing status for org {organization.id}: {e}")
        return Response(
            {'error': 'Failed to retrieve billing status'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def create_checkout(request):
    """Create a Stripe Checkout session for upgrading to a paid plan."""
    organization = request.user.active_organization

    if not organization:
        return Response(
            {'error': 'No active organization found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        payload = request.data or {}
        plan = (payload.get('plan') or 'pro').strip().lower()
        interval = (payload.get('interval') or 'monthly').strip().lower()

        if plan not in ('standard', 'pro'):
            return Response({'error': 'Invalid plan. Allowed: standard, pro.'}, status=status.HTTP_400_BAD_REQUEST)
        if interval not in ('monthly', 'yearly'):
            return Response({'error': 'Invalid interval. Allowed: monthly, yearly.'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate Pro subscriptions: if org is already Pro (active/trialing), block Pro checkout
        if plan == 'pro':
            current_status = get_billing_status(organization) or {}
            current_plan = (current_status.get('plan') or '').strip().lower()
            current_sub = current_status.get('subscription') or {}
            current_sub_status = (current_sub.get('status') or '').strip().lower()

            if current_plan == 'pro' and current_sub_status in ('active', 'trialing'):
                portal_url = None
                try:
                    return_url = request.build_absolute_uri(reverse('projects:project-index'))
                    portal_url = create_customer_portal_session(organization, return_url)
                except Exception:
                    # Portal creation can fail due to configuration; still block checkout safely
                    portal_url = None

                return Response(
                    {
                        'error': 'Organization already has an active Pro subscription. Manage or cancel it in the billing portal.',
                        'portal_url': portal_url,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        # Build success/cancel URLs
        success_url = request.build_absolute_uri(reverse('projects:project-index'))
        cancel_url = request.build_absolute_uri(reverse('projects:project-index'))

        checkout_url = create_checkout_session(organization, success_url, cancel_url, plan=plan, interval=interval)

        return Response({'checkout_url': checkout_url})
    except ValueError as e:
        # Configuration / user-actionable error (e.g. missing Stripe price)
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Failed to create checkout for org {organization.id}: {e}")
        return Response(
            {'error': 'Failed to create checkout session'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def create_portal_session(request):
    """Create a Stripe Customer Portal session for managing subscription."""
    organization = request.user.active_organization

    if not organization:
        return Response(
            {'error': 'No active organization found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Build return URL
        return_url = request.build_absolute_uri(reverse('projects:project-index'))

        portal_url = create_customer_portal_session(organization, return_url)

        return Response({'portal_url': portal_url})
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Failed to create portal session for org {organization.id}: {e}")
        return Response(
            {'error': 'Failed to create portal session'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def sync_billing_status(request):
    """Sync billing status from Stripe API and return refreshed status."""
    organization = request.user.active_organization

    if not organization:
        return Response(
            {'error': 'No active organization found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Sync from Stripe API (this updates local dj-stripe models)
        # sync_org_from_stripe returns subscription status, but we need full billing status
        sync_org_from_stripe(organization)
        # Get the full billing status after sync
        from .services.plans import get_billing_status
        status_data = get_billing_status(organization)
        return Response(status_data)
    except ValueError as e:
        # User-actionable error (e.g. Stripe API error)
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Failed to sync billing status for org {organization.id}: {e}")
        return Response(
            {'error': 'Failed to sync billing status from Stripe'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
