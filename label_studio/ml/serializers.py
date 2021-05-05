"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from rest_framework import serializers
from ml.models import MLBackend


class MLBackendSerializer(serializers.ModelSerializer):

    def validate(self, attrs):
        attrs = super(MLBackendSerializer, self).validate(attrs)
        url = attrs['url']
        if MLBackend.healthcheck_(url).is_error:
            raise serializers.ValidationError("Can't connect to ML backend {url}, health check failed. "
                                              f'Make sure it is up and your firewall is properly configured. '
                                              f'<a href="https://labelstud.io/guide/ml.html>Learn more</a>'
                                              f' about how to set up an ML backend.')
        project = attrs['project']
        setup_response = MLBackend.setup_(url, project)
        if setup_response.is_error:
            raise serializers.ValidationError(
                f"Successfully connected to {url} but it doesn't look like a valid ML backend. "
                f'Reason: {setup_response.error_message}.\n'
                f'Check the ML backend server console logs to check the status. There might be\n'
                f'something wrong with your model or it might be incompatible with the current labeling configuration.')
        return attrs

    class Meta:
        model = MLBackend
        fields = '__all__'
