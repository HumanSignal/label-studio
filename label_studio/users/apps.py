"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.apps import AppConfig


class UsersConfig(AppConfig):
    name = 'users'
    default = True

    def ready(self):
        from django.contrib.auth.signals import user_logged_in
        from users.functions.last_activity import stamp_last_activity_on_login

        # Stamp last_activity on login synchronously (DB write now, not Redis-batched).
        user_logged_in.connect(stamp_last_activity_on_login, dispatch_uid='users.stamp_last_activity_on_login')
