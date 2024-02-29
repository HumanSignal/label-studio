from rest_framework import BasePermission


class StoragePermission(BasePermission):
    """
    Checks if the user has access to the storage apis
    Default case is always true
    """

    def has_permission(self, request, view):
        return True
