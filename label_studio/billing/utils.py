"""Billing utilities for membership tier detection and usage limit checking."""
import logging

import djstripe
from rest_framework.exceptions import ValidationError

from billing.models import OrganizationCustomer
from projects.models import Project
from tasks.models import Task

logger = logging.getLogger(__name__)

# Membership tier constants
TIER_FREE = 'FREE'
TIER_PLUS = 'PLUS'
TIER_PRO = 'PRO'

# Usage limits per tier
USAGE_LIMITS = {
    TIER_FREE: {
        'max_projects': 1,
        'max_tasks': 1,
    },
    TIER_PLUS: {
        'max_projects': 10,
        'max_tasks': 50,
    },
    TIER_PRO: {
        'max_projects': None,  # Unlimited
        'max_tasks': None,  # Unlimited
    },
}


def _get_product_from_organization(organization):
    """Get the Stripe product for an organization's active subscription.
    
    Args:
        organization: Organization instance
        
    Returns:
        djstripe.models.Product or None: The product if found, None otherwise
    """
    try:
        org_customer = OrganizationCustomer.objects.get(organization=organization)
        customer = org_customer.customer

        # Fetch all subscriptions for this customer
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
            # Use related SubscriptionItem records to derive the current price/product
            subscription_items_qs = subscription.items.all()
            if subscription_items_qs.exists():
                first_item = subscription_items_qs.first()
                if first_item and first_item.price and first_item.price.product:
                    return first_item.price.product

        return None

    except OrganizationCustomer.DoesNotExist:
        return None
    except Exception as e:
        logger.exception(f'Error getting product for organization {organization.id}: {e}')
        return None


def get_membership_tier(organization):
    """Get membership tier for an organization.
    
    Args:
        organization: Organization instance
        
    Returns:
        str: One of TIER_FREE, TIER_PLUS, or TIER_PRO
    """
    product = _get_product_from_organization(organization)
    
    if product:
        product_name = product.name or ''
        
        # Normalize product name (case-insensitive, strip whitespace)
        product_name_normalized = product_name.strip().upper()
        
        # Map product name to tier
        if 'PRO' in product_name_normalized:
            return TIER_PRO
        elif 'PLUS' in product_name_normalized:
            return TIER_PLUS
        elif 'FREE' in product_name_normalized:
            return TIER_FREE
        else:
            # Unknown product name, default to Free with logging
            logger.warning(
                f'Unknown product name "{product_name}" for organization {organization.id}. '
                f'Defaulting to Free tier.'
            )
            return TIER_FREE

    # No subscription or no product found, default to Free tier
    return TIER_FREE


def get_usage_limits(organization):
    """Get usage limits for an organization from Stripe product metadata.
    
    Reads limits from Stripe product metadata with fallback to defaults.
    Expected metadata keys:
    - max_projects: Maximum number of projects (null/empty for unlimited)
    - max_tasks: Maximum number of tasks (null/empty for unlimited)
    - tier: Optional tier identifier (FREE, PLUS, PRO)
    
    Args:
        organization: Organization instance
        
    Returns:
        dict: Dictionary with 'max_projects' and 'max_tasks' keys.
              Values are None for unlimited.
    """
    product = _get_product_from_organization(organization)
    
    if product:
        # Try to get metadata from product
        # dj-stripe stores metadata in stripe_data or as a property
        metadata = {}
        try:
            # Try accessing metadata property directly
            if hasattr(product, 'metadata') and product.metadata:
                metadata = product.metadata
            # Fallback to stripe_data
            elif hasattr(product, 'stripe_data') and product.stripe_data:
                metadata = product.stripe_data.get('metadata', {})
        except Exception as e:
            logger.warning(f'Error accessing product metadata for organization {organization.id}: {e}')
        
        # Parse limits from metadata
        if metadata:
            result = {}
            metadata_used = False
            
            # Parse max_projects from metadata
            if 'max_projects' in metadata:
                metadata_used = True
                max_projects = metadata.get('max_projects')
                if isinstance(max_projects, str):
                    max_projects = int(max_projects) if max_projects.lower() not in ('null', 'none', 'unlimited', '') else None
                elif max_projects == '':
                    max_projects = None
                result['max_projects'] = max_projects
            
            # Parse max_tasks from metadata
            if 'max_tasks' in metadata:
                metadata_used = True
                max_tasks = metadata.get('max_tasks')
                if isinstance(max_tasks, str):
                    max_tasks = int(max_tasks) if max_tasks.lower() not in ('null', 'none', 'unlimited', '') else None
                elif max_tasks == '':
                    max_tasks = None
                result['max_tasks'] = max_tasks
            
            # If we found any metadata keys, use them (fill missing ones from fallback)
            if metadata_used:
                # Get fallback values for any missing keys
                tier = get_membership_tier(organization)
                fallback_limits = USAGE_LIMITS.get(tier, USAGE_LIMITS[TIER_FREE])
                result.setdefault('max_projects', fallback_limits['max_projects'])
                result.setdefault('max_tasks', fallback_limits['max_tasks'])
                return result
    
    # Fallback to hardcoded defaults based on tier
    tier = get_membership_tier(organization)
    return USAGE_LIMITS.get(tier, USAGE_LIMITS[TIER_FREE])


