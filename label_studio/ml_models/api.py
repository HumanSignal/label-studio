from core.label_config import get_all_labels
from core.permissions import ViewClassPermission, all_permissions
from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from ml_models.models import ModelInterface
from ml_models.serializers import ModelInterfaceSerializer
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
    def _build_inputs_payload(self, project):
        parsed_config = project.get_parsed_config()
        # using this to remove duplicate inputs 
        input_map = {}
        for tag in parsed_config:
            for input in parsed_config[tag].get('inputs',[]):
                input_type = input.get('type',None)
                input_name = input.get('value', None)
                if input_type and input_name and f'{input_type}_{input_name}' not in input_map:
                    input_map[f'{input_type}_{input_name}'] = {
                        'type': input_type,
                        'name': input_name
                    }
        return list(input_map.values())

    def _build_classes_payload(self, project):
        labels, _ = get_all_labels(project.label_config)
        return sorted(list(set([
                    label
                    for label_list in labels.values()
                    for label in label_list
                ])))
    
    def get_queryset(self):
        return Project.objects.with_counts(fields = ['total_annotations_number']).filter(organization=self.request.user.active_organization, total_annotations_number__gt=1)
    
    def get(self, *args):
        user_projects = self.get_queryset()
        compatible_project_list = []
        for project in user_projects:
            if self._is_project_compatible(project=project):
                inputs = self._build_inputs_payload(project=project)
                classes = self._build_classes_payload(project=project)
                compatible_project_list.append(
                    {
                        'title': project.title,
                        'id': project.id,
                        'inputs': inputs,
                        'classes' : classes
                    }
                )
        result = {
            "projects" : compatible_project_list
        }
        return Response(result, status=200)