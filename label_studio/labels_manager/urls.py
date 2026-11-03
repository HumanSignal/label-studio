from core.views import MappedAPIRootView
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import api

app_name = 'labels_manager'

router = DefaultRouter()
router.APIRootView = MappedAPIRootView
router.register(r'labels', api.LabelAPI, basename='label')
router.register(r'label_links', api.LabelLinkAPI, basename='label_link')
api_urlpatterns = router.urls

urlpatterns = [
    # The slash variant is listed before the router: a 404 from the view on the slashless path is
    # re-dispatched with a trailing slash (CommonMiddlewareAppendSlashWithoutRedirect), where it would
    # otherwise hit the label detail route and turn a hidden project's 404 into a 405.
    path('api/labels/bulk/', api.LabelBulkUpdateAPI.as_view(), name='api-labels-bulk-slash'),
    path('api/', include((api_urlpatterns, app_name), namespace='api-labels')),
    path('api/labels/bulk', api.LabelBulkUpdateAPI.as_view(), name='api-labels-bulk'),
]
