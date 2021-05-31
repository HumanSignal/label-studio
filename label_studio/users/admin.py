"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from ml.models import MLBackend
from ml.models import MLBackendTrainJob
from organizations.models import Organization
from projects.models import Project
from tasks.models import Annotation
from tasks.models import Task
from users.models import User


class UserAdminShort(UserAdmin):
    def __init__(self, *args, **kwargs):
        super(UserAdminShort, self).__init__(*args, **kwargs)

        # we have empty username - remove it to escape confuse about empty fields in admin web
        # self.list_display = [l for l in self.list_display if l != 'username']
        self.list_display = ["email", "username", "password"]

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

        self.add_fieldsets = (
            (
                None,
                {
                    "classes": ("wide",),
                    "fields": ("email", "username", "password1", "password2"),
                },
            ),
        )


admin.site.register(User, UserAdminShort)
admin.site.register(Project)
admin.site.register(MLBackend)
admin.site.register(MLBackendTrainJob)
admin.site.register(Task)
admin.site.register(Annotation)
admin.site.register(Organization)
# remove unused django groups
admin.site.unregister(Group)
