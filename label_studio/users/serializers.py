"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from core.permissions import all_permissions
from core.utils.common import load_func
from django.conf import settings
from rest_flex_fields import FlexFieldsModelSerializer
from rest_framework import serializers
from users.models import User


class BaseUserSerializer(FlexFieldsModelSerializer):
    # short form for user presentation
    initials = serializers.SerializerMethodField(default='?', read_only=True)
    avatar = serializers.SerializerMethodField(read_only=True)
    active_organization_meta = serializers.SerializerMethodField(read_only=True)
    last_activity = serializers.DateTimeField(read_only=True, source='last_activity_cached')

    def get_avatar(self, instance):
        return instance.avatar_url

    def get_initials(self, instance):
        return instance.get_initials(self._is_deleted(instance))

    def get_active_organization_meta(self, instance):
        organization = instance.active_organization
        if organization is None:
            return {'title': '', 'email': ''}

        title = organization.title
        email = ''

        if organization.created_by is not None and organization.created_by.email is not None:
            email = organization.created_by.email

        return {'title': title, 'email': email}

    def _is_deleted(self, instance):
        if 'user' in self.context:
            org_id = self.context['user'].active_organization_id
        elif 'request' in self.context:
            org_id = self.context['request'].user.active_organization_id
        else:
            org_id = None

        if not org_id:
            return False

        # Will use prefetched objects if available
        organization_members = instance.om_through.all()
        organization_member_for_user = next(
            (
                organization_member
                for organization_member in organization_members
                if organization_member.organization_id == org_id
            ),
            None,
        )
        if not organization_member_for_user:
            return True
        return bool(organization_member_for_user.deleted_at)

    def to_representation(self, instance):
        """Returns user with cache, this helps to avoid multiple s3/gcs links resolving for avatars"""

        uid = instance.id
        key = 'user_cache'

        if key not in self.context:
            self.context[key] = {}
        if uid not in self.context[key]:
            self.context[key][uid] = super().to_representation(instance)

        if self._is_deleted(instance):
            for field in ['username', 'first_name', 'last_name', 'email']:
                self.context[key][uid][field] = 'User' if field == 'last_name' else 'Deleted'

        return self.context[key][uid]

    class Meta:
        model = User
        fields = (
            'id',
            'first_name',
            'last_name',
            'username',
            'email',
            'last_activity',
            'custom_hotkeys',
            'avatar',
            'initials',
            'phone',
            'active_organization',
            'active_organization_meta',
            'allow_newsletters',
            'date_joined',
        )


