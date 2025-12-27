"""Billing app configuration."""
from django.apps import AppConfig


class BillingConfig(AppConfig):
    """Billing app configuration."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'billing'

    def ready(self):
        """Import webhook handlers to ensure they are registered."""
        # Import webhook handlers to register djstripe_receiver signal handlers
        try:
            import billing.webhooks  # noqa: F401
        except ImportError:
            # webhooks module may not exist or may have import errors
            # This is okay, we'll just skip registration
            pass
