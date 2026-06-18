from django.urls import path
from mozilla_django_oidc.views import OIDCAuthenticationRequestView

from .views import LabelStudioOIDCCallbackView

urlpatterns = [
    path('oidc/authenticate/', OIDCAuthenticationRequestView.as_view(), name='oidc_authentication_init'),
    path('oidc/callback/', LabelStudioOIDCCallbackView.as_view(), name='oidc_authentication_callback'),
]
