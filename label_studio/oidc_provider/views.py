import logging
import time

from django.conf import settings
from django.shortcuts import redirect
from mozilla_django_oidc.views import OIDCAuthenticationCallbackView
from organizations.models import Organization

logger = logging.getLogger(__name__)


class LabelStudioOIDCCallbackView(OIDCAuthenticationCallbackView):
    def login_success(self):
        self.request.session['last_login'] = time.time()

        # self.user is set by OIDCAuthenticationCallbackView.get() via auth.authenticate().
        # self.request.user is still AnonymousUser here — auth.login() runs inside super().
        user = self.user
        if user.active_organization_id is None:
            org = Organization.objects.first()
            if org:
                user.active_organization = org
                user.save(update_fields=['active_organization'])
                logger.info('Assigned org %s to OIDC user %s post-login', org.pk, user.email)

        return super().login_success()

    def login_failure(self):
        return redirect(settings.LOGIN_URL + '?oidc_error=1')
