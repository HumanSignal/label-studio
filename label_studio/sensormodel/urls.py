from django.urls import path
from . import views

app_name = 'sensormodel'

urlpatterns = [
    path('', views.tablepage, name= 'tablepage'),
    path('add', views.add, name= 'add'),
    
    path('sync', views.sync_sensor_parser_templates, name= 'sync'),

    path('deployment/adjust/<int:id>/', views.adjust_deployment, name='adjust_deployment'),
    path('sensor/adjust/<int:id>', views.adjust_sensor, name='adjust_sensor'),
    path('subject/adjust/<int:id>', views.adjust_subject, name='adjust_subject') ,

    path('deployment/delete/<int:id>', views.delete_deployment, name='delete_deployment'),
    path('sensor/delete/<int:id>', views.delete_sensor, name='delete_sensor'),
    path('subject/delete/<int:id>', views.delete_subject, name='delete_subject') ,
]
