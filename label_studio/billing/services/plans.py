# This file and its contents are licensed under the Apache License 2.0. Please see the Apache License 2.0 for more details.

from enum import Enum
from typing import Any, Dict

from .stripe import get_org_subscription_status


class PlanTier(Enum):
    FREE = 'free'
    STANDARD = 'standard'
    PRO = 'pro'


def get_org_plan(organization) -> PlanTier:
    """Determine the current plan tier for an organization."""
    status = get_org_subscription_status(organization)
    plan = (status or {}).get('plan')
    if plan == PlanTier.PRO.value:
        return PlanTier.PRO
    if plan == PlanTier.STANDARD.value:
        return PlanTier.STANDARD
    return PlanTier.FREE


def get_org_limits(organization) -> Dict[str, int]:
    """Get the limits for an organization based on their current plan."""
    plan = get_org_plan(organization)

    if plan == PlanTier.PRO:
        return {'max_projects': 100, 'max_tasks': 50}
    if plan == PlanTier.STANDARD:
        return {'max_projects': 5, 'max_tasks': 50}
    return {'max_projects': 1, 'max_tasks': 2}


def get_org_usage(organization) -> Dict[str, int]:
    """Get the current usage for an organization."""
    # Count projects
    projects_count = organization.projects.count()

    # Count tasks across all projects in the organization
    tasks_count = 0
    for project in organization.projects.all():
        tasks_count += project.tasks.count()

    return {
        'projects_count': projects_count,
        'tasks_count': tasks_count,
    }


def check_org_limits(organization, additional_projects: int = 0, additional_tasks: int = 0) -> Dict[str, bool]:
    """Check if adding additional resources would exceed limits."""
    limits = get_org_limits(organization)
    usage = get_org_usage(organization)

    results = {}

    if limits['max_projects'] is not None:
        results['projects_ok'] = (usage['projects_count'] + additional_projects) <= limits['max_projects']
    else:
        results['projects_ok'] = True

    if limits['max_tasks'] is not None:
        results['tasks_ok'] = (usage['tasks_count'] + additional_tasks) <= limits['max_tasks']
    else:
        results['tasks_ok'] = True

    return results


def get_billing_status(organization) -> Dict[str, Any]:
    """Get complete billing status including plan, limits, usage, and subscription details."""
    try:
        plan = get_org_plan(organization)
        limits = get_org_limits(organization)
        usage = get_org_usage(organization)
        subscription_info = get_org_subscription_status(organization)

        # subscription_info is always a dict with 'subscription' key
        subscription = subscription_info.get('subscription') if isinstance(subscription_info, dict) else None

        # Get Stripe customer ID if it exists (for pricing table)
        stripe_customer_id = None
        try:
            from djstripe.models import Customer
            customer = Customer.objects.filter(subscriber=organization).first()
            if customer:
                stripe_customer_id = customer.id  # This is the Stripe customer ID (e.g., "cus_...")
        except Exception:
            pass  # Ignore if customer doesn't exist

        return {
            'plan': plan.value,
            'limits': limits,
            'usage': usage,
            'subscription': subscription,
            'stripe_customer_id': stripe_customer_id,
        }
    except Exception as e:
        # Log and return safe defaults
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting billing status for org {organization.id}: {e}", exc_info=True)
        # Return free tier as safe default
        return {
            'plan': 'free',
            'limits': {'max_projects': 1, 'max_tasks': 2},
            'usage': {'projects_count': 0, 'tasks_count': 0},
            'subscription': None,
            'stripe_customer_id': None,
        }




