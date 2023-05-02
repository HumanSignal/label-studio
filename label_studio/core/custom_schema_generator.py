from django.utils.encoding import force_text
from drf_yasg.inspectors import SwaggerAutoSchema
from drf_yasg.generators import OpenAPISchemaGenerator
from rest_framework.versioning import AcceptHeaderVersioning
from core.api_versioning import VersionedAPIView


class CustomSwaggerAutoSchema(SwaggerAutoSchema):
    def get_operation_id(self, operation_keys):
        operation_id = super().get_operation_id(operation_keys)
        version = getattr(self.view.version_instance if isinstance(
            self.view, VersionedAPIView) else self.view, 'version', None)
        if version:
            operation_id = f"{operation_id}_v{version}"
        return operation_id

    def get_tags(self, operation_keys):
        tags = super().get_tags(operation_keys)
        version = getattr(self.view.version_instance if isinstance(
            self.view, VersionedAPIView) else self.view, 'version', None)
        if version:
            tags = [f"{tag} (v{version})" for tag in tags]
        return tags

    # def get_request_headers(self):
    #     headers = super().get_request_headers()
    #     view = self.view

    #     if isinstance(view.versioning_class, AcceptHeaderVersioning):
    #         version_param = view.versioning_class.version_param
    #         header_name = force_text(view.versioning_class.default_version)
    #         headers[version_param] = header_name

    #     print("--------------------------------------- CUSTOM GET_REQUEST_HEADERS ------------------------------------------------------------")
    #     print(headers)

    #     return headers


class CustomOpenAPISchemaGenerator(OpenAPISchemaGenerator):
    def get_swagger_auto_schema(self, view, *args, **kwargs):
        print("--------------------------------------- CUSTOM OPENAPI ------------------------------------------------------------")
        return CustomSwaggerAutoSchema(view, *args, **kwargs)
