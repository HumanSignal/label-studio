"""
Generic JWT Authentication Backend for Label Studio

Authenticates users using JWT tokens from any external system.
Configurable via Django settings for maximum flexibility.
"""

import logging

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from jwt.exceptions import (
    ExpiredSignatureError,
    InvalidSignatureError,
    InvalidTokenError,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class JWTAuthenticationBackend(ModelBackend):
    """
    Label Studio Native JWT Authentication Backend.

    Uses Label Studio's built-in SECRET_KEY to verify JWT tokens issued by
    Label Studio's /api/sso/token endpoint.

    Configuration (in Django settings.py):
        JWT_SSO_NATIVE_USER_ID_CLAIM: Claim containing user ID (default: 'user_id')
        JWT_SSO_TOKEN_PARAM: URL parameter name for token (default: 'token')
        JWT_SSO_COOKIE_NAME: Cookie name for token (optional, default: None)

    Example configuration:
        JWT_SSO_NATIVE_USER_ID_CLAIM = 'user_id'
        JWT_SSO_TOKEN_PARAM = 'token'
        JWT_SSO_COOKIE_NAME = 'ls_auth_token'
    """

    def authenticate(self, request, token=None, **kwargs):  # noqa: C901
        """
        Authenticate user using Label Studio native JWT token.

        Args:
            request: HttpRequest object
            token: JWT token string issued by Label Studio

        Returns:
            User object if authentication succeeds, None otherwise
        """
        # Check if this is a DRF Token authentication request - bypass to DRF
        if request:
            auth_header = request.META.get("HTTP_AUTHORIZATION", "")
            if auth_header.startswith("Token "):
                logger.debug("DRF Token detected, bypassing JWT backend")
                return None

        # Extract token from URL parameter if not provided
        if not token and request:
            token_param = getattr(settings, "JWT_SSO_TOKEN_PARAM", "token")
            token = request.GET.get(token_param)

        if not token:
            logger.debug("No JWT token provided")
            return None

        try:
            logger.info("Verifying Label Studio native JWT token")
            print("[JWT Backend] Verifying native Label Studio JWT")

            # Use Label Studio's SECRET_KEY for verification
            # Disable audience verification - not needed for Label Studio native tokens
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

            print("[JWT Backend] Token decoded successfully")
            print(f"[JWT Backend] Payload: {payload}")

            # Get user by user_id from payload
            user_id_claim = getattr(settings, "JWT_SSO_NATIVE_USER_ID_CLAIM", "user_id")
            user_id = payload.get(user_id_claim)

            print(f"[JWT Backend] Looking for claim '{user_id_claim}' in payload")
            print(f"[JWT Backend] Extracted user_id: {user_id}")

            if not user_id:
                logger.warning(
                    f"Native JWT token does not contain '{user_id_claim}' claim"
                )
                print("[JWT Backend] ERROR: No user_id in token")
                return None

            try:
                print(f"[JWT Backend] Searching for user with ID: {user_id}")
                user = User.objects.get(pk=user_id)
                logger.info("User authenticated via native JWT: %s", user.email)
                print(f"[JWT Backend] Native JWT auth successful: {user.email}")
                return user
            except User.DoesNotExist:
                logger.warning(f"User with ID {user_id} not found")
                print(
                    f"[JWT Backend] ERROR: User with ID {user_id} not found in database"
                )
                return None

        except ExpiredSignatureError:
            logger.warning("JWT token has expired")
            # Mark request for expired token cleanup in middleware
            if request:
                request._sso_jwt_expired = True
            return None
        except InvalidSignatureError:
            logger.error("JWT token signature verification failed")
            return None
        except InvalidTokenError as e:
            logger.error(f"Invalid JWT token: {str(e)}")
            return None
        except Exception as e:
            logger.exception(f"Unexpected error during JWT authentication: {str(e)}")
            return None

    def get_user(self, user_id):
        """
        Get user by ID (required by Django auth backend interface).
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
