"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.urls import include, path
from ml_models.api import ModelCompatibleProjects, ModelInterfaceAPI, ThirdPartyModelVersionAPI
from ml_models.views import model_interfaces_view
from rest_framework.routers import DefaultRouter

app_name = 'ml_models'

router = DefaultRouter()
router.register(r'models', ModelInterfaceAPI, basename='models')
router.register(r'model-versions/third-party', ThirdPartyModelVersionAPI, basename='third-party-model-versions')

_urlpatterns = [
    path('', model_interfaces_view, name='models-list'),
]

_api_model_urlpatterns = [
    path('compatible-projects', ModelCompatibleProjects.as_view(), name='model-compatible-projects-list'),
]

urlpatterns = [
    path('models/', include(_urlpatterns)),
    path('api/', include((router.urls, app_name), namespace='api')),
    path('api/models/', include(_api_model_urlpatterns)),
]
