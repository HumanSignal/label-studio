from django.conf import settings
from rest_framework import BasePermission

from label_studio.core.utils.common import load_func

check_permissions_for_storages = load_func(settings.CHECK_PERMISSIONS_FOR_STORAGES)


class StoragePermission(BasePermission):
    """
    Checks if the user has access to the storage apis
    """

    def has_permission(self, request, view):
        return check_permissions_for_storages(request)
