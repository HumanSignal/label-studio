"""Admin configuration for billing app."""
from django.contrib import admin

from billing.models import OrganizationCustomer


@admin.register(OrganizationCustomer)
class OrganizationCustomerAdmin(admin.ModelAdmin):
    """Admin interface for OrganizationCustomer."""

    list_display = ('organization', 'customer', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('organization__title', 'customer__id')
    readonly_fields = ('created_at', 'updated_at')

