from rest_framework.permissions import BasePermission


class ProjectImportPermission(BasePermission):
    """
    Checks if the user has access to the project import API
    Default case is always true
    """

    def has_permission(self, request, view):
        return True
