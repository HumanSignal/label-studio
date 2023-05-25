from django.urls import path
from . import views

app_name = 'sensordata'

urlpatterns = [
    path('', views.sensordatapage, name= 'sensordatapage'),
    path('add/', views.addsensordata, name='add'),
    path('delete/<int:id>', views.deletesensordata, name='delete'),
    path('offset/', views.offset, name='offset'),
]
