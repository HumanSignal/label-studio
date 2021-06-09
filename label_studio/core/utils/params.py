import os


def bool_from_request(params, key, default):
    """ Get boolean value from request GET, POST, etc

    :param params: dict POST, GET, etc
    :param key: key to find
    :param default: default value
    :return: boolean
    """
    value = params.get(key, default)

    if isinstance(value, str):
        if value.lower() in ['true', 'yes', 'on', '1']:
            value = True
        elif value.lower() in ['false', 'no', 'not', 'off', '0']:
            value = False
        else:
            raise ValueError(f'Incorrect value in key "{key}" = "{value}". '
                             f'It should be one of [1, 0, true, false, yes, no]')

    return bool(int(value))


def int_from_request(params, key, default):
    """ Get integer from request GET, POST, etc

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
            raise ValueError(f'Incorrect value in key "{key}" = "{value}". It should be digit string.')
    # int
    elif isinstance(value, int):
        return value
    # other
    else:
        raise ValueError(f'Incorrect value type in key "{key}" = "{value}". It should be digit string or integer.')


def float_from_request(params, key, default):
    """ Get float from request GET, POST, etc

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
            raise ValueError(f'Incorrect value in key "{key}" = "{value}". It should be digit string.')
    # float
    elif isinstance(value, float) or isinstance(value, int):
        return float(value)
    # other
    else:
        raise ValueError(f'Incorrect value type in key "{key}" = "{value}". It should be digit string or float.')


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
