from django.db import transaction

from core.utils.disable_signals import DisableSignals
from organizations.models import Organization, OrganizationMember
from projects.models import Project


def create_organization(title, created_by):
    with transaction.atomic():
        org = Organization.objects.create(title=title, created_by=created_by)
        OrganizationMember.objects.create(user=created_by, organization=org)
        return org


def destroy_organization(org):
    with DisableSignals():
        Project.objects.filter(organization=org).delete()
        org.delete()
