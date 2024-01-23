"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from ml_models import api, views
from django.urls import include, path
from rest_framework.routers import DefaultRouter

app_name = 'ml_models'
router = DefaultRouter()
router.register(r'models', api.ModelInterfaceAPI, basename='models')

urlpatterns = [
    path('api/', include((router.urls, app_name), namespace='api')),
    path('models/', views.model_interfaces_view, name='models-list')
]
