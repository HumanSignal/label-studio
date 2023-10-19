class UserMixin:
    @property
    def is_annotator(self):
        return False

    def has_permission(self, user):
        if user.active_organization in self.organizations.filter(organizationmember__deleted_at__isnull=True):
            return True
        return False
