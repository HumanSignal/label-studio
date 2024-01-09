class OrganizationMixin:
    @property
    def active_members(self):
        return self.members


class OrganizationMemberMixin:
    def has_permission(self, user):
        if user.active_organization_id == self.organization_id:
            return True
        return False
