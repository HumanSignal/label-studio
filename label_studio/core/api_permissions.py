from rest_framework.permissions import SAFE_METHODS, BasePermission


class SuperUserInvitePermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_reset_super_user:
            return False
        return obj.has_permission(request.user)

    def has_permission(self, request, view):
        if not request.user.is_reset_super_user:
            return False
        return True


class SuperUserPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        if ( request.method
            not in SAFE_METHODS and
            not request.user.is_reset_super_user
        ):
            return False
        return obj.has_permission(request.user)

    def has_permission(self, request, view):
        if ( request.method
            not in SAFE_METHODS and
            not request.user.is_reset_super_user
        ):
            return False
        return True


class HasObjectPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.has_permission(request.user)


class MemberHasOwnerPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        if ( request.method
            not in SAFE_METHODS and
            not request.user.own_organization and
            not request.user.is_reset_super_user
        ):
            return False

        return obj.has_permission(request.user)
