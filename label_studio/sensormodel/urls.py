from django.urls import path
from . import views

app_name = 'sensormodel'

urlpatterns = [
    path('', views.tablepage, name= 'tablepage'),
    path('add', views.add, name= 'add'),

    # path('deployment/<int:id>/', views.deployment_details, name='deployment_details'),
    # path('sensor/<int:id>', views.sensor_details, name='sensor_details'),
    # path('subjects/<int:id>', views.subject_details, name='subject_details') ,
    path('sync', views.sync_sensor_parser_templates, name= 'sync'),

    path('deployment/adjust/<int:id>/', views.adjust_deployment, name='adjust_deployment'),
    path('sensor/adjust/<int:id>', views.adjust_sensor, name='adjust_sensor'),
    path('subjects/adjust/<int:id>', views.adjust_subject, name='adjust_subject') ,

    path('deployment/delete/<int:id>', views.delete_deployment, name='delete_deployment'),
    path('sensor/delete/<int:id>', views.delete_sensor, name='delete_sensor'),
    path('subjects/delete/<int:id>', views.delete_subject, name='delete_subject') ,
]