class BaseUserSerializerUpdate(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        read_only_fields = ('email',)


class BaseWhoAmIUserSerializer(BaseUserSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta(BaseUserSerializer.Meta):
        fields = BaseUserSerializer.Meta.fields + ('permissions',)

    def get_permissions(self, user) -> list[str]:
        return [perm for _, perm in all_permissions]


class UserSimpleSerializer(BaseUserSerializer):
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'username', 'email', 'avatar')


class HotkeysSerializer(serializers.Serializer):
    custom_hotkeys = serializers.DictField(required=True)

    # Security: Define dangerous key combinations that should be blocked
    DANGEROUS_KEY_COMBINATIONS = [
        'ctrl+alt+delete',
        'cmd+alt+escape',
        'alt+f4',
        'ctrl+alt+esc',
        'cmd+option+esc',
        'ctrl+shift+esc',
        'cmd+shift+q',
        'alt+tab',
        'cmd+tab',
        'ctrl+alt+t',
        'cmd+space',  # Common system shortcuts
    ]

    # Limit maximum number of custom hotkeys to prevent abuse
    MAX_HOTKEYS = 200

    def validate_custom_hotkeys(self, custom_hotkeys):
        """
        Validates the hotkey format and enforces security constraints.
        Expected format: {"section:action": {"key": "key_combination", "active": boolean}}
        The "active" field is optional and defaults to true.
        """
        if not isinstance(custom_hotkeys, dict):
            raise serializers.ValidationError('custom_hotkeys must be a dictionary')

        # Security: Limit the number of hotkeys
        if len(custom_hotkeys) > self.MAX_HOTKEYS:
            raise serializers.ValidationError(f'Cannot define more than {self.MAX_HOTKEYS} custom hotkeys')

        for action_key, hotkey_data in custom_hotkeys.items():
            # Validate action key format (section:action)
            if not isinstance(action_key, str) or not action_key:
                raise serializers.ValidationError(f"Action key '{action_key}' must be a non-empty string")

            # Security: Limit action key length
            if len(action_key) > 100:
                raise serializers.ValidationError(f"Action key '{action_key}' is too long (max 100 characters)")

            # Check if the action key follows the section:action format
            if ':' not in action_key:
                raise serializers.ValidationError(f"Action key '{action_key}' must be in 'section:action' format")

            section, action = action_key.split(':', 1)

            # Validate section and action parts
            if not section.strip() or not action.strip():
                raise serializers.ValidationError(
                    f"Action key '{action_key}' must have non-empty section and action parts"
                )

            # Validate hotkey data format
            if not isinstance(hotkey_data, dict):
                raise serializers.ValidationError(f"Hotkey data for '{action_key}' must be a dictionary")

            # Check for key in hotkey data
            if 'key' not in hotkey_data:
                raise serializers.ValidationError(f"Missing 'key' in hotkey data for '{action_key}'")

            key_combo = hotkey_data['key']

            # Get active status, default to True if not specified
            active = hotkey_data.get('active', True)

            # Validate key combination
            if not isinstance(key_combo, str) or not key_combo:
                raise serializers.ValidationError(f"Key combination for '{action_key}' must be a non-empty string")

            # Security: Limit key combination length
            if len(key_combo) > 50:
                raise serializers.ValidationError(
                    f"Key combination for '{action_key}' is too long (max 50 characters)"
                )

            # Security: Check for dangerous key combinations
            normalized_key = key_combo.lower().strip()
            if normalized_key in self.DANGEROUS_KEY_COMBINATIONS:
                raise serializers.ValidationError(f"Key combination '{key_combo}' is not allowed for security reasons")

            # Validate active flag if provided
            if 'active' in hotkey_data and not isinstance(active, bool):
                raise serializers.ValidationError(f"Active flag for '{action_key}' must be a boolean")

            # Security: Validate key combination format (basic check)
            self._validate_key_format(key_combo, action_key)

        return custom_hotkeys

    def _validate_key_format(self, key_combo, action_key):
        """
        Basic validation of key combination format for security.
        Prevents injection of malicious characters.
        """
        # Allow only alphanumeric, common modifier keys, and basic symbols
        import re

        # Allow letters, numbers, common modifiers, and basic symbols
        allowed_pattern = re.compile(r'^[a-zA-Z0-9\+\-\s\[\]\\;\'\".,/`~!@#$%^&*()_={}|:<>?]+$')

        if not allowed_pattern.match(key_combo):
            raise serializers.ValidationError(
                f"Key combination '{key_combo}' for '{action_key}' contains invalid characters"
            )

        # Validate modifier key format (basic check)
        parts = [part.strip() for part in key_combo.split('+')]
        valid_modifiers = ['ctrl', 'cmd', 'command', 'alt', 'option', 'shift', 'meta']

        for part in parts[:-1]:  # All parts except the last should be modifiers or valid keys
            if part.lower() not in valid_modifiers and len(part) > 20:
                raise serializers.ValidationError(f"Invalid modifier or key '{part}' in key combination '{key_combo}'")


UserSerializer = load_func(settings.USER_SERIALIZER)
WhoAmIUserSerializer = load_func(settings.WHOAMI_USER_SERIALIZER)
UserSerializerUpdate = load_func(settings.USER_SERIALIZER_UPDATE)
