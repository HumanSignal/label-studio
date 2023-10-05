from rest_framework.permissions import BasePermission


class HasObjectPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.has_permission(request.user)


class HasOwnerPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        if (
            not request.user.own_organization
            or obj.active_organization != request.user.active_organization
        ):
            return False
        return obj.has_permission(request.user)
