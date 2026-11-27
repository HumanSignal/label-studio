from rest_framework import serializers


class CommaSeparatedListField(serializers.ListField):
    def to_internal_value(self, data):
        if len(data) != 1:
            raise serializers.ValidationError('should not appear more than once in the query string')
        data = data[0].split(',')
        return super().to_internal_value(data)
