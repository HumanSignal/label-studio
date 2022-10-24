from django.contrib.auth.middleware import RemoteUserMiddleware
from django.contrib.auth.backends import RemoteUserBackend

class GoogleIAPUserMiddleware(RemoteUserMiddleware):
    header = "HTTP_X_GOOG_AUTHENTICATED_USER_EMAIL"

class GoogleIAPUserBackend(RemoteUserBackend):

    def clean_username(self, username: str) -> str:
        return username.split(":")[-1]

