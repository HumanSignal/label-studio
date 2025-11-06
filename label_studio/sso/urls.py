"""
URL configuration for Label Studio SSO.
"""

from django.urls import path
from label_studio.sso.views import issue_sso_token
from label_studio.sso.views import sso_logout

urlpatterns = [
    path("token", issue_sso_token, name="sso_token"),
    path("logout", sso_logout, name="sso_logout"),
]
