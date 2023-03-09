from django.urls import path
from . import views

app_name = 'sensordata'

urlpatterns = [
    path('', views.sensordatapage, name= 'sensordatapage'),
    path('add/', views.addsensordata, name='add'),
    path('parse/<str:file_path>/<int:sensor_model_id>', views.parse_sensor, name='parse_sensor')
]