"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from os.path import join
from django.conf import settings
from django.conf.urls import url, include
from django.urls import path, re_path
from django.views.static import serve
from rest_framework import routers

from users import views, api

router = routers.DefaultRouter()
router.register(r'users', api.UserAPI, basename='user')

urlpatterns = [
    url(r'^api/', include(router.urls)),

    # Authentication
    path('user/login/', views.user_login, name='user-login'),
    path('user/signup/', views.user_signup, name='user-signup'),
    path('user/account/', views.user_account, name='user-account'),
    url(r'^logout/?$', views.logout, name='logout'),

    # avatars
    re_path(r'^data/' + settings.AVATAR_PATH + '/(?P<path>.*)$', serve,
            kwargs={'document_root': join(settings.MEDIA_ROOT, settings.AVATAR_PATH)}),

    # Token
    path('api/current-user/reset-token/', api.UserResetTokenAPI.as_view(), name='current-user-reset-token'),
    path('api/current-user/token', api.UserGetTokenAPI.as_view(), name='current-user-token'),

    path('api/current-user/whoami', api.UserWhoAmIAPI.as_view(), name='current-user-whoami'),
]
