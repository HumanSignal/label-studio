from functools import wraps


def permission_required(*permissions, fn=None):
    def decorator(view):
        def wrapped_view(self, request, *args, **kwargs):

            if callable(fn):
                obj = fn(request, *args, **kwargs)
            else:
                obj = fn

            missing_permissions = [perm for perm in permissions if not request.user.has_perm(perm, obj)]
            if any(missing_permissions):
                # raises a permission denied exception causing a 403 response
                self.permission_denied(
                    request, message=('Permission denied: {}'.format(', '.join(missing_permissions)))
                )

            return view(self, request, *args, **kwargs)

        return wrapped_view

    return decorator


def override_report_only_csp(view_func):
    """
    Decorator to switch report-only CSP to regular CSP. For use with core.middleware.HumanSignalCspMiddleware.
    """

    @wraps(view_func)
    def wrapper(*args, **kwargs):
        response = view_func(*args, **kwargs)
        setattr(response, '_override_report_only_csp', True)
        return response

    return wrapper
