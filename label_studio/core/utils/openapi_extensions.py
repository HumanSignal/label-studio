from django.conf import settings
from drf_yasg.inspectors import SwaggerAutoSchema


class XVendorExtensionsAutoSchema(SwaggerAutoSchema):
    allowed_extensions = tuple([e.replace('-', '_') for e in settings.X_VENDOR_OPENAPI_EXTENSIONS])

    def get_operation(self, operation_keys=None):
        operation = super(XVendorExtensionsAutoSchema, self).get_operation(operation_keys)
        for key, value in self.overrides.items():
            if key.startswith(self.allowed_extensions):
                operation[key.replace('_', '-')] = value
        return operation