def check_project_limit(organization):
    """Check if organization can create a new project.
    
    Args:
        organization: Organization instance
        
    Returns:
        tuple: (current_count, max_count, can_create)
               - current_count: Current number of projects
               - max_count: Maximum allowed projects (None for unlimited)
               - can_create: Boolean indicating if a new project can be created
    """
    limits = get_usage_limits(organization)
    max_projects = limits['max_projects']
    
    # Count current projects for this organization
    current_count = Project.objects.filter(organization=organization).count()
    
    # Check if unlimited (Pro tier)
    if max_projects is None:
        return current_count, None, True
    
    # Check if at or over limit
    can_create = current_count < max_projects
    
    return current_count, max_projects, can_create


def check_task_limit(organization, additional_tasks=0):
    """Check if organization can import additional tasks.
    
    Args:
        organization: Organization instance
        additional_tasks: Number of tasks to be imported (default: 0)
        
    Returns:
        tuple: (current_count, max_count, can_import)
               - current_count: Current number of tasks across all projects
               - max_count: Maximum allowed tasks (None for unlimited)
               - can_import: Boolean indicating if tasks can be imported
    """
    limits = get_usage_limits(organization)
    max_tasks = limits['max_tasks']
    
    # Count current tasks across all projects in this organization
    current_count = Task.objects.filter(project__organization=organization).count()
    
    # Check if unlimited (Pro tier)
    if max_tasks is None:
        return current_count, None, True
    
    # Check if adding tasks would exceed limit
    can_import = (current_count + additional_tasks) <= max_tasks
    
    return current_count, max_tasks, can_import


def validate_project_creation(organization):
    """Validate that organization can create a new project.
    
    Args:
        organization: Organization instance
        
    Raises:
        ValidationError: If project limit would be exceeded
    """
    current_count, max_count, can_create = check_project_limit(organization)
    
    if not can_create:
        tier = get_membership_tier(organization)
        tier_name = tier.capitalize()
        
        if max_count is None:
            # Should not happen, but handle gracefully
            raise ValidationError('Unable to determine project limit.')
        
        error_msg = (
            f'Project limit reached. Your {tier_name} plan allows {max_count} project(s), '
            f'and you currently have {current_count}. '
        )
        
        if tier != TIER_PRO:
            error_msg += 'Please upgrade your plan to create more projects.'
        else:
            error_msg += 'Please contact support.'
        
        raise ValidationError(error_msg)


def validate_task_import(organization, additional_tasks):
    """Validate that organization can import additional tasks.
    
    Args:
        organization: Organization instance
        additional_tasks: Number of tasks to be imported
        
    Raises:
        ValidationError: If task limit would be exceeded
    """
    current_count, max_count, can_import = check_task_limit(organization, additional_tasks)
    
    if not can_import:
        tier = get_membership_tier(organization)
        tier_name = tier.capitalize()
        
        if max_count is None:
            # Should not happen, but handle gracefully
            raise ValidationError('Unable to determine task limit.')
        
        would_have = current_count + additional_tasks
        error_msg = (
            f'Task limit would be exceeded. Your {tier_name} plan allows {max_count} task(s), '
            f'you currently have {current_count}, and importing {additional_tasks} would result in {would_have}. '
        )
        
        if tier != TIER_PRO:
            error_msg += 'Please upgrade your plan to import more tasks.'
        else:
            error_msg += 'Please contact support.'
        
        raise ValidationError(error_msg)

