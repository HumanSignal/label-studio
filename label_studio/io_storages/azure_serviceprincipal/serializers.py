"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
from io_storages.azure_serviceprincipal.models import (
    AzureServicePrincipalExportStorage,
    AzureServicePrincipalImportStorage,
    AzureServicePrincipalStorageMixin,
    AzureServicePrincipalImportStorageBase
)
from core.utils.params import get_env

from io_storages.azure_serviceprincipal.utils import set_secured
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError


class AzureServicePrincipalImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default='azure_spi')
    presign = serializers.BooleanField(required=False, default=True)
    is_secured = False
    secure_fields = ['client_secret']

    def get_account_client_secret(self, data=None):
        # fetch value from UI input if provided
        if data:
            if data.get("client_secret", None):
                self.is_secured = True
                return data.get("client_secret")
        self.is_secured = False
        return os.getenv("AZURE_CLIENT_SECRET")


    @property
    def data(self):

        data = super().data
        if not self.is_secured:
            # In case we access data, we need it to be secured.
            data[self.secure_fields[0]] = set_secured(self.get_account_client_secret(data))
            self.is_secured = True
        return data

    class Meta:
        model = AzureServicePrincipalImportStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        for attr in self.secure_fields:
            result.pop(attr)
        return result

    def validate(self, data):
        # We care about encrypting only secure fields
        data[self.secure_fields[0]] = set_secured(self.get_account_client_secret(data))
        self.is_secured = True

        data = super(AzureServicePrincipalImportStorageSerializer, self).validate(data)
        storage = self.instance
        if storage:
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            if 'id' in self.initial_data:
                storage_object = self.Meta.model.objects.get(id=self.initial_data['id'])
                for attr in AzureServicePrincipalImportStorageSerializer.secure_fields:
                    data[attr] = data.get(attr) or getattr(storage_object, attr)
            storage = self.Meta.model(**data)
        try:
            storage.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return data


class AzureServicePrincipalExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default='azure_spi')
    is_secured = False
    secure_fields = ['client_secret']


    def get_account_client_secret(self, data=None):
        # fetch value from UI input if provided
        if data:
            if data.get("client_secret", None):
                self.is_secured = True
                return data.get("client_secret")
        self.is_secured = False
        return os.getenv("AZURE_CLIENT_SECRET")

    def to_representation(self, instance):
        result = super().to_representation(instance)
        for secure_field in AzureServicePrincipalExportStorageSerializer.secure_fields:
            result.pop(secure_field)
        return result

    class Meta:
        model = AzureServicePrincipalExportStorage
        fields = '__all__'

    def validate(self, data):
        # We care about encrypting only secure fields
        # DO SOMETHING BEFORE GETTING FROM get_account_client_secret
        # Get and Set from `data` as best option!
        # set self.client_secret?


        data[self.secure_fields[0]] = set_secured(self.get_account_client_secret(data=data))
        self.is_secured = True
        data = super(AzureServicePrincipalExportStorageSerializer, self).validate(data)
        storage = self.instance
        if storage:
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            if 'id' in self.initial_data:
                storage_object = self.Meta.model.objects.get(id=self.initial_data['id'])
                for attr in self.secure_fields:
                    data[attr] = data.get(attr) or getattr(storage_object, attr)
            storage = self.Meta.model(**data)
        try:
            storage.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return data
