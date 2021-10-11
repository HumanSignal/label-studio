import copy

from rest_framework import serializers


class SerializerOption:
    def __init__(self, data):
        self.data = copy.deepcopy(data)
        self._model_class = None
        self._base_serializer = serializers.ModelSerializer
        self._serializer_class = None
        self._fields = '__all__'
        self._exclude = None
        self._field_options = {}
        self._nested_fields = {}

        if not isinstance(data, dict):
            raise ValueError('Data has to be dict')

        self._serializer_class = self.data.get('serializer_class', None)
        self._model_class = self.data.get('model_class', None)

        if self._serializer_class is None and self._model_class is None:
            raise ValueError('Pass serializer_class or model_class')

        self._base_serializer = self.data.get('base_serializer', serializers.ModelSerializer)

        self._fields = self.data.get('fields', None)
        self._exclude = self.data.get('exclude', None)

        if self._fields and self._exclude:
            raise ValueError("Fields and exclude can't be passed simultaneously")

        if self._exclude is None:
            self._fields = '__all__'

        self._field_options = self.data.get('field_options', {})

        for field_key, field_value in data.get('nested_fields', {}).items():
            self._nested_fields[field_key] = SerializerOption(field_value)

    @property
    def serializer_class(self):
        return self._serializer_class

    @property
    def model_class(self):
        return self._model_class

    @property
    def base_serializer(self):
        return self._base_serializer

    @property
    def fields(self):
        return self._fields

    @property
    def exclude(self):
        return self._exclude

    @property
    def nested_fields(self):
        return self._nested_fields

    @property
    def field_options(self):
        return self._field_options


def generate_serializer(option):
    """
    Return serializer by option object:
    """
    if option.serializer_class:
        ResultClass = option.serializer_class
    else:

        class ResultClass(option.base_serializer):
            class Meta:
                model = option.model_class
                fields = option.fields
                exclude = option.exclude

            def get_fields(self):
                fields = super().get_fields()
                for key, value in option.nested_fields.items():
                    fields[key] = generate_serializer(value)
                return fields

    return ResultClass(**option.field_options)
