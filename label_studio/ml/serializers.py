"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from rest_framework import serializers
from ml.models import MLBackend


class MLBackendSerializer(serializers.ModelSerializer):

    def validate(self, attrs):
        attrs = super(MLBackendSerializer, self).validate(attrs)
        url = attrs['url']
        if MLBackend.healthcheck_(url).is_error:
            raise serializers.ValidationError(f'Can\'t connect to ML backend {url}. Is it valid? '
                                              f'<a href="https://labelstud.io/guide/ml.html>Read more</a>'
                                              f' how to set up your code as a ML backend')
        project = attrs['project']
        setup_response = MLBackend.setup_(url, project)
        if setup_response.is_error:
            raise serializers.ValidationError(
                f'Successfully connected to {url} but it doesn\'t look like a valid ML backend. '
                f'Reason: {setup_response.error_message}.\n'
                f'Perhaps it\'s better to check ML backend server console logs to see what\'s going on there\n'
                f'(may be something wrong with your model or it is incompatible with current labeling configuration?)')
        return attrs

    class Meta:
        model = MLBackend
        fields = '__all__'
