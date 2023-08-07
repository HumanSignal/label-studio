from django.conf import settings
from rest_framework import serializers

from .models import Webhook, WebhookAction


class WebhookSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]

    actions = serializers.ListField(
        child=serializers.ChoiceField(choices=WebhookAction.ACTIONS), default=[], source='_actions'
    )

    class Meta:
        model = Webhook
        fields = (
            'id',
            'organization',
            'project',
            'url',
            'send_payload',
            'send_for_all_actions',
            'headers',
            'is_active',
            'actions',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'organization', 'created_at', 'updated_at')

    def validate(self, attrs):  # type: ignore[no-untyped-def]
        actions = attrs.pop('_actions', [])
        instance = Webhook(**attrs)
        instance.validate_actions(actions)  # type: ignore[no-untyped-call]
        attrs['_actions'] = actions
        return attrs

    def create(self, validated_data):  # type: ignore[no-untyped-def]
        actions = validated_data.pop('_actions', [])
        instance = Webhook.objects.create(**validated_data)
        instance.set_actions(actions)  # type: ignore[no-untyped-call]
        return instance

    def update(self, instance, validated_data):  # type: ignore[no-untyped-def]
        actions = validated_data.pop('_actions', [])
        instance = super().update(instance, validated_data)
        instance.set_actions(actions)
        return instance

    def to_representation(self, instance):  # type: ignore[no-untyped-def]
        instance._actions = instance.get_actions()
        return super().to_representation(instance)


class WebhookSerializerForUpdate(WebhookSerializer):
    """Serializer class for updating webhooks

    Used to forbid updating project field."""

    class Meta(WebhookSerializer.Meta):
        read_only_fields = WebhookSerializer.Meta.read_only_fields + ('project',)  # type: ignore[assignment]
