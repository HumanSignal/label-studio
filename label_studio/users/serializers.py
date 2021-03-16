"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    # short form for user presentation
    initials = serializers.SerializerMethodField(default='?', read_only=True)

    def get_initials(self, user):
        return user.get_initials()

    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'username', 'email', 'last_activity', 'avatar', 'initials', 'phone')


class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email', 'avatar')
