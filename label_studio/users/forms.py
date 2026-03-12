"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from django import forms
from django.conf import settings
from django.contrib import auth
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from users.models import User

EMAIL_MAX_LENGTH = 256
USERNAME_MAX_LENGTH = 30
DISPLAY_NAME_LENGTH = 100
USERNAME_LENGTH_ERR = f'Please enter a username {USERNAME_MAX_LENGTH} characters or fewer in length'
DISPLAY_NAME_LENGTH_ERR = f'Please enter a display name {DISPLAY_NAME_LENGTH} characters or fewer in length'
INVALID_USER_ERROR = "The email and password you entered don't match."

FOUND_US_ELABORATE = 'Other'
FOUND_US_OPTIONS = (
    ('Gi', 'Github'),
    ('Em', 'Email or newsletter'),
    ('Se', 'Search engine'),
    ('Fr', 'Friend or coworker'),
    ('Ad', 'Ad'),
    ('Ot', FOUND_US_ELABORATE),
)

logger = logging.getLogger(__name__)


class LoginForm(forms.Form):
    """For logging in to the app and all - session based"""

    # use username instead of email when LDAP enabled
    email = forms.CharField(label='User') if settings.USE_USERNAME_FOR_LOGIN else forms.EmailField(label='Email')
    password = forms.CharField(widget=forms.PasswordInput())
    persist_session = forms.BooleanField(widget=forms.CheckboxInput(), required=False)

    def clean(self, *args, **kwargs):
        cleaned = super(LoginForm, self).clean()
        email = cleaned.get('email', '').lower()
        password = cleaned.get('password', '')
        if len(email) >= EMAIL_MAX_LENGTH:
            raise forms.ValidationError('Email is too long')

        # advanced way for user auth
        user = settings.USER_AUTH(User, email, password)

        # regular access
        if user is None:
            user = auth.authenticate(email=email, password=password)

        if user and user.is_active:
            persist_session = cleaned.get('persist_session', False)
            return {'user': user, 'persist_session': persist_session}
        else:
            raise forms.ValidationError(INVALID_USER_ERROR)


class UserSignupForm(forms.Form):
    email = forms.EmailField(label='Work Email', error_messages={'required': 'Invalid email'})
    password = forms.CharField(widget=forms.TextInput(attrs={'type': 'password'}))
    allow_newsletters = forms.BooleanField(required=False)
    how_find_us = forms.CharField(required=False)
    elaborate = forms.CharField(required=False)

    def clean_password(self):
        password = self.cleaned_data.get('password')
        try:
            validate_password(password)
        except DjangoValidationError as e:
            raise forms.ValidationError(e.messages)
        return password

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if username and User.objects.filter(username=username.lower()).exists():
            raise forms.ValidationError('User with username already exists')
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email').lower()
        if len(email) >= EMAIL_MAX_LENGTH:
            raise forms.ValidationError('Email is too long')

        if email and User.objects.filter(email=email).exists():
            raise forms.ValidationError('User with this email already exists')

        return email

    def save(self):
        cleaned = self.cleaned_data
        password = cleaned['password']
        email = cleaned['email'].lower()
        allow_newsletters = None
        how_find_us = None
        if 'allow_newsletters' in cleaned:
            allow_newsletters = cleaned['allow_newsletters']
        if 'how_find_us' in cleaned:
            how_find_us = cleaned['how_find_us']
        if 'elaborate' in cleaned and how_find_us == FOUND_US_ELABORATE:
            cleaned['elaborate']

        user = User.objects.create_user(email, password, allow_newsletters=allow_newsletters)
        return user


class UserProfileForm(forms.ModelForm):
    """This form is used in profile account pages"""

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone', 'allow_newsletters')
