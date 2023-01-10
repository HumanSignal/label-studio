"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.urls import path, include

from . import api


app_name = 'data_import'

_api_urlpatterns = [
    path('file-upload/<int:pk>', api.FileUploadAPI.as_view(), name='file-upload-detail')
]

_api_projects_urlpatterns = [
    # import api
    path('<int:pk>/tasks/bulk/', api.TasksBulkCreateAPI.as_view(), name='project-tasks-bulk-upload'),
    path('<int:pk>/import', api.ImportAPI.as_view(), name='project-import'),
    path('<int:pk>/import/predictions', api.ImportPredictionsAPI.as_view(), name='project-import-predictions'),
    path('<int:pk>/reimport', api.ReImportAPI.as_view(), name='project-reimport'),
    path('<int:pk>/file-uploads', api.FileUploadListAPI.as_view(), name='project-file-upload-list')
]

urlpatterns = [
    path('api/import/', include((_api_urlpatterns, app_name), namespace='api')),
    path('api/projects/', include((_api_projects_urlpatterns, app_name), namespace='api-projects')),

    # special endpoints for serving imported files
    path('data/upload/<path:filename>', api.UploadedFileResponse.as_view(), name='data-upload'),
    path('storage-data/uploaded/', api.DownloadStorageData.as_view(), name='storage-data-upload'),
]
