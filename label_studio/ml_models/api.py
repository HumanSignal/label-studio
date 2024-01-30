from core.permissions import ViewClassPermission, all_permissions
from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from ml_models.models import ModelInterface
from ml_models.serializers import ModelInterfaceSerializer
from rest_framework import viewsets


@method_decorator(
    name='list',
    decorator=swagger_auto_schema(
        tags=['Models'],
        operation_summary='List models',
        operation_description='List all models.',
    ),
)
@method_decorator(
    name='create',
    decorator=swagger_auto_schema(
        tags=['Models'],
        operation_summary='Create model',
        operation_description='Create a new model.',
    ),
)
@method_decorator(
    name='retrieve',
    decorator=swagger_auto_schema(
        tags=['Models'],
        operation_summary='Get model',
        operation_description='Retrieve a specific model.',
    ),
)
@method_decorator(
    name='update',
    decorator=swagger_auto_schema(
        tags=['Models'],
        operation_summary='Put model',
        operation_description='Overwrite a specific model by ID.',
    ),
)
@method_decorator(
    name='partial_update',
    decorator=swagger_auto_schema(
        tags=['Models'],
        operation_summary='Update model',
        operation_description='Update a specific model by ID.',
    ),
)
@method_decorator(
    name='destroy',
    decorator=swagger_auto_schema(
        tags=['Models'],
        operation_summary='Delete model',
        operation_description='Delete a model by ID',
    ),
)
class ModelInterfaceAPI(viewsets.ModelViewSet):
    serializer_class = ModelInterfaceSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.model_interface_view,
        DELETE=all_permissions.model_interface_delete,
        PATCH=all_permissions.model_interface_change,
        PUT=all_permissions.model_interface_change,
        POST=all_permissions.model_interface_create,
    )

    def get_queryset(self):
        return ModelInterface.objects.filter(organization_id=self.request.user.active_organization_id)

    def perform_create(self, serializer):
        serializer.is_valid(raise_exception=True)

        # we need to save these fields for faster access and filters without excess joins
        serializer.validated_data['organization'] = self.request.user.active_organization
        serializer.validated_data['created_by'] = self.request.user
        serializer.save()
