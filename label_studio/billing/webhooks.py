"""Webhook handlers for Stripe events."""
import logging

import stripe
from djstripe.event_handlers import djstripe_receiver
from djstripe.models import Customer, Subscription

from billing.models import OrganizationCustomer

logger = logging.getLogger(__name__)


def _link_customer_to_organization(customer, organization):
    """
    Link a dj-stripe Customer to an Organization.
    
    Args:
        customer: dj-stripe Customer instance
        organization: Organization instance
        
    Returns:
        OrganizationCustomer instance (existing or newly created)
    """
    try:
        # Check if link already exists
        org_customer = OrganizationCustomer.objects.get(organization=organization)
        if org_customer.customer.id != customer.id:
            logger.warning(
                f"Organization {organization.id} already linked to customer {org_customer.customer.id}, "
                f"but checkout used customer {customer.id}"
            )
        return org_customer
    except OrganizationCustomer.DoesNotExist:
        # Check if customer is already linked to a different organization
        existing_link = OrganizationCustomer.objects.filter(customer=customer).first()
        if existing_link:
            logger.warning(
                f"Customer {customer.id} already linked to organization {existing_link.organization.id}, "
                f"but attempting to link to organization {organization.id}"
            )
            return existing_link
        
        # Create new link
        org_customer = OrganizationCustomer.objects.create(
            organization=organization,
            customer=customer
        )
        logger.info(f"Linked customer {customer.id} to organization {organization.id}")
        return org_customer


@djstripe_receiver("checkout.session.completed")
def checkout_session_completed_handler(sender, event, **kwargs):
    """Handle checkout session completed event from pricing table."""
    try:
        # Extract checkout session data
        checkout_session = event.data.get("object", {})
        if not isinstance(checkout_session, dict):
            logger.warning(f"Unexpected checkout session data type: {type(checkout_session)}")
            return
        
        customer_id = checkout_session.get("customer")
        customer_email = checkout_session.get("customer_email")
        subscription_id = checkout_session.get("subscription")
        
        if not customer_id:
            logger.warning("Checkout session completed but no customer ID found")
            return
        
        # Get or sync customer from dj-stripe
        try:
            customer = Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            # Sync customer from Stripe
            stripe_customer = stripe.Customer.retrieve(customer_id)
            customer = Customer.sync_from_stripe_data(stripe_customer)
            logger.info(f"Synced customer {customer_id} from Stripe")
        
        # Try to find organization by customer email
        organization = None
        if customer_email:
            from users.models import User
            try:
                user = User.objects.get(email=customer_email)
                organization = user.active_organization
                if organization:
                    _link_customer_to_organization(customer, organization)
                    logger.info(
                        f"Linked customer {customer_id} to organization {organization.id} "
                        f"via checkout session for user {user.email}"
                    )
                else:
                    logger.warning(f"User {customer_email} has no active organization")
            except User.DoesNotExist:
                logger.warning(f"No user found with email {customer_email} from checkout session")
            except User.MultipleObjectsReturned:
                logger.warning(f"Multiple users found with email {customer_email}")
        
        # Also check metadata for organization_id (if set in pricing table config)
        metadata = checkout_session.get("metadata", {})
        organization_id = metadata.get("organization_id")
        if organization_id:
            from organizations.models import Organization
            try:
                organization = Organization.objects.get(id=organization_id)
                _link_customer_to_organization(customer, organization)
                logger.info(
                    f"Linked customer {customer_id} to organization {organization_id} "
                    f"via checkout session metadata"
                )
            except Organization.DoesNotExist:
                logger.warning(f"Organization {organization_id} from metadata not found")
        
    except Exception as e:
        logger.exception(f"Error handling checkout.session.completed event: {e}")


