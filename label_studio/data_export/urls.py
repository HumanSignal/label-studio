"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.urls import include, path

from . import api
from .pdf_export import api as pdf_api

app_name = 'data_export'


_api_urlpatterns = [
    # export api
    path('<int:pk>/export', api.ExportAPI.as_view(), name='project-export'),
    path('<int:pk>/export/formats', api.ExportFormatsListAPI.as_view(), name='project-export-formats'),
    # Previously exported results
    path('<int:pk>/export/files', api.ProjectExportFiles.as_view(), name='project-export-files'),
    path('<int:pk>/exports/', api.ExportListAPI.as_view(), name='project-exports-list'),
    path('<int:pk>/exports/<int:export_pk>', api.ExportDetailAPI.as_view(), name='project-exports-detail'),
    path(
        '<int:pk>/exports/<int:export_pk>/download', api.ExportDownloadAPI.as_view(), name='project-exports-download'
    ),
    path('<int:pk>/exports/<int:export_pk>/convert', api.ExportConvertAPI.as_view(), name='project-exports-convert'),
    # PDF ML Export endpoints
    path('<int:pk>/exports/pdf-ml/', pdf_api.PdfExportListCreateAPI.as_view(), name='project-pdf-exports-list'),
    path(
        '<int:pk>/exports/pdf-ml/<str:export_id>',
        pdf_api.PdfExportDetailAPI.as_view(),
        name='project-pdf-exports-detail',
    ),
]

# PDF ML Export download and manifest endpoints (not project-scoped)
_pdf_export_urlpatterns = [
    path('<str:export_id>/download', pdf_api.PdfExportDownloadAPI.as_view(), name='pdf-export-download'),
    path('<str:export_id>/manifest', pdf_api.PdfExportManifestAPI.as_view(), name='pdf-export-manifest'),
]

urlpatterns = [
    path('api/projects/', include((_api_urlpatterns, app_name), namespace='api-projects')),
    path('api/auth/export/', api.ProjectExportFilesAuthCheck.as_view(), name='project-export-files-auth-check'),
    path('api/exports/pdf-ml/', include((_pdf_export_urlpatterns, app_name), namespace='api-pdf-exports')),
    # path('api/auth/exports/', api.ExportListAPI.as_view(), name='api-exports'),
]
