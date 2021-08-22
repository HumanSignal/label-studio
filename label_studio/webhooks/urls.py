from django.urls import path, include

from label_studio.webhooks import api


app_name = 'label_studio.webhooks'

_api_urlpatterns = [
    # CRUD
    path('', api.WebhookListAPI.as_view(), name='webhook-list'),
    path('<int:pk>/', api.WebhookAPI.as_view(), name='webhook-detail'),
    path('info/', api.WebhookInfoAPI.as_view(), name='webhook-info')
]

urlpatterns = [
    path('api/webhooks/', include((_api_urlpatterns, app_name), namespace='api')),

]
