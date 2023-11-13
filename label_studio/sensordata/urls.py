from django.urls import path
from . import views

app_name = 'sensordata'

urlpatterns = [
    path('<int:project_id>', views.sensordatapage, name= 'sensordatapage'),
    path('<int:project_id>/add/', views.addsensordata, name='addsensordata'),
    path('<int:project_id>/upload_warning', views.file_warning, name='file-upload-warning'),
    path('<int:project_id>/delete/<int:id>', views.deletesensordata, name='delete'),
    path('<int:project_id>/offset/', views.offset, name='offset'),
    path('<int:project_id>/offset/adjust/<int:id>/', views.adjust_offset, name='adjust_offset'),
    path('<int:project_id>/offset/parse/', views.parse_offset_annotations, name='parse_offset'),
    path('<int:project_id>/offset/delete/<int:id>', views.delete_offset, name='delete_offset'),
    path('<int:project_id>/offset/generate_tasks/', views.generate_offset_anno_tasks, name='generate_tasks'),

]

