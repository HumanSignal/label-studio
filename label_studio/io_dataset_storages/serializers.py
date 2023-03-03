"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
from rest_framework import serializers

from io_dataset_storages.base_models import DatasetStorage


class DatasetStorageSerializer(serializers.ModelSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = DatasetStorage
        fields = '__all__'
