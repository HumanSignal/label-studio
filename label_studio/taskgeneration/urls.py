from django.urls import path
from . import views

app_name = 'taskgeneration'

urlpatterns = [
    path('<int:project_id>', views.generate_taskgen_form, name= 'generate_form'),
    path('<int:project_id>/form', views.task_generation_page, name='taskgeneration_form'),
    path('<int:project_id>/generate/', views.generate_activity_tasks, name='generateactivitytasks'),
    path('<int:project_id>/exception/', views.exception, name='exception'),
]
