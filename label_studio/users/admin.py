"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""  # noqa: E501
from django.conf import settings
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from ml.models import MLBackend, MLBackendTrainJob
from organizations.models import Organization, OrganizationMember
from projects.models import Project
from tasks.models import Annotation, Prediction, Task
from users.models import User


class UserAdminShort(UserAdmin):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # we have empty username - remove it to escape confuse about empty fields in admin web
        self.list_display = [l for l in self.list_display if l != "username"]  # noqa: E741

        self.fieldsets = (
            (None, {"fields": ("password",)}),
            ("Personal info", {"fields": ("first_name", "last_name", "email")}),
            (
                "Permissions",
                {
                    "fields": (
                        "is_active",
                        "is_staff",
                        "is_superuser",
                    )
                },
            ),
            ("Important dates", {"fields": ("last_login", "date_joined")}),
        )


admin.site.register(User, UserAdminShort)
admin.site.register(Project)
admin.site.register(MLBackend)
admin.site.register(MLBackendTrainJob)
admin.site.register(Task)
admin.site.register(Annotation)
admin.site.register(Prediction)
admin.site.register(Organization)
admin.site.register(OrganizationMember)

# remove unused django groups
admin.site.unregister(Group)
