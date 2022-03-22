from . import api
from django.urls import path, include
from rest_framework.routers import DefaultRouter

app_name = 'labels_manager'

router = DefaultRouter()
router.register(r'labels', api.LabelAPI, basename='label')
router.register(r'label_links', api.LabelLinkAPI, basename='label_link')
api_urlpatterns = router.urls

urlpatterns = [
    path('api/', include((api_urlpatterns, app_name), namespace='api-labels')),
    path('api/labels/bulk', api.LabelBulkUpdateAPI.as_view(), name='api-labels-bulk'),
]
