"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.urls import path, include

from . import api

app_name = 'ml'

# ML backend CRUD
_api_urlpatterns = [
    # All storages
    path('', api.MLBackendListAPI.as_view(), name='ml-list'),
    path('<int:pk>', api.MLBackendDetailAPI.as_view(), name='ml-detail'),
    path('<int:pk>/train', api.MLBackendTrainAPI.as_view(), name='ml-train'),
    path('<int:pk>/predict', api.MLBackendPredictAPI.as_view(), name='ml-predict'),
]

urlpatterns = [
    path('api/ml/', include((_api_urlpatterns, app_name), namespace='api')),
]