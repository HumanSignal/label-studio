from annoying.fields import AutoOneToOneField
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _
from organizations.models import Organization


class SessionTimeoutPolicy(models.Model):
    """Organization-specific session timeout policy configuration"""

    organization = AutoOneToOneField(
        Organization, related_name='session_timeout_policy', primary_key=True, on_delete=models.DO_NOTHING
    )

    max_session_age = models.IntegerField(
        _('Max session age (minutes)'),
        default=(8 * 24 * 60),  # 8 days,
        validators=[MinValueValidator(1)],
        help_text='Number of minutes that a session can be active before needing to re-login',
    )

    max_time_between_activity = models.IntegerField(
        _('Max time (minutes) between activity'),
        validators=[MinValueValidator(1)],
        default=(3 * 24 * 60),  # 3 days
        help_text='Number of minutes that a session stays active without any activity',
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def has_permission(self, user):
        return self.organization_id == user.active_organization_id
