"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from functools import wraps

from rest_framework import status
from rest_framework.response import Response


def admin_only(view_func):
    """
    Decorator to restrict API access to admin users only.
    Works with both function-based views and class-based view methods.
    
    Usage:
        @admin_only
        def my_view(request):
            ...
        
        # For class-based views:
        @admin_only
        def post(self, request):
            ...
    
    Returns 403 Forbidden if user is not an admin.
    """
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        # Handle both function-based views (request is first arg)
        # and class-based views (self is first arg, request is second)
        if len(args) > 0:
            if hasattr(args[0], 'user'):
                # Function-based view: first arg is request
                request = args[0]
            elif len(args) > 1 and hasattr(args[1], 'user'):
                # Class-based view: second arg is request
                request = args[1]
            else:
                return Response(
                    {'detail': 'Invalid request'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            return Response(
                {'detail': 'Invalid request'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user has admin role
        user_role = getattr(request.user, 'role', 'annotator')
        if user_role != 'admin':
            return Response(
                {'detail': 'Permission denied. Admin role required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return view_func(*args, **kwargs)
    
    return wrapper


def admin_only_method(method):
    """
    Decorator for ViewSet methods to restrict access to admin users only.
    
    Usage:
        class MyViewSet(viewsets.ModelViewSet):
            @admin_only_method
            def create(self, request):
                ...
    
    Returns 403 Forbidden if user is not an admin.
    """
    @wraps(method)
    def wrapper(self, request, *args, **kwargs):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user has admin role
        user_role = getattr(request.user, 'role', 'annotator')
        if user_role != 'admin':
            return Response(
                {'detail': 'Permission denied. Admin role required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return method(self, request, *args, **kwargs)
    
    return wrapper
