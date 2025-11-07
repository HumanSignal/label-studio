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
        self.ordering = ('-id',)
        self.actions = ['run_scheduled_migrations']

    def _mark_migration_error(self, migration, error_message):
        """Helper to mark migration as ERROR with error message in meta."""
        meta = migration.meta or {}
        meta['error'] = error_message
        migration.meta = meta
        migration.status = migration.STATUS_ERROR
        migration.save()

    def run_scheduled_migrations(self, request, queryset):
        """Run selected scheduled migrations manually.

        Expects AsyncMigrationStatus.name in one of forms:
        - "<app>:<migration_module>"
        - "<app>.migrations.<migration_module>"
        - Full dotted path "label_studio.<app>.migrations.<migration_module>"

        Does not scan all apps. If app is not provided, marks error.
        """
        import importlib

        from core.migration_helpers import execute_sql_job
        from core.redis import start_job_async_or_sync

        executed_count = 0
        skipped_count = 0
        error_count = 0

        def resolve_import_path(name: str) -> tuple[str | None, str | None]:
            s = (name or '').strip()
            if not s:
                return None, 'Empty migration import path'
            if '.migrations.' not in s:
                return None, 'Migration import path must include ".migrations." (use full dotted path)'
            return s, None

        for migration in queryset:
            if migration.status != migration.STATUS_SCHEDULED:
                skipped_count += 1
                continue

            import_path, err = resolve_import_path(migration.name)
            if err:
                self._mark_migration_error(migration, err)
                error_count += 1
                continue
            try:
                module = importlib.import_module(import_path)
            except Exception as e:
                self._mark_migration_error(migration, f'Import error: {e}')
                error_count += 1
                continue

            sql_fw = getattr(module, 'sql_forwards', None)
            if sql_fw is None:
                self._mark_migration_error(migration, 'sql_forwards not found in migration module')
                error_count += 1
                continue

            try:
                start_job_async_or_sync(
                    execute_sql_job,
                    migration_name=migration.name,
                    sql=sql_fw,
                    reverse=False,
                    queue_name='default',
                )
                migration.status = migration.STATUS_STARTED
                migration.save()
                executed_count += 1
            except Exception as e:
                self._mark_migration_error(migration, str(e))
                error_count += 1

        message = f'Executed: {executed_count}, Skipped: {skipped_count}, Errors: {error_count}'
        if executed_count > 0:
            self.message_user(request, message, level='SUCCESS')
        elif error_count > 0:
            self.message_user(request, message, level='ERROR')
        else:
            self.message_user(request, message, level='WARNING')

    run_scheduled_migrations.short_description = 'Run selected SCHEDULED migrations'


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
