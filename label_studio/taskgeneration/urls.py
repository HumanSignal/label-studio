from django.urls import path
from . import views

app_name = 'taskgeneration'

urlpatterns = [
    path('', views.task_generation_page, name= 'taskgenerationpage'),
    path('generate/', views.generate_activity_tasks, name='generateactivitytasks'),
    path('taskpair/',views.create_task_pairs,name='pairs')
]
