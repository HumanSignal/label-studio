"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from core.models import AsyncMigrationStatus
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from ml.models import MLBackend, MLBackendTrainJob
from organizations.models import Organization, OrganizationMember
from projects.models import Project
from tasks.models import Annotation, Prediction, Task
from users.models import User


class UserAdminShort(UserAdmin):

    add_fieldsets = ((None, {'fields': ('email', 'password1', 'password2')}),)

    def __init__(self, *args, **kwargs):
        super(UserAdminShort, self).__init__(*args, **kwargs)

        self.list_display = (
            'email',
            'username',
            'active_organization',
            'organization',
            'is_staff',
            'is_superuser',
        )
        self.list_filter = ('is_staff', 'is_superuser', 'is_active')
        self.search_fields = (
            'username',
            'first_name',
            'last_name',
            'email',
            'organization__title',
            'active_organization__title',
        )
        self.ordering = ('email',)

        self.fieldsets = (
            (None, {'fields': ('password',)}),
            ('Personal info', {'fields': ('email', 'username', 'first_name', 'last_name')}),
            (
                'Permissions',
                {
                    'fields': (
                        'is_active',
                        'is_staff',
                        'is_superuser',
                    )
                },
            ),
            ('Important dates', {'fields': ('last_login', 'date_joined')}),
        )


class AsyncMigrationStatusAdmin(admin.ModelAdmin):
    def __init__(self, *args, **kwargs):
        super(AsyncMigrationStatusAdmin, self).__init__(*args, **kwargs)

        self.list_display = ('id', 'name', 'project', 'status', 'created_at', 'updated_at', 'meta')
        self.list_filter = ('name', 'status')
        self.search_fields = ('name', 'project__id')
        self.ordering = ('id',)


class OrganizationMemberAdmin(admin.ModelAdmin):
    def __init__(self, *args, **kwargs):
        super(OrganizationMemberAdmin, self).__init__(*args, **kwargs)

        self.list_display = ('id', 'user', 'organization', 'created_at', 'updated_at')
        self.search_fields = ('user__email', 'organization__title')
        self.ordering = ('id',)


admin.site.register(User, UserAdminShort)
admin.site.register(Project)
admin.site.register(MLBackend)
admin.site.register(MLBackendTrainJob)
admin.site.register(Task)
admin.site.register(Annotation)
admin.site.register(Prediction)
admin.site.register(Organization)
admin.site.register(OrganizationMember, OrganizationMemberAdmin)
admin.site.register(AsyncMigrationStatus, AsyncMigrationStatusAdmin)

# remove unused django groups
admin.site.unregister(Group)
