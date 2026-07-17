from core.utils.io import validate_url_for_ssrf
from django.conf import settings
from rest_framework import serializers

from .models import Webhook, WebhookAction


class WebhookSerializer(serializers.ModelSerializer):
    actions = serializers.ListField(
        child=serializers.ChoiceField(choices=WebhookAction.ACTIONS), default=[], source='_actions'
    )
    # Declared explicitly (rather than inferred from the model) so the schema stays a plain
    # non-nullable integer: the model field is null=True only for blue-green migration safety,
    # but db_default=0 means a value is always returned.
    consecutive_failures = serializers.IntegerField(read_only=True)

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
            'consecutive_failures',
            'actions',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'organization', 'created_at', 'updated_at')

    def validate_url(self, value):
        if settings.SSRF_PROTECTION_ENABLED:
            validate_url_for_ssrf(value, block_local_urls=True)
        return value

    def validate(self, attrs):
        actions = attrs.pop('_actions', [])
        instance = Webhook(**attrs)
        instance.validate_actions(actions)
        attrs['_actions'] = actions
        return attrs

    def create(self, validated_data):
        actions = validated_data.pop('_actions', [])
        instance = Webhook.objects.create(**validated_data)
        instance.set_actions(actions)
        return instance

    def update(self, instance, validated_data):
        actions = validated_data.pop('_actions', [])
        # Reset the auto-disable failure counter when a user re-activates the webhook or points it
        # at a new endpoint, so a corrected hook doesn't immediately trip again on stale strikes.
        reactivating = validated_data.get('is_active') and not instance.is_active
        endpoint_changed = ('url' in validated_data and validated_data['url'] != instance.url) or (
            'headers' in validated_data and validated_data['headers'] != instance.headers
        )
        if reactivating or endpoint_changed:
            validated_data['consecutive_failures'] = 0
        instance = super().update(instance, validated_data)
        instance.set_actions(actions)
        return instance

    def to_representation(self, instance):
        instance._actions = instance.get_actions()
        return super().to_representation(instance)


class WebhookSerializerForUpdate(WebhookSerializer):
    """Serializer class for updating webhooks

    Used to forbid updating project field."""

    class Meta(WebhookSerializer.Meta):
        read_only_fields = WebhookSerializer.Meta.read_only_fields + ('project',)
