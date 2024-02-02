from core.permissions import ViewClassPermission, all_permissions
from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from ml_model_providers.models import ModelProviderConnection
from ml_model_providers.serializers import ModelProviderConnectionSerializer
from rest_framework import generics, viewsets
from rest_framework.response import Response


@method_decorator(
    name='list',
    decorator=swagger_auto_schema(
        tags=['Model Provider Connection'],
        operation_summary='List model provider connections',
        operation_description='List all model provider connections.',
    ),
)
@method_decorator(
    name='create',
    decorator=swagger_auto_schema(
        tags=['Model Provider Connection'],
        operation_summary='Create model provider connection',
        operation_description='Create a new model provider connection.',
    ),
)
@method_decorator(
    name='retrieve',
    decorator=swagger_auto_schema(
        tags=['Model Provider Connection'],
        operation_summary='Get model provider connection',
        operation_description='Retrieve a specific model provider connection.',
    ),
)
@method_decorator(
    name='update',
    decorator=swagger_auto_schema(
        tags=['Model Provider Connection'],
        operation_summary='Put model provider connection',
        operation_description='Overwrite a specific model provider connection by ID.',
    ),
)
@method_decorator(
    name='partial_update',
    decorator=swagger_auto_schema(
        tags=['Model Provider Connection'],
        operation_summary='Update model provider connection',
        operation_description='Update a specific model provider connection by ID.',
    ),
)
@method_decorator(
    name='destroy',
    decorator=swagger_auto_schema(
        tags=['Model Provider Connection'],
        operation_summary='Delete model provider connection',
        operation_description='Delete a model provider connection by ID',
    ),
)
class ModelProviderConnectionAPI(viewsets.ModelViewSet):
    serializer_class = ModelProviderConnectionSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.model_provider_connection_view,
        DELETE=all_permissions.model_provider_connection_delete,
        PATCH=all_permissions.model_provider_connection_change,
        PUT=all_permissions.model_provider_connection_change,
        POST=all_permissions.model_provider_connection_create,
    )

    def get_queryset(self):
        return ModelProviderConnection.objects.filter(organization_id=self.request.user.active_organization_id)

    def perform_create(self, serializer):
        serializer.is_valid(raise_exception=True)

        # we need to save these fields for faster access and filters without excess joins
        serializer.validated_data['organization'] = self.request.user.active_organization
        serializer.validated_data['created_by'] = self.request.user
        serializer.save()


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Model Provider Connection'],
        operation_summary='List model provider choices',
        operation_description='List all possible model provider choices',
    ),
)
class ModelProviderChoicesAPI(generics.RetrieveAPIView):
    permission_required = all_permissions.model_provider_connection_view

    def get(self, request):
        choices = [choice[0] for choice in ModelProviderConnection.ModelProviders.choices]
        
        return Response({"provider_choices": choices})
