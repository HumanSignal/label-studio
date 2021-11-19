"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.urls import path, include

from . import api


app_name = 'data_export'


_api_urlpatterns = [
    # export api
    path('<int:pk>/export', api.ExportAPI.as_view(), name='project-export'),
    path('<int:pk>/export/formats', api.ExportFormatsListAPI.as_view(), name='project-export-formats'),
    # Previously exported results
    path('<int:pk>/export/files', api.ProjectExportFiles.as_view(), name='project-export-files'),
    path('<int:pk>/exports/', api.ExportListAPI.as_view(), name='project-exports-list'),
    path('<int:pk>/exports/<int:export_pk>', api.ExportDetailAPI.as_view(), name='project-exports-detail'),
    path('<int:pk>/exports/<int:export_pk>/download', api.ExportDownloadAPI.as_view(), name='project-exports-download'),
]

urlpatterns = [
    path('api/projects/', include((_api_urlpatterns, app_name), namespace='api-projects')),
    path('api/auth/export/', api.ProjectExportFilesAuthCheck.as_view(), name='project-export-files-auth-check'),
    # path('api/auth/exports/', api.ExportListAPI.as_view(), name='api-exports'),
]
