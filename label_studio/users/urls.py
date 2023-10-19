"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from os.path import join

from django.conf import settings
from django.conf.urls import include, url
from django.urls import path, re_path
from django.views.static import serve
from rest_framework import routers
from users import api, views
from users.views import UserSoftDeleteView

router = routers.DefaultRouter()
router.register(r'users', api.UserAPI, basename='user')

urlpatterns = [
    url(r'^api/', include(router.urls)),
    # Authentication
    path('user/login/', views.user_login, name='user-login'),
    path('user/signup/', views.user_signup, name='user-signup'),
    path('user/account/', views.user_account, name='user-account'),
    url(r'^logout/?$', views.logout, name='logout'),
    # Token
    path('api/current-user/reset-token/', api.UserResetTokenAPI.as_view(), name='current-user-reset-token'),
    path('api/current-user/token', api.UserGetTokenAPI.as_view(), name='current-user-token'),
    path('api/current-user/whoami', api.UserWhoAmIAPI.as_view(), name='current-user-whoami'),
    # additional user actions
    path('api/users/<int:pk>/soft-delete/', UserSoftDeleteView.as_view(), name='user-soft-delete'),
]

# When CLOUD_FILE_STORAGE_ENABLED is set, avatars are uploaded to cloud storage with a different URL pattern.
# This local serving pattern is unnecessary for environments with cloud storage enabled.
if not settings.CLOUD_FILE_STORAGE_ENABLED:
    urlpatterns += [
        # avatars
        re_path(
            r'^data/' + settings.AVATAR_PATH + '/(?P<path>.*)$',
            serve,
            kwargs={'document_root': join(settings.MEDIA_ROOT, settings.AVATAR_PATH)},
        ),
    ]
