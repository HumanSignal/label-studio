from datetime import timedelta
from typing import Any

from annoying.fields import AutoOneToOneField
from django.db import models
from django.utils.translation import gettext_lazy as _
from organizations.models import Organization
from rest_framework_simplejwt.backends import TokenBackend
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.tokens import api_settings as simple_jwt_settings


class JWTSettings(models.Model):
    """Organization-specific JWT settings for authentication"""

    organization = AutoOneToOneField(Organization, related_name='jwt', primary_key=True, on_delete=models.DO_NOTHING)
    api_tokens_enabled = models.BooleanField(
        _('JWT API tokens enabled'),
        default=True,
        help_text='Enable JWT API token authentication for this organization',
    )
    api_token_ttl_days = models.IntegerField(
        _('JWT API token time to live (days)'),
        default=(200 * 365),  # "eternity", 200 years
        help_text='Number of days before JWT API tokens expire',
    )
    legacy_api_tokens_enabled = models.BooleanField(
        _('legacy API tokens enabled'),
        default=False,
        help_text='Enable legacy API token authentication for this organization',
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def has_permission(self, user):
        return self.organization.has_permission(user)


class LSTokenBackend(TokenBackend):
    """A custom JWT token backend that truncates tokens before storing in the database.

    Extends simlpe jwt's TokenBackend to provide methods for generating both
    truncated tokens (header + payload only) and full tokens (header + payload + signature).
    This preserves privacy of the token by not exposing the signature to the frontend.
    """

    def encode(self, payload: dict[str, Any]) -> str:
        """Encode a payload into a truncated JWT token string.

        Args:
            payload: Dictionary containing the JWT claims to encode

        Returns:
            A truncated JWT string containing only the header and payload portions,
            with the signature section removed
        """
        header, payload, signature = super().encode(payload).split('.')
        return '.'.join([header, payload])

    def encode_full(self, payload: dict[str, Any]) -> str:
        """Encode a payload into a complete JWT token string.

        Args:
            payload: Dictionary containing the JWT claims to encode

        Returns:
            A complete JWT string containing header, payload and signature portions
        """
        return super().encode(payload)


class LSAPIToken(RefreshToken):
    """API token that utilizes JWT, but stores a truncated version and expires
    based on user settings

    This token class extends RefreshToken to provide organization-specific token
    lifetimes and support for truncated tokens. It uses the LSTokenBackend to
    securely store the token (without the signature).
    """

    lifetime = timedelta(days=365 * 200)  # "eternity" (200 years)

    _token_backend = LSTokenBackend(
        simple_jwt_settings.ALGORITHM,
        simple_jwt_settings.SIGNING_KEY,
        simple_jwt_settings.VERIFYING_KEY,
        simple_jwt_settings.AUDIENCE,
        simple_jwt_settings.ISSUER,
        simple_jwt_settings.JWK_URL,
        simple_jwt_settings.LEEWAY,
        simple_jwt_settings.JSON_ENCODER,
    )

    def get_full_jwt(self) -> str:
        """Get the complete JWT token string (including the signature).

        Returns:
            The full JWT token string with header, payload and signature
        """
        return self.get_token_backend().encode_full(self.payload)

    def blacklist(self):
        """Blacklist this token.

        Raises:
            rest_framework_simplejwt.exceptions.TokenError: If the token is already blacklisted.
        """
        self.check_blacklist()
        return super().blacklist()


class TruncatedLSAPIToken(LSAPIToken):
    """Handles JWT tokens that contain only header and payload (no signature).
    Used when frontend has access to truncated refresh tokens only."""

    def __init__(self, token, *args, **kwargs):
        """Initialize a truncated token, ensuring it has exactly 2 parts before adding a dummy signature."""
        # Ensure we have exactly 2 parts (header and payload)
        parts = token.split('.')
        if len(parts) > 2:
            token = '.'.join(parts[:2])
        elif len(parts) < 2:
            raise TokenError('Invalid Label Studio token')

        # Add dummy signature with exactly 43 'x' characters to match expected JWT signature length
        token = token + '.' + ('x' * 43)
        super().__init__(token, verify=False, *args, **kwargs)
