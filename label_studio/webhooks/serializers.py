from django.conf import settings
from rest_framework import serializers

from .models import Webhook, WebhookAction


class WebhookSerializer(serializers.ModelSerializer):

    actions = serializers.ListField(
        child=serializers.ChoiceField(choices=WebhookAction.ACTIONS),
        default=[],
        source='_actions'
    )

    class Meta:
        model = Webhook
        fields = ('id', 'organization', 'url', 'send_payload',
                  'send_for_all_actions', 'headers', 'is_active', 'actions',
                  'created_at', 'updated_at')
        read_only_fields = ('id', 'organization', 'created_at', 'updated_at')

    def create(self, validated_data):
        actions = validated_data.pop('_actions', [])
        instance = Webhook.objects.create(**validated_data)
        instance.set_actions(actions)
        return instance

    def update(self, instance, validated_data):
        actions = validated_data.pop('_actions', [])
        instance = super().update(instance, validated_data)
        instance.set_actions(actions)
        return instance

    def to_representation(self, instance):
        instance._actions = instance.get_actions()
        return super().to_representation(instance)
