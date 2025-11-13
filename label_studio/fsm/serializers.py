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
    created_at = serializers.DateTimeField(read_only=True)
    context_data = serializers.JSONField(read_only=True)
