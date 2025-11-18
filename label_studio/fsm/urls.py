from django.urls import path
from fsm.api import FSMEntityHistoryAPI

app_name = 'fsm'


urlpatterns = [
    path(
        'api/fsm/entities/<str:entity_name>/<int:entity_id>/history',
        FSMEntityHistoryAPI.as_view(),
        name='fsm-entity-history',
    ),
]
