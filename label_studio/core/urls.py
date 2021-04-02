"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
"""bn URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.apps import apps
from django.conf import settings
from django.conf.urls import include
from django.contrib import admin
from django.urls import path, re_path
from django.views.generic.base import RedirectView
from django.views.static import serve
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework.permissions import AllowAny

from core import views

handler500 = 'core.views.custom_500'

schema_view = get_schema_view(
    openapi.Info(
        title="Label Studio API",
        default_version='v2',
        contact=openapi.Contact(url="https://labelstud.io"),
        x_logo={"url": "../../static/icons/logo-black.svg"}
    ),
    public=True,
    permission_classes=(AllowAny,),
)

urlpatterns = [
    re_path(r'^$', views.main, name='main'),
    re_path(r'^favicon\.ico$', RedirectView.as_view(url='/static/images/favicon.ico', permanent=True)),
    re_path(r'^label-studio-frontend/(?P<path>.*)$', serve, kwargs={'document_root': settings.EDITOR_ROOT, 'show_indexes': True}),
    re_path(r'^dm/(?P<path>.*)$', serve, kwargs={'document_root': settings.DM_ROOT, 'show_indexes': True}),
    re_path(r'^react-app/(?P<path>.*)$', serve, kwargs={'document_root': settings.REACT_APP_ROOT, 'show_indexes': True}),
    re_path(r'^static/fonts/roboto/roboto.css$', views.static_file_with_host_resolver('static/fonts/roboto/roboto.css', content_type='text/css')),
    re_path(r'^static/(?P<path>.*)$', serve, kwargs={'document_root': settings.STATIC_ROOT, 'show_indexes': True}),



    re_path(r'^', include('organizations.urls')),
    re_path(r'^', include('projects.urls')),
    re_path(r'^', include('data_import.urls')),
    re_path(r'^', include('data_manager.urls')),
    re_path(r'^', include('data_export.urls')),
    re_path(r'^', include('users.urls')),
    re_path(r'^', include('tasks.urls')),
    re_path(r'^', include('io_storages.urls')),
    re_path(r'^', include('ml.urls')),

    re_path(r'data/local-files/', views.localfiles_data, name="localfiles_data"),

    re_path(r'version/', views.version_page, name="version"),  # html page
    re_path(r'api/version/', views.version_page, name="api-version"),  # json response

    re_path(r'health/', views.health, name="health"),
    re_path(r'metrics/', views.metrics, name="metrics"),

    re_path(r'samples/time-series.csv', views.samples_time_series, name="static_time_series"),

    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),

    path('docs/api/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('docs/', RedirectView.as_view(url='/static/docs/public/guide/introduction.html', permanent=False)),

    path('admin/', admin.site.urls),
    path('django-rq/', include('django_rq.urls')),
    re_path(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework'))
]

if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
