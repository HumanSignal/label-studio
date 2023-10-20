from rest_framework.permissions import BasePermission


class HasObjectPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.has_permission(request.user)


class MemberHasOwnerPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method == 'DELETE' and not request.user.own_organization:
            return False

        return obj.has_permission(request.user)
