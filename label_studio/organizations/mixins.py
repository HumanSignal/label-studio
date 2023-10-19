class OrganizationMixin:
    @property
    def active_members(self):
        return self.members


class OrganizationMemberMixin:
    def has_permission(self, user):
        if user.active_organization in self.organizations.filter(organizationmember__deleted_at__isnull=True):
            return True
        return False
