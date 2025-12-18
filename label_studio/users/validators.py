from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class PasswordLengthValidator:
    def __init__(self, min_length=settings.AUTH_PASSWORD_MIN_LENGTH, max_length=settings.AUTH_PASSWORD_MAX_LENGTH):
        self.min_length = min_length
        self.max_length = max_length

    def validate(self, password, user=None) -> None:
        if len(password) < self.min_length:
            raise ValidationError(
                _('Please enter a password %(min_length)d–%(max_length)d characters in length.'),
                code='password_too_short',
                params={'min_length': self.min_length, 'max_length': self.max_length},
            )
        if len(password) > self.max_length:
            raise ValidationError(
                _('Please enter a password %(min_length)d–%(max_length)d characters in length.'),
                code='password_too_long',
                params={'min_length': self.min_length, 'max_length': self.max_length},
            )

    def get_help_text(self):
        return _('Your password must be between %(min_length)d and %(max_length)d characters.') % {
            'min_length': self.min_length,
            'max_length': self.max_length,
        }
