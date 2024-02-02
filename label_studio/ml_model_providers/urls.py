"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.urls import include, path
from ml_model_providers import api
from rest_framework.routers import DefaultRouter

app_name = 'model-provider-connections'
router = DefaultRouter()
router.register(r'model-provider-connections', api.ModelProviderConnectionAPI, basename='model_provider_connections')

urlpatterns = [
    path('api/', include((router.urls, app_name), namespace='api')),
    path(f'api/{app_name}/provider-choices', api.ModelProviderChoicesAPI.as_view(), name='model-provider-choices'),
]
