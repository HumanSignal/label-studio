import drf_yasg.openapi as openapi

from core.permissions import ViewClassPermission, all_permissions
from django.conf import settings
from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from ml_models.models import ModelInterface, ThirdPartyModelVersion
from ml_models.serializers import ModelInterfaceSerializer, ThirdPartyModelVersionSerializer
from projects.models import Project
from rest_framework import generics, viewsets
from rest_framework.response import Response


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


@method_decorator(
    name='list',
    decorator=swagger_auto_schema(
        tags=['Models: Model Versions'],
        operation_summary='List third-party model versions',
        operation_description='List all third-party versions of a model.',
        manual_parameters=[
            openapi.Parameter(
                name='model_id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_QUERY,
                required=True,
                description='A unique integer value identifying the model ID to list versions for.',
            ),
        ],

    ),
)
@method_decorator(
    name='create',
    decorator=swagger_auto_schema(
        tags=['Models: Model Versions'],
        operation_summary='Create third-party model version',
        operation_description='Create a new third-party version of a model.',
    ),
)
@method_decorator(
    name='retrieve',
    decorator=swagger_auto_schema(
        tags=['Models: Model Versions'],
        operation_summary='Get third-party model version',
        operation_description='Retrieve a specific third-party version of a model.',
    ),
)
@method_decorator(
    name='update',
    decorator=swagger_auto_schema(
        tags=['Models: Model Versions'],
        operation_summary='Put third-party model version',
        operation_description='Overwrite a specific third-party model version by ID.',
    ),
)
@method_decorator(
    name='partial_update',
    decorator=swagger_auto_schema(
        tags=['Models: Model Versions'],
        operation_summary='Update third-party model version',
        operation_description='Update a specific third-party model version by ID.',
    ),
)
@method_decorator(
    name='destroy',
    decorator=swagger_auto_schema(
        tags=['Models: Model Versions'],
        operation_summary='Delete third-party model version',
        operation_description='Delete a third-party model version by ID',
    ),
)

class ThirdPartyModelVersionAPI(viewsets.ModelViewSet):
    serializer_class = ThirdPartyModelVersionSerializer
    permission_required = ViewClassPermission( # TODO use same permissions or different? 
        GET=all_permissions.model_interface_view,
        DELETE=all_permissions.model_interface_delete,
        PATCH=all_permissions.model_interface_change,
        PUT=all_permissions.model_interface_change,
        POST=all_permissions.model_interface_create,
    )   

    def get_queryset(self):
        model_interface_pk = self.request.query_params.get('model_id')
        if model_interface_pk is not None:
            model_interface = generics.get_object_or_404(ModelInterface, pk=model_interface_pk)
            model_versions = ThirdPartyModelVersion.objects.filter(parent_model=model_interface.id)
        else:
            model_versions = ThirdPartyModelVersion.objects.filter(organization=self.request.user.active_organization)

        return model_versions

    def perform_create(self, serializer):
        serializer.is_valid(raise_exception=True)

        # we need to save these fields for faster access and filters without excess joins
        serializer.validated_data['organization'] = self.request.user.active_organization
        serializer.validated_data['created_by'] = self.request.user
        serializer.save()


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Models'],
        operation_summary='List projects compatible with model',
        operation_description="""Retrieve a list of compatible project for model."""
    ),
)
class ModelCompatibleProjects(generics.RetrieveAPIView):

    permission_required = all_permissions.projects_view
 
    def _is_project_compatible(self, project):
        parsed_config = project.get_parsed_config()
        if parsed_config:
            for tag in parsed_config:
                if parsed_config[tag].get('type',None) == "Choices":
                    for input in parsed_config[tag].get('inputs',[]):
                        if input.get('type', '') == 'Text':
                            return True
        return False
    
    def get_queryset(self):
        return Project.objects.with_counts(fields = ['total_annotations_number']).filter(organization=self.request.user.active_organization, total_annotations_number__gt=1)
    
    def get(self, *args):
        user_projects = self.get_queryset()
        compatible_project_list = []
        for project in user_projects:
            if self._is_project_compatible(project=project):
                compatible_project_list.append(
                    {
                        'title': project.title,
                        'id': project.id,
                    }
                )
        result = {
            "projects" : compatible_project_list
        }
        return Response(result, status=200)


