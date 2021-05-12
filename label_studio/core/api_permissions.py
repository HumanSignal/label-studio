from rest_framework.permissions import BasePermission


class HasObjectPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.has_permission(request.user)
