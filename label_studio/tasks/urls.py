"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.urls import include, path
from rest_framework import routers

from . import api

app_name = 'tasks'

router = routers.DefaultRouter()
router.register(r'predictions', api.PredictionAPI, basename='prediction')

_api_urlpatterns = [
    # CRUD
    path('', api.TaskListAPI.as_view(), name='task-list'),
    path('<int:pk>/', api.TaskAPI.as_view(), name='task-detail'),
    path('<int:pk>/annotations/', api.AnnotationsListAPI.as_view(), name='task-annotations'),
    path('<int:pk>/drafts', api.AnnotationDraftListAPI.as_view(), name='task-drafts'),
    path(
        '<int:pk>/annotations/<int:annotation_id>/drafts',
        api.AnnotationDraftListAPI.as_view(),
        name='task-annotations-drafts',
    ),
]

_api_annotations_urlpatterns = [
    path('<int:pk>/', api.AnnotationAPI.as_view(), name='annotation-detail'),
    path('<int:pk>/convert-to-draft', api.AnnotationConvertAPI.as_view(), name='annotation-convert-to-draft'),
    path('<int:pk>/review/', api.AnnotationReviewAPI.as_view(), name='annotation-review'),
    path('<int:pk>/comments/', api.AnnotationCommentsListAPI.as_view(), name='annotation-comments-list'),
    path('<int:pk>/comments/bulk-resolve/', api.BulkResolveCommentsAPI.as_view(), name='annotation-comments-bulk-resolve'),
    path('<int:pk>/metrics/', api.AnnotationMetricsAPI.as_view(), name='annotation-metrics'),
    path('<int:pk>/quality-scores/', api.AnnotationQualityScoresAPI.as_view(), name='annotation-quality-scores'),
    path('<int:pk>/history/', api.AnnotationHistoryAPI.as_view(), name='annotation-history'),
    path('<int:pk>/rollback/', api.AnnotationRollbackAPI.as_view(), name='annotation-rollback'),
]

_api_comments_urlpatterns = [
    path('<int:pk>/', api.AnnotationCommentDetailAPI.as_view(), name='comment-detail'),
    path('<int:pk>/resolve/', api.AnnotationCommentResolveAPI.as_view(), name='comment-resolve'),
]

_api_drafts_urlpatterns = [
    path('<int:pk>/', api.AnnotationDraftAPI.as_view(), name='draft-detail'),
]

_api_predictions_urlpatterns = router.urls


urlpatterns = [
    path('api/tasks/', include((_api_urlpatterns, app_name), namespace='api')),
    # TODO: these should be moved to the separate apps
    path('api/annotations/', include((_api_annotations_urlpatterns, app_name), namespace='api-annotations')),
    path('api/comments/', include((_api_comments_urlpatterns, app_name), namespace='api-comments')),
    path('api/drafts/', include((_api_drafts_urlpatterns, app_name), namespace='api-drafts')),
    path('api/', include((_api_predictions_urlpatterns, app_name), namespace='api-predictions')),
]
