from core.permissions import ViewClassPermission, all_permissions
from django.utils.decorators import method_decorator
from drf_spectacular.utils import extend_schema
from rest_framework import generics

from .models import SessionTimeoutPolicy
from .serializers import SessionTimeoutPolicySerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Session Policy'],
        summary='Retrieve Session Policy',
        description='Retrieve session timeout policy for the currently active organization.',
        responses={
            200: SessionTimeoutPolicySerializer,
        },
        extensions={
            'x-fern-sdk-group-name': 'session_policy',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Session Policy'],
        summary='Update Session Policy',
        description='Update session timeout policy for the currently active organization.',
        request=SessionTimeoutPolicySerializer,
        responses={
            200: SessionTimeoutPolicySerializer,
        },
        extensions={
            'x-fern-sdk-group-name': 'session_policy',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
class SessionTimeoutPolicyView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for retrieving and updating organization's session timeout policy
    """

    serializer_class = SessionTimeoutPolicySerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        PATCH=all_permissions.organizations_change,
    )
    http_method_names = ['get', 'patch']  # Explicitly specify allowed methods

    def get_object(self):
        # Get the organization from the request
        org = self.request.user.active_organization
        # Get or create the session policy for the organization
        policy, _ = SessionTimeoutPolicy.objects.get_or_create(organization=org)
        return policy
