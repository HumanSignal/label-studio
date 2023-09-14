from django.urls import path
from . import views

app_name = 'subjectannotation'

urlpatterns = [
    path('<int:project_id>/', views.annotationtaskpage, name= 'annotationtaskpage'),
    path('<int:project_id>/create/', views.createannotationtask, name='create'),
    path('export/<int:project>',views.exportannotations,name='export')
]
