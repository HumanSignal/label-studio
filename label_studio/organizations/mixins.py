class OrganizationMixin:
    @property
    def active_members(self):  # type: ignore[no-untyped-def]
        return self.members  # type: ignore[attr-defined]
