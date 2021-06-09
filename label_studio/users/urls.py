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

    # Password reset
    url(r'^password-reset/$', views.FPasswordResetView.as_view(), name='password_reset'),
    url(r'^password-reset/done/$', views.FPasswordResetDoneView.as_view(), name='password_reset_done'),
    url(r'^password-reset/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
        views.FPasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    url(r'^password-reset/complete/$', views.FPasswordResetCompleteView.as_view(), name='password_reset_complete'),

    # avatars
    re_path(r'^data/' + settings.AVATAR_PATH + '/(?P<path>.*)$', serve,
            kwargs={'document_root': join(settings.MEDIA_ROOT, settings.AVATAR_PATH)}),

    # Token
    path('api/current-user/reset-token/', api.UserResetTokenAPI.as_view(), name='current-user-reset-token'),
    path('api/current-user/token', api.UserGetTokenAPI.as_view(), name='current-user-token'),

    path('api/current-user/whoami', api.UserWhoAmIAPI.as_view(), name='current-user-whoami'),
]
