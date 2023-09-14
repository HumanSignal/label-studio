from django.urls import path
from . import views

app_name = 'landingpage'

urlpatterns = [
    path('<int:project_id>', views.landingpage, name = 'landingpage'),
    path('create_project', views.createProject, name='Create project'),
    path('homepage', views.homepage, name='homepage'),
    path('<int:project_id>/delete/', views.deleteProject, name='delete-project'),
    path('<int:project_id>/export_project', views.exportProject, name='export-project'),
    path('<int:project_id>/workinprogress', views.workinprogress, name='workinprogress'),
]