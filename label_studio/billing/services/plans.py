# This file and its contents are licensed under the Apache License 2.0. Please see the Apache License 2.0 for more details.

from enum import Enum
from typing import Dict, Any

from django.db.models import Count
from djstripe.models import Subscription

from .stripe import get_org_subscription_status


class PlanTier(Enum):
    FREE = 'free'
    PRO = 'pro'


def get_org_plan(organization) -> PlanTier:
    """Determine the current plan tier for an organization."""
    status = get_org_subscription_status(organization)
    return PlanTier.PRO if status['plan'] == 'pro' else PlanTier.FREE


def get_org_limits(organization) -> Dict[str, int]:
    """Get the limits for an organization based on their current plan."""
    plan = get_org_plan(organization)

    if plan == PlanTier.PRO:
        # Unlimited for Pro
        return {
            'max_projects': None,  # None means unlimited
            'max_tasks': None,
        }
    else:
        # Free tier limits
        return {
            'max_projects': 1,
            'max_tasks': 20,
        }


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
    plan = get_org_plan(organization)
    limits = get_org_limits(organization)
    usage = get_org_usage(organization)
    subscription_info = get_org_subscription_status(organization)

    return {
        'plan': plan.value,
        'limits': limits,
        'usage': usage,
        'subscription': subscription_info,
    }
