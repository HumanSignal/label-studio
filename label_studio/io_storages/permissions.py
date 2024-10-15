from rest_framework.permissions import BasePermission


class StoragePermission(BasePermission):
    """
    Checks if the user has access to the storage apis
    Default case is always true
    """

    def has_permission(self, request, view):
        return True