@djstripe_receiver("customer.subscription.created")
def subscription_created_handler(sender, event, **kwargs):
    """Handle subscription created event."""
    try:
        # In dj-stripe, event is an Event model instance
        # Access the Stripe event data via event.data (which is a dict)
        # event.data["object"] contains the actual object (subscription, invoice, etc.)
        subscription = event.data.get("object", {})
        if not isinstance(subscription, dict):
            logger.warning(f"Unexpected subscription data type: {type(subscription)}")
            return
            
        customer_id = subscription.get("customer")
        subscription_id = subscription.get("id")
        
        if not customer_id:
            logger.warning("Subscription created but no customer ID found")
            return
        
        # Get customer from dj-stripe
        try:
            customer = Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            logger.warning(f"Customer {customer_id} not found in dj-stripe for subscription {subscription_id}")
            return
        
        # Ensure customer is linked to an organization
        try:
            org_customer = OrganizationCustomer.objects.get(customer=customer)
            logger.info(
                f"Subscription {subscription_id} created for customer {customer_id} "
                f"linked to organization {org_customer.organization.id}"
            )
        except OrganizationCustomer.DoesNotExist:
            # Try to link by customer email
            customer_email = customer.email
            if customer_email:
                from users.models import User
                try:
                    user = User.objects.get(email=customer_email)
                    organization = user.active_organization
                    if organization:
                        _link_customer_to_organization(customer, organization)
                        logger.info(
                            f"Linked customer {customer_id} to organization {organization.id} "
                            f"via subscription.created event for user {user.email}"
                        )
                    else:
                        logger.warning(
                            f"Subscription {subscription_id} created for customer {customer_id} "
                            f"but user {customer_email} has no active organization"
                        )
                except User.DoesNotExist:
                    logger.warning(
                        f"Subscription {subscription_id} created for customer {customer_id} "
                        f"but no user found with email {customer_email}"
                    )
                except User.MultipleObjectsReturned:
                    logger.warning(
                        f"Subscription {subscription_id} created for customer {customer_id} "
                        f"but multiple users found with email {customer_email}"
                    )
            else:
                logger.warning(
                    f"Subscription {subscription_id} created for customer {customer_id} "
                    f"but customer has no email and is not linked to an organization"
                )
        
    except Exception as e:
        logger.exception(f"Error handling subscription.created event: {e}")


@djstripe_receiver("customer.subscription.updated")
def subscription_updated_handler(sender, event, **kwargs):
    """Handle subscription updated event."""
    try:
        subscription = event.data.get("object", {})
        if not isinstance(subscription, dict):
            logger.warning(f"Unexpected subscription data type: {type(subscription)}")
            return
            
        customer_id = subscription.get("customer")
        subscription_id = subscription.get("id")
        
        # Ensure customer is linked to an organization (same logic as created)
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
                try:
                    org_customer = OrganizationCustomer.objects.get(customer=customer)
                    logger.info(
                        f"Subscription {subscription_id} updated for customer {customer_id} "
                        f"linked to organization {org_customer.organization.id}"
                    )
                except OrganizationCustomer.DoesNotExist:
                    # Try to link by customer email
                    customer_email = customer.email
                    if customer_email:
                        from users.models import User
                        try:
                            user = User.objects.get(email=customer_email)
                            organization = user.active_organization
                            if organization:
                                _link_customer_to_organization(customer, organization)
                                logger.info(
                                    f"Linked customer {customer_id} to organization {organization.id} "
                                    f"via subscription.updated event for user {user.email}"
                                )
                        except User.DoesNotExist:
                            pass  # Already logged in subscription.created
            except Customer.DoesNotExist:
                logger.warning(f"Customer {customer_id} not found in dj-stripe for subscription {subscription_id}")
        
        logger.info(f"Subscription updated: {subscription_id} for customer {customer_id}")
    except Exception as e:
        logger.exception(f"Error handling subscription.updated event: {e}")


@djstripe_receiver("customer.subscription.deleted")
def subscription_deleted_handler(sender, event, **kwargs):
    """Handle subscription deleted event."""
    try:
        subscription = event.data.get("object", {})
        customer_id = subscription.get("customer") if isinstance(subscription, dict) else None
        
        logger.info(f"Subscription deleted: {subscription.get('id')} for customer {customer_id}")
    except Exception as e:
        logger.exception(f"Error handling subscription.deleted event: {e}")


@djstripe_receiver("invoice.payment_succeeded")
def invoice_payment_succeeded_handler(sender, event, **kwargs):
    """Handle successful invoice payment."""
    try:
        invoice = event.data.get("object", {})
        customer_id = invoice.get("customer") if isinstance(invoice, dict) else None
        subscription_id = invoice.get("subscription") if isinstance(invoice, dict) else None
        
        logger.info(f"Invoice payment succeeded for customer {customer_id}, subscription {subscription_id}")
    except Exception as e:
        logger.exception(f"Error handling invoice.payment_succeeded event: {e}")


@djstripe_receiver("invoice.payment_failed")
def invoice_payment_failed_handler(sender, event, **kwargs):
    """Handle failed invoice payment."""
    try:
        invoice = event.data.get("object", {})
        customer_id = invoice.get("customer") if isinstance(invoice, dict) else None
        subscription_id = invoice.get("subscription") if isinstance(invoice, dict) else None
        
        logger.warning(f"Invoice payment failed for customer {customer_id}, subscription {subscription_id}")
    except Exception as e:
        logger.exception(f"Error handling invoice.payment_failed event: {e}")

