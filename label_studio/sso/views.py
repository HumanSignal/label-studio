"""
API views for Label Studio SSO token issuance.

Provides endpoints for external clients to obtain JWT tokens
for SSO authentication.
"""

import logging
import time

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)
User = get_user_model()


@csrf_exempt
@require_http_methods(["POST"])
def issue_sso_token(request):
    """
    Issue JWT token for SSO authentication.

    This endpoint allows external client applications to obtain JWT tokens
    for their authenticated users. The client must provide Label Studio API token
    for authentication.

    Request:
        POST /api/sso/token
        Authorization: Token <label-studio-api-token>
        Content-Type: application/json

        {
            "email": "user@example.com"
        }

    Response (Success):
        HTTP 200 OK
        {
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "expires_in": 600
        }

    Response (Error):
        HTTP 401 Unauthorized - Invalid or missing API token
        HTTP 403 Forbidden - Insufficient permissions (admin required)
        HTTP 400 Bad Request - Missing email
        HTTP 500 Internal Server Error - Token generation failed

    Configuration:
        SSO_TOKEN_EXPIRY: Token expiry time in seconds (default: 600)

    Security:
        - Client must provide valid Label Studio API token (admin level)
        - Token is signed with Label Studio's SECRET_KEY
        - Short-lived tokens (default 10 minutes)
        - User auto-created if not exists (optional)
    """
    try:
        # 1. Verify API Token from Authorization header
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")

        if not auth_header.startswith("Token "):
            logger.warning(
                f"Missing or invalid Authorization header from {request.META.get('REMOTE_ADDR')}"
            )
            return JsonResponse({"error": "Authentication required"}, status=401)

        api_token = auth_header[6:]  # Remove "Token " prefix

        # Validate token using Label Studio's Token authentication
        from rest_framework.authtoken.models import Token as AuthToken

        try:
            token_obj = AuthToken.objects.get(key=api_token)
            auth_user = token_obj.user

            # Check if user has admin/staff privileges
            if not (auth_user.is_staff or auth_user.is_superuser):
                logger.warning(
                    f"Non-admin user {auth_user.email} attempted to issue SSO token"
                )
                return JsonResponse({"error": "Admin privileges required"}, status=403)

            logger.info(f"SSO token request authenticated by admin: {auth_user.email}")

        except AuthToken.DoesNotExist:
            logger.warning(f"Invalid API token from {request.META.get('REMOTE_ADDR')}")
            return JsonResponse({"error": "Invalid API token"}, status=401)

        # 2. Parse JSON request
        import json

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        # 3. Get email from request
        email = data.get("email")
        if not email:
            return JsonResponse({"error": "Email required"}, status=400)

        logger.info(f"SSO token request for: {email} (requested by: {auth_user.email})")

        # 4. Get or create user
        auto_create = getattr(settings, "SSO_AUTO_CREATE_USERS", True)

        try:
            user = User.objects.get(email=email)
            logger.info(f"User found: {email}")
        except User.DoesNotExist:
            if auto_create:
                # Auto-create user
                username = data.get("username", email)
                first_name = data.get("first_name", "")
                last_name = data.get("last_name", "")

                user = User.objects.create(
                    email=email,
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True,
                )
                logger.info(f"Auto-created user for SSO: {email}")
            else:
                logger.warning(f"User not found and auto-create disabled: {email}")
                return JsonResponse({"error": "User not found"}, status=404)

        # 5. Generate JWT token
        exp_seconds = getattr(settings, "SSO_TOKEN_EXPIRY", 600)  # 10 minutes

        payload = {
            "user_id": user.id,
            "email": user.email,
            "iat": int(time.time()),
            "exp": int(time.time()) + exp_seconds,
            "iss": "label-studio",
            "aud": "label-studio-sso",
        }

        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

        logger.info(f"SSO token issued for: {email} (expires in {exp_seconds}s)")

        return JsonResponse({"token": token, "expires_in": exp_seconds})

    except Exception as e:
        logger.exception(f"Error issuing SSO token: {e}")
        return JsonResponse({"error": "Internal server error"}, status=500)
