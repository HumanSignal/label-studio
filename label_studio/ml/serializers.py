"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from core.utils.io import validate_upload_url
from django.conf import settings
from ml.models import MLBackend, MLBackendAuth
from rest_framework import serializers


class MLBackendSerializer(serializers.ModelSerializer):
    def validate_url(self, value):
        validate_upload_url(value, block_local_urls=settings.ML_BLOCK_LOCAL_IP)

        return value

    def validate(self, attrs):
        attrs = super(MLBackendSerializer, self).validate(attrs)
        url = attrs['url']
        auth_method = attrs['auth_method']
                        
        if auth_method == MLBackendAuth.BASIC_AUTH:
            if "basic_auth_user" not in attrs or \
               "basic_auth_pass" not in attrs:
                raise serializers.ValidationError(f"When you select Basic Auth you need to provide"
                                                  f"Username and Password parameters")
        
        healthcheck_response = MLBackend.healthcheck_(**attrs)
        
        if healthcheck_response.is_error and healthcheck_response.status_code == 401:
            raise serializers.ValidationError(
                f"Able to connect to ML Server, but "
                f"authentication parameters were either not provided or are incorrect."
            )
        
        if healthcheck_response.is_error:
            raise serializers.ValidationError(
                f"Can't connect to ML backend {url}, health check failed. "
                f'Make sure it is up and your firewall is properly configured. '
                f'<a href="https://labelstud.io/guide/ml.html>Learn more</a>'
                f' about how to set up an ML backend. Additional info:' + healthcheck_response.error_message
            )
        
        setup_response = MLBackend.setup_(**attrs)
        if setup_response.is_error:
            raise serializers.ValidationError(
                f"Successfully connected to {url} but it doesn't look like a valid ML backend. "
                f'Reason: {setup_response.error_message}.\n'
                f'Check the ML backend server console logs to check the status. There might be\n'
                f'something wrong with your model or it might be incompatible with the current labeling configuration.'
            )
        return attrs

    class Meta:
        model = MLBackend
        fields = '__all__'


class MLInteractiveAnnotatingRequest(serializers.Serializer):
    task = serializers.IntegerField(
        help_text='ID of task to annotate',
        required=True,
    )
    context = serializers.JSONField(
        help_text='Context for ML model',
        allow_null=True,
        default=None,
    )
