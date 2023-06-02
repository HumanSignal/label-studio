from rest_framework.permissions import BasePermission
from pydantic import BaseModel


class HasObjectPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        try:
            if getattr(obj, "has_permission"):
                return obj.has_permission(request.user)
            else:
                return True
        except AttributeError:
            return True
    
    def has_permission(self, request, view):
        # 根据view定义的
        if isinstance(view.permission_required, BaseModel):
            try:
                perm = getattr(view.permission_required, request.method)
            except AttributeError:
                return True
        else:
            perm = view.permission_required
        if not perm:
            return True
        return request.user.has_perm(perm)
