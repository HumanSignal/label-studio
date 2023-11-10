import os
from typing import Callable, Optional, Sequence, TypeVar

from rest_framework.exceptions import ValidationError


def cast_bool_from_str(value):
    if isinstance(value, str):
        if value.lower() in ['true', 'yes', 'on', '1']:
            value = True
        elif value.lower() in ['false', 'no', 'not', 'off', '0']:
            value = False
        else:
            raise ValueError(f'Incorrect bool value "{value}". ' f'It should be one of [1, 0, true, false, yes, no]')
    return value


def bool_from_request(params, key, default):
    """Get boolean value from request GET, POST, etc

    :param params: dict POST, GET, etc
    :param key: key to find
    :param default: default value
    :return: boolean
    """
    value = params.get(key, default)

    try:
        if isinstance(value, str):
            value = cast_bool_from_str(value)
        return bool(int(value))
    except Exception as e:
        raise ValidationError({key: str(e)})


def int_from_request(params, key, default):
    """Get integer from request GET, POST, etc

    :param params: dict POST, GET, etc
    :param key: key to find
    :param default: default value
    :return: int
    """
    value = params.get(key, default)

    # str
    if isinstance(value, str):
        try:
            return int(value)
        except ValueError:
            raise ValidationError({key: f'Incorrect value in key "{key}" = "{value}". It should be digit string.'})
        except Exception as e:
            raise ValidationError({key: str(e)})
    # int
    elif isinstance(value, int):
        return value
    # other
    else:
        raise ValidationError(
            {key: f'Incorrect value type in key "{key}" = "{value}". ' f'It should be digit string or integer.'}
        )


def float_from_request(params, key, default):
    """Get float from request GET, POST, etc

    :param params: dict POST, GET, etc
    :param key: key to find
    :param default: default value
    :return: float
    """
    value = params.get(key, default)

    # str
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            raise ValidationError({key: f'Incorrect value in key "{key}" = "{value}". It should be digit string.'})
    # float
    elif isinstance(value, float) or isinstance(value, int):
        return float(value)
    # other
    else:
        raise ValidationError(
            {key: f'Incorrect value type in key "{key}" = "{value}". ' f'It should be digit string or float.'}
        )


def list_of_strings_from_request(params, key, default):
    """Get list of strings from request GET, POST, etc

    :param params: dict POST, GET, etc
    :param key: key to find
    :param default: default value
    :return: float
    """
    value = params.get(key, default)
    if value is None:
        return
    splitters = (',', ';', '|')
    # str
    if isinstance(value, str):
        for splitter in splitters:
            if splitter in value:
                return value.split(splitter)
        return [value]
    else:
        raise ValidationError(
            {key: f'Incorrect value type in key "{key}" = "{value}". ' f'It should be digit string or float.'}
        )


def get_env(name, default=None, is_bool=False):
    for env_key in ['LABEL_STUDIO_' + name, 'HEARTEX_' + name, name]:
        value = os.environ.get(env_key)
        if value is not None:
            if is_bool:
                return bool_from_request(os.environ, env_key, default)
            else:
                return value
    return default


def get_bool_env(key, default):
    return get_env(key, default, is_bool=True)


T = TypeVar('T')


def get_env_list(
    key: str, default: Optional[Sequence[T]] = None, value_transform: Callable[[str], T] = str
) -> Sequence[T]:
    """
    "foo,bar,baz" in env variable => ["foo", "bar", "baz"] in python.
    Use value_transform to convert the strings to any other type.
    """
    value = get_env(key)
    if not value:
        if default is None:
            return []
        return default

    return [value_transform(el) for el in value.split(',')]


def get_env_list_int(key, default=None) -> Sequence[int]:
    return get_env_list(key, default=default, value_transform=int)


def get_all_env_with_prefix(prefix=None, is_bool=True, default_value=None):
    out = {}
    for key in os.environ.keys():
        if not key.startswith(prefix):
            continue
        if is_bool:
            out[key] = bool_from_request(os.environ, key, default_value)
        else:
            out[key] = os.environ[key]
    return out
