class UserMixin:
    @property
    def is_annotator(self):  # type: ignore[no-untyped-def]
        return False

    def has_permission(self, user):  # type: ignore[no-untyped-def]
        if user.active_organization in self.organizations.all():  # type: ignore[attr-defined]
            return True
        return False
