import logging

from mozilla_django_oidc.auth import OIDCAuthenticationBackend
from organizations.models import Organization

from .utils import generate_username

logger = logging.getLogger(__name__)


class LabelStudioOIDCBackend(OIDCAuthenticationBackend):
    def filter_users_by_claims(self, claims):
        email = claims.get('email', '').lower()
        if not email:
            return self.UserModel.objects.none()
        return self.UserModel.objects.filter(email=email)

    def create_user(self, claims):
        email = claims.get('email', '').lower()
        user = self.UserModel.objects.create_user(email=email, password=None)
        user.username = generate_username(email)
        user.first_name = claims.get('given_name', '')
        user.last_name = claims.get('family_name', '')
        user.save(update_fields=['username', 'first_name', 'last_name'])

        org = Organization.objects.first()
        if org:
            org.add_user(user)
        else:
            org = Organization.create_organization(created_by=user, title='Label Studio')
        user.active_organization = org
        user.save(update_fields=['active_organization'])

        logger.info('Created new user via OIDC: %s', email)
        return user

    def update_user(self, user, claims):
        first_name = claims.get('given_name', user.first_name)
        last_name = claims.get('family_name', user.last_name)
        if user.first_name != first_name or user.last_name != last_name:
            user.first_name = first_name
            user.last_name = last_name
            user.save(update_fields=['first_name', 'last_name'])
        return user

    def verify_claims(self, claims):
        if not super().verify_claims(claims):
            return False
        email_verified = claims.get('email_verified')
        if email_verified is None:
            return True  # IdP does not emit the claim — accept
        # Normalize: boolean True / string "true" / integer 1 are accepted; all else rejected.
        # Some IdPs (e.g. legacy Cognito) emit strings instead of JSON booleans.
        if email_verified is True or str(email_verified).lower() == 'true':
            return True
        logger.warning('OIDC login rejected: email_verified=%r for %s', email_verified, claims.get('email'))
        return False
