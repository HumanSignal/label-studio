from rest_framework import serializers
from users.serializers import UserSerializer


class TriggeredBySerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        fields = ['id', 'email']


class StateModelSerializer(serializers.Serializer):
    """
    Serializer for FSM state models.

    Uses Serializer instead of ModelSerializer because BaseState is abstract.
    Works with any concrete state model that inherits from BaseState.
    """

    id = serializers.UUIDField(read_only=True)
    state = serializers.CharField(read_only=True)
    previous_state = serializers.CharField(read_only=True, allow_null=True)
    transition_name = serializers.CharField(read_only=True, allow_null=True)
    triggered_by = TriggeredBySerializer(read_only=True, allow_null=True)
    reason = serializers.CharField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    context_data = serializers.JSONField(read_only=True)

    def to_representation(self, instance):
        """
        Override to exclude triggered_by field for annotators.
        """
        data = super().to_representation(instance)

        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            if getattr(user, 'is_annotator', False):
                data.pop('triggered_by', None)

        return data


class FSMTransitionExecuteRequestSerializer(serializers.Serializer):
    """
    Request body serializer for executing a manual FSM transition.
    """

    transition_name = serializers.CharField()
    transition_data = serializers.DictField(required=False, allow_null=True)


class FSMTransitionExecuteResponseSerializer(serializers.Serializer):
    """
    Response serializer for manual FSM transition execution.
    """

    success = serializers.BooleanField(read_only=True)
    new_state = serializers.CharField(read_only=True, allow_null=True)
    state_record = StateModelSerializer(read_only=True, allow_null=True)
