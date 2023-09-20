from django.urls import path
from . import views

app_name = 'taskgeneration'

urlpatterns = [
    path('<int:project_id>', views.generate_taskgen_form, name= 'generate_form'),
    path('<int:project_id>/generate/', views.task_generation_page, name='generateactivitytasks'),
]
