from django.urls import path
from . import views

app_name = 'landingpage'

urlpatterns = [
    path('', views.landingpage, name = 'landingpage'),
    path('create_project', views.createProject, name='Create project')
]