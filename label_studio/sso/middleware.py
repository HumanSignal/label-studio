"""
Native JWT Auto-Login Middleware

Automatically logs in users when they access Label Studio with a valid JWT token
issued by Label Studio's /api/sso/token endpoint.

Authentication Priority:
1. Django Session (ls_sessionid) - Fast, no JWT verification needed
2. JWT Cookie (JWT_SSO_COOKIE_NAME) - Secure, HttpOnly cookie (recommended)
3. JWT URL Parameter (JWT_SSO_TOKEN_PARAM) - Backward compatibility
"""

import logging
import time

from django.conf import settings
from django.contrib.auth import login
from django.utils.deprecation import MiddlewareMixin

from label_studio.sso.backends import JWTAuthenticationBackend

logger = logging.getLogger(__name__)


class JWTAutoLoginMiddleware(MiddlewareMixin):
    """
    Middleware to automatically log in users via JWT token.

    Uses Label Studio Native JWT tokens issued via /api/sso/token endpoint.

    Authentication Priority:
    1. Django Session (checked by AuthenticationMiddleware before this)
       - If user already authenticated, skip JWT verification (performance optimization)
    2. JWT Cookie (JWT_SSO_COOKIE_NAME) - Preferred, more secure
       - HttpOnly cookie, not visible to JavaScript
       - Not exposed in URLs, browser history, or logs
    3. JWT URL Parameter (JWT_SSO_TOKEN_PARAM) - Backward compatibility
       - Less secure, exposed in URLs
       - Kept for legacy systems

    Configuration (in Django settings.py):
        JWT_SSO_COOKIE_NAME: Cookie name for JWT token (recommended: 'ls_auth_token')
        JWT_SSO_TOKEN_PARAM: URL parameter name for token (default: 'token')
        JWT_SSO_NATIVE_USER_ID_CLAIM: JWT claim containing user ID (default: 'user_id')

    Example Configuration:
        # Recommended setup (Cookie-based SSO)
        JWT_SSO_COOKIE_NAME = 'ls_auth_token'  # Initial authentication token
        SESSION_COOKIE_NAME = 'ls_sessionid'   # Persistent session after login

        # Flow:
        # 1. Client sets ls_auth_token cookie (10 min expiry)
        # 2. First request: JWT verified, session created (ls_sessionid)
        # 3. Subsequent requests: Session used (fast, no JWT verification)
        # 4. Session expires: Fall back to ls_auth_token
    """

    def __init__(self, get_response):
        super().__init__(get_response)
        self.jwt_backend = JWTAuthenticationBackend()

    def process_request(self, request):
        user = None
        auth_backend = None

        # Priority 1: Check for JWT token in Cookie (preferred, more secure)
        token = None
        cookie_name = getattr(settings, "JWT_SSO_COOKIE_NAME", None)
        if cookie_name:
            token = request.COOKIES.get(cookie_name)
            if token:
                logger.info(f"JWT token found in cookie: {cookie_name}")
                print(f"[SSO Middleware] JWT token found in cookie '{cookie_name}'")
                print(f"[SSO Middleware] Token from cookie: {token[:20]}...")

        # Priority 2: Check for JWT token in URL parameter (fallback, backward compatibility)
        if not token:
            token_param = getattr(settings, "JWT_SSO_TOKEN_PARAM", "token")
            token = request.GET.get(token_param)
            if token:
                logger.info(f"JWT token found in URL parameter: {token_param}")
                print(f"[SSO Middleware] JWT token found in URL param '{token_param}'")
                print(f"[SSO Middleware] Token from URL: {token[:20]}...")

        if token:
            logger.info("JWT token detected, attempting auto-login")
            print("[SSO Middleware] JWT token detected, attempting authentication")

            # Attempt to authenticate with JWT token (Method 1 or 2)
            user = self.jwt_backend.authenticate(request, token=token)
            auth_backend = "label_studio_sso.backends.JWTAuthenticationBackend"

            print(f"[SSO Middleware] JWT authentication result: {user}")

        # Log in the user if authentication succeeded
        if user:
            login(request, user, backend=auth_backend)
            # Mark this session as SSO auto-login
            request.session["jwt_auto_login"] = True
            request.session["sso_method"] = "jwt"
            request.session["last_login"] = time.time()
            # JWT 인증 성공 시 토큰 삭제 플래그 설정 (세션으로 전환)
            request._jwt_authenticated = True
            logger.info(f"User auto-logged in via JWT: {user.email}")
            print(f"[SSO Middleware] User auto-logged in via JWT: {user.email}")
        else:
            if token:
                logger.warning("JWT authentication failed")
                print("[SSO Middleware] JWT authentication FAILED")

    def process_response(self, request, response):
        """
        Clean up JWT token cookie after successful authentication.
        """
        cookie_name = getattr(settings, "JWT_SSO_COOKIE_NAME", None)

        if cookie_name:
            # JWT 인증 성공 시 토큰 쿠키 삭제 (세션으로 전환)
            if getattr(request, "_jwt_authenticated", False):
                response.delete_cookie(
                    cookie_name,
                    path=getattr(settings, "JWT_SSO_COOKIE_PATH", "/"),
                    domain=getattr(settings, "SESSION_COOKIE_DOMAIN", None),
                )
                logger.info(
                    f"Deleted JWT token cookie after session creation: {cookie_name}"
                )
                print(
                    f"[SSO Middleware] JWT → Session: Deleted token cookie '{cookie_name}'"
                )

            # JWT 토큰 만료 시 쿠키 삭제
            elif getattr(request, "_sso_jwt_expired", False):
                response.delete_cookie(
                    cookie_name,
                    path=getattr(settings, "JWT_SSO_COOKIE_PATH", "/"),
                    domain=getattr(settings, "SESSION_COOKIE_DOMAIN", None),
                )
                logger.info(f"Deleted expired JWT token cookie: {cookie_name}")
                print(f"[SSO Middleware] Deleted expired token cookie: {cookie_name}")

        return response
