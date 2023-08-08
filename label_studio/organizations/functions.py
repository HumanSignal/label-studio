from django.db import transaction

from core.utils.common import temporary_disconnect_all_signals
from organizations.models import Organization, OrganizationMember
from projects.models import Project


def create_organization(title, created_by):  # type: ignore[no-untyped-def]
    with transaction.atomic():
        org = Organization.objects.create(title=title, created_by=created_by)
        OrganizationMember.objects.create(user=created_by, organization=org)
        return org


def destroy_organization(org):  # type: ignore[no-untyped-def]
    with temporary_disconnect_all_signals():  # type: ignore[no-untyped-call]
        Project.objects.filter(organization=org).delete()
        if hasattr(org, 'saml'):
            org.saml.delete()
        org.delete()
