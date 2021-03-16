"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import data_export.api
from django.shortcuts import redirect
from django.urls import include, path

from . import api, views

app_name = 'projects'

# reverse for projects:name
_urlpatterns = [
    path('', views.project_list, name='project-index'),
    path('<int:pk>/settings/', views.project_settings, name='project-settings'),

    # Might be replaced with some sort of regexp /settings/*, but idk how to do that
    path('<int:pk>/settings/labeling', views.project_settings, name='project-settings-labeling'),
    path('<int:pk>/settings/instruction', views.project_settings, name='project-settings-instruction'),
    path('<int:pk>/settings/ml', views.project_settings, name='project-settings-ml'),
    path('<int:pk>/settings/storage', views.project_settings, name='project-settings-storage'),
    path('<int:pk>/settings/danger-zone', views.project_settings, name='project-danger-zone'),

    path('upload-example/', views.upload_example_using_config, name='project-upload-example-using-config'),
]

# reverse for projects:api:name
_api_urlpatterns = [
    # CRUD
    path('', api.ProjectListAPI.as_view(), name='project-list'),
    path('<int:pk>/', api.ProjectAPI.as_view(), name='project-detail'),

    # Duplicate project
    path('<int:pk>/duplicate/', api.ProjectDuplicateAPI.as_view(), name='project-duplicate'),

    # Get next task
    path('<int:pk>/next/', api.ProjectNextTaskAPI.as_view(), name='project-next'),

    # Validate label config in general
    path('validate/', api.LabelConfigValidateAPI.as_view(), name='label-config-validate'),

    # Validate label config for project
    path('<int:pk>/validate', api.ProjectLabelConfigValidateAPI.as_view(), name='project-label-config-validate'),

    # Project summary
    path('<int:pk>/summary/', api.ProjectSummaryAPI.as_view(), name='project-summary'),

    # Tasks list for the project: get and destroy
    path('<int:pk>/tasks/', api.TasksListAPI.as_view(), name='project-tasks-list'),

    # Generate sample task for this project
    path('<int:pk>/sample-task/', api.ProjectSampleTask.as_view(), name='project-sample-task'),
]

_api_urlpatterns_templates = [
    path('', api.TemplateListAPI.as_view(), name='template-list'),
]


urlpatterns = [
    path('projects/', include(_urlpatterns)),
    path('api/projects/', include((_api_urlpatterns, app_name), namespace='api')),
    path('api/templates/', include((_api_urlpatterns_templates, app_name), namespace='api-templates')),
]
