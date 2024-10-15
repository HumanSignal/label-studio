from organizations.models import OrganizationMember


class UserMixin:
    @property
    def is_annotator(self):
        return False

    def is_project_annotator(self, project):
        return False

    def has_permission(self, user):
        return OrganizationMember.objects.filter(
            user=user, organization=user.active_organization, deleted_at__isnull=True
        ).exists()
