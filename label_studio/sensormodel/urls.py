from django.urls import path
from . import views

app_name = 'sensormodel'

urlpatterns = [
    path('<int:project_id>/deployment/', views.deployment, name='deployment'),
    path('<int:project_id>/sensor/', views.sensor, name='sensor'),
    path('<int:project_id>/subject/', views.subject, name='subject'),
    
    path('<int:project_id>/sync/', views.sync_sensor_parser_templates, name='sync'),
    
    path('<int:project_id>/deployment/adjust/<int:id>/', views.adjust_deployment, name='adjust_deployment'),
    path('<int:project_id>/sensor/adjust/<int:id>/', views.adjust_sensor, name='adjust_sensor'),
    path('<int:project_id>/subject/adjust/<int:id>/', views.adjust_subject, name='adjust_subject'),

    path('<int:project_id>/deployment/delete/<int:id>/', views.delete_deployment, name='delete_deployment'),
    path('<int:project_id>/sensor/delete/<int:id>/', views.delete_sensor, name='delete_sensor'),
    path('<int:project_id>/subject/delete/<int:id>/', views.delete_subject, name='delete_subject'),
]