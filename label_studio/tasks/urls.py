"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.urls import path, include

from . import api


app_name = 'tasks'

_api_urlpatterns = [
    # CRUD
    path('', api.TaskListAPI.as_view(), name='task-list'),
    path('<int:pk>/', api.TaskAPI.as_view(), name='task-detail'),

    path('<int:pk>/annotations/', api.AnnotationsListAPI.as_view(), name='task-annotations'),
    path('<int:pk>/drafts', api.AnnotationDraftListAPI.as_view(), name='task-drafts'),
    path('<int:pk>/annotations/<int:annotation_id>/drafts', api.AnnotationDraftListAPI.as_view(), name='task-annotations-drafts')
]

_api_annotations_urlpatterns = [
    path('<int:pk>/', api.AnnotationAPI.as_view(), name='annotation-detail'),
]

_api_drafts_urlpatterns = [
    path('<int:pk>/', api.AnnotationDraftAPI.as_view(), name='draft-detail'),
]

urlpatterns = [
    path('api/tasks/', include((_api_urlpatterns, app_name), namespace='api')),

    # TODO: these should be moved to the separate apps
    path('api/annotations/', include((_api_annotations_urlpatterns, app_name), namespace='api-annotations')),
    path('api/drafts/', include((_api_drafts_urlpatterns, app_name), namespace='api-drafts'))
]
