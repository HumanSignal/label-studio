from django.db import models

class OrganizationMixin(models.Model):
    @property
    def active_members(self):
        return self.members
