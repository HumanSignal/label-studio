class OrganizationMixin:
    @property
    def active_members(self):
        return self.members
