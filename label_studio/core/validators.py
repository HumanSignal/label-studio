import django
import jsonschema
from django.core.validators import BaseValidator


class JSONSchemaValidator(BaseValidator):
    def compare(self, input, schema):  # type: ignore[no-untyped-def]
        try:
            jsonschema.validate(input, schema)
        except jsonschema.exceptions.ValidationError:
            raise django.core.exceptions.ValidationError(
                '%(value)s failed JSON schema check', params={'value': input}
            )
