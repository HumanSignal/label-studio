"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.urls import path, include

from . import api
from . import views


app_name = 'data_export'


_api_urlpatterns = [
    # export api
    # path('<int:pk>/results', api.DownloadResultsAPI.as_view(), name='project-results'),  # DEPRECATED
    path('<int:pk>/export', api.DownloadResultsAPI.as_view(), name='project-export'),
    path('<int:pk>/export/formats', api.ExportFormatsListAPI.as_view(), name='project-export-formats'),
    # Previously exported results
    path('<int:pk>/export/files', api.ProjectExportFiles.as_view(), name='project-export-files'),
]

urlpatterns = [
    path('api/projects/', include((_api_urlpatterns, app_name), namespace='api-projects')),
    path('api/auth/export/', api.ProjectExportFilesAuthCheck.as_view(), name='project-export-files-auth-check'),
]
