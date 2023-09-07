from rest_framework.authentication import RemoteUserAuthentication
from django.conf import settings

class CustomHeaderAuthentication(RemoteUserAuthentication):
    header = settings.CUSTOM_HEADER
