# This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.

import logging

from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services.plans import get_billing_status
from .services.stripe import create_checkout_session, create_customer_portal_session

logger = logging.getLogger(__name__)


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
    """Create a Stripe Checkout session for upgrading to Pro."""
    organization = request.user.active_organization

    if not organization:
        return Response(
            {'error': 'No active organization found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Build success/cancel URLs
        success_url = request.build_absolute_uri(reverse('projects:project-index'))
        cancel_url = request.build_absolute_uri(reverse('projects:project-index'))

        checkout_url = create_checkout_session(organization, success_url, cancel_url)

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
