"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.conf import settings
from django.contrib.auth.models import Group

from users.models import User
from projects.models import Project
from ml.models import MLBackend, MLBackendTrainJob
from tasks.models import Task, Annotation, Prediction
from organizations.models import Organization, OrganizationMember


class UserAdminShort(UserAdmin):

    add_fieldsets = (
        (None, {'fields': ('email', 'password1', 'password2')}),
    )

    def __init__(self, *args, **kwargs):
        super(UserAdminShort, self).__init__(*args, **kwargs)

        self.list_display = ('email', 'username', 'active_organization', 'organization', 'is_staff', 'is_superuser')
        self.list_filter = ('is_staff', 'is_superuser', 'is_active')
        self.search_fields = ('username', 'first_name', 'last_name', 'email',
                              'organization__title', 'active_organization__title')
        self.ordering = ('email',)

        self.fieldsets = ((None, {'fields': ('password', )}),
                          ('Personal info', {'fields': ('email', 'username', 'first_name', 'last_name')}),
                          ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser',)}),
                          ('Important dates', {'fields': ('last_login', 'date_joined')}))


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
