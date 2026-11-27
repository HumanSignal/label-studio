"""Helpers for detecting JWT-formatted credentials without verifying signatures."""

import jwt
from jwt.exceptions import PyJWTError


def is_jwt_formatted(token: str) -> bool:
    """Return whether ``token`` is structured as a JWT (JWS).

    Does not validate the signature or claims. Used to choose between
    ``Authorization: Bearer`` and ``Authorization: Token`` for API keys.
    """
    if not token:
        return False
    try:
        jwt.decode(token, options={'verify_signature': False})
    except PyJWTError:
        return False
    return True
