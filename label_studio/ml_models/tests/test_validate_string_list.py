"""ModelInterface field validators are also run by Django admin forms, which only handle Django's ValidationError."""

import pytest
from django.core.exceptions import ValidationError
from ml_models.models import validate_string_list


@pytest.mark.parametrize('value', [[], {'a': 1}, ['a', 1]])
def test_validate_string_list_raises_django_validation_error(value):
    with pytest.raises(ValidationError):
        validate_string_list(value)


def test_validate_string_list_accepts_list_of_strings():
    validate_string_list(['a', 'b'])
