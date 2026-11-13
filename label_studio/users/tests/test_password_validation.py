import pytest
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from users.forms import UserSignupForm


def _error_codes(password):
    with pytest.raises(ValidationError) as exc_info:
        validate_password(password)
    return {error.code for error in exc_info.value.error_list}


@pytest.mark.parametrize(
    'password, expected_code',
    [
        ('12345678', 'password_entirely_numeric'),
        ('9876543210123', 'password_entirely_numeric'),
        ('password', 'password_too_common'),
        ('qwertyuiop', 'password_too_common'),
        ('Password123', 'password_too_common'),
        ('short1!', 'password_too_short'),
        ('a' * 129, 'password_too_long'),
    ],
)
def test_weak_password_is_rejected(password, expected_code):
    assert expected_code in _error_codes(password)


def test_numeric_common_password_reports_both_errors():
    assert {'password_too_common', 'password_entirely_numeric'} <= _error_codes('12345678')


@pytest.mark.parametrize('password', ['StrongPassw0rd!', 'correct-horse-battery-staple', 'x7#Lq9vT'])
def test_acceptable_password_passes(password):
    validate_password(password)


@pytest.mark.django_db
@pytest.mark.parametrize('password', ['12345678', 'password'])
def test_signup_form_rejects_weak_password(password):
    form = UserSignupForm(data={'email': 'new-user@example.com', 'password': password})

    assert not form.is_valid()
    assert 'password' in form.errors


@pytest.mark.django_db
def test_signup_form_accepts_strong_password():
    form = UserSignupForm(data={'email': 'new-user@example.com', 'password': 'StrongPassw0rd!'})

    assert form.is_valid(), form.errors
