from django.urls import path
from . import views

app_name = 'landingpage'

urlpatterns = [
    path('', views.landingpage, name = 'landingpage'),
    path('create_project', views.createProject, name='Create project'),
    path('export_project', views.exportProject, name='export-project'),
]