from data_manager.user_filter_sources import COLUMN_USER_ID_SOURCES
from rest_framework import serializers
from users.fields import CommaSeparatedListField


class UsersListQuerySerializer(serializers.Serializer):
    project = serializers.IntegerField(required=False, allow_null=True)
    column = serializers.ChoiceField(choices=sorted(COLUMN_USER_ID_SOURCES), required=False)
    page = serializers.IntegerField(required=False, min_value=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100)
    search = serializers.CharField(required=False, allow_blank=True)
    ordering = serializers.CharField(required=False, allow_blank=True)
    selected_value = CommaSeparatedListField(child=serializers.IntegerField(), required=False, default=list)


class ProjectUsersOptionsQuerySerializer(UsersListQuerySerializer):
    project = serializers.IntegerField(required=True)
