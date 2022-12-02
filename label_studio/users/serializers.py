"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from rest_framework import serializers
from rest_flex_fields import FlexFieldsModelSerializer
from django.conf import settings

from .models import User
from core.utils.common import load_func


class BaseUserSerializer(FlexFieldsModelSerializer):
    # short form for user presentation
    initials = serializers.SerializerMethodField(default='?', read_only=True)
    avatar = serializers.SerializerMethodField(read_only=True)
    last_activity = serializers.SerializerMethodField(read_only=True)

    def get_last_activity(self, user):
        if 'request' in self.context and hasattr(self.context['request'], 'user'):
            current_user = self.context['request'].user
            active_org = str(current_user.active_organization.id)
            if active_org in user.last_activity_per_org:
                return user.last_activity_per_org[active_org]
            else:
                return user.last_activity

    def get_avatar(self, user):
        return user.avatar_url

    def get_initials(self, user):
        return user.get_initials()

    def to_representation(self, instance):
        """ Returns user with cache, this helps to avoid multiple s3/gcs links resolving for avatars """

        uid = instance.id
        key = 'user_cache'

        if key not in self.context:
            self.context[key] = {}
        if uid not in self.context[key]:
            self.context[key][uid] = super().to_representation(instance)

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
            'avatar',
            'initials',
            'phone',
            'active_organization',
            'allow_newsletters'
        )


class UserSimpleSerializer(BaseUserSerializer):
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email', 'avatar')


UserSerializer = load_func(settings.USER_SERIALIZER)
