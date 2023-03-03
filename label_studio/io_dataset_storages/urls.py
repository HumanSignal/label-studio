"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.urls import path, include

from .gcs.api import *
from .all_api import *

app_name = 'dataset-storages'

# IO Storages CRUD
_api_urlpatterns = [
    # All storages
    path('', AllDatasetStorageListAPI.as_view(), name='list'),
    path('types', AllDatasetStorageTypesAPI.as_view(), name='dataset-storage-types'),

    # Google Cloud Storage
    path('gcs', GCSDatasetStorageListAPI.as_view(), name='dataset-storage-gcs-list'),
    path('gcs/<int:pk>', GCSDatasetStorageDetailAPI.as_view(), name='dataset-storage-gcs-detail'),
    path('gcs/<int:pk>/sync', GCSDatasetStorageSyncAPI.as_view(), name='dataset-storage-gcs-sync'),
    path('gcs/validate', GCSDatasetStorageValidateAPI.as_view(), name='dataset-storage-gcs-validate'),
    path('gcs/form', GCSDatasetStorageFormLayoutAPI.as_view(), name='dataset-storage-gcs-form'),
]

urlpatterns = [
    path('api/dataset-storages/', include((_api_urlpatterns, app_name), namespace='api')),
]
