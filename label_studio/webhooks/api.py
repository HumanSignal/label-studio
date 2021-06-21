import logging

from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Webhook, WebhookAction
from .serializers import WebhookSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Webhooks'],
        operation_summary='List of webhooks',
        operation_description="List of webhooks of user's active organization."
    )
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Webhooks'],
        operation_summary='Create a webhook',
        operation_description="Create a webhook for user's active organization."
    )
)
class WebhookListAPI(generics.ListCreateAPIView):
    queryset = Webhook.objects.all()
    serializer_class = WebhookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Webhook.objects.filter(organization=self.request.user.active_organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.active_organization)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(tags=['Webhooks'], operation_summary='Get webhook info')
)
@method_decorator(
    name='put',
    decorator=swagger_auto_schema(tags=['Webhooks'], operation_summary='Save webhook info')
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(tags=['Webhooks'], operation_summary='Update webhook info')
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(tags=['Webhooks'], operation_summary='Delete webhook info')
)
class WebhookAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Webhook.objects.all()
    serializer_class = WebhookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Webhook.objects.filter(organization=self.request.user.active_organization)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(tags=['Webhooks'],
                                  operation_summary='Returns description of all webhook actions',
                                  operation_description='Use this information to setup webhooks.',
                                  responses={"200": "Object with description data."},)
)
class WebhookInfoAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        result = {
            key: {
                'name': value['name'],
                'description': value['description'],
                'key': value['key'],
            }
            for key, value in WebhookAction.ACTIONS.items()
        }
        return Response(
            data=result
        )
