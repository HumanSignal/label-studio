import logging

import ldclient
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from ldclient.config import Config, HTTPConfig
from ldclient.feature_store import CacheConfig
from ldclient.integrations import Files, Redis

from label_studio.core.current_request import get_current_request
from label_studio.core.utils.io import find_node
from label_studio.core.utils.params import get_all_env_with_prefix, get_bool_env

from .stale_feature_flags import STALE_FEATURE_FLAGS

logger = logging.getLogger(__name__)


def get_feature_file_path():
    package_name = 'label_studio' if settings.VERSION_EDITION == 'Community' else 'label_studio_enterprise'
    if settings.FEATURE_FLAGS_FILE.startswith('/'):
        return settings.FEATURE_FLAGS_FILE
    else:
        return find_node(package_name, settings.FEATURE_FLAGS_FILE, 'file')


if settings.FEATURE_FLAGS_FROM_FILE:
    # Feature flags from file
    if not settings.FEATURE_FLAGS_FILE:
        raise ValueError(
            'When "FEATURE_FLAGS_FROM_FILE" is set, you have to specify a valid path for feature flags file, e.g.'
            'FEATURE_FLAGS_FILE=my_flags.yml'
        )

    feature_flags_file = get_feature_file_path()

    logger.info(f'Read flags from file {feature_flags_file}')
    data_source = Files.new_data_source(paths=[feature_flags_file])
    config = Config(
        sdk_key=settings.FEATURE_FLAGS_API_KEY or 'whatever', update_processor_class=data_source, send_events=False
    )
    ldclient.set_config(config)
    client = ldclient.get()
elif settings.FEATURE_FLAGS_OFFLINE:
    # On-prem usage, without feature flags file
    ldclient.set_config(Config(settings.FEATURE_FLAGS_API_KEY or 'whatever', offline=True))
    client = ldclient.get()
else:
    # Production usage
    if hasattr(settings, 'REDIS_LOCATION'):
        logger.debug(f'Set LaunchDarkly config with Redis feature store at {settings.REDIS_LOCATION}')
        store_kwargs = {
            'url': settings.REDIS_LOCATION,
            'prefix': 'feature-flags',
            'caching': CacheConfig(expiration=30),
        }
        if settings.REDIS_LOCATION.startswith('rediss'):
            store_kwargs['redis_opts'] = settings.REDIS_SSL_SETTINGS
        store = Redis.new_feature_store(**store_kwargs)
        ldclient.set_config(
            Config(settings.FEATURE_FLAGS_API_KEY, feature_store=store, http=HTTPConfig(connect_timeout=5))
        )
    else:
        logger.debug('Set LaunchDarkly config without Redis...')
        ldclient.set_config(Config(settings.FEATURE_FLAGS_API_KEY, http=HTTPConfig(connect_timeout=5)))
    client = ldclient.get()


def _get_user_repr(user):
    """Turn user object into dict with required properties"""
    if user.is_anonymous:
        return {'key': str(user), 'custom': {'organization': None}}
    user_data = {'email': user.email}
    user_data['key'] = user_data['email']
    if user.active_organization is not None:
        user_data['custom'] = {'organization': user.active_organization.created_by.email}
    else:
        user_data['custom'] = {'organization': None}
    return user_data


def flag_set(feature_flag, user=None, override_system_default=None):
    """Use this method to check whether this flag is set ON to the current user, to split the logic on backend
    For example,
    ```
    if flag_set('ff-dev-123-some-fixed-issue-231221-short', user):
        run_new_code()
    else:
        run_old_code()
    ```
    `override_default` is used to override any system defaults in place in case no files or LD API flags provided

    stale_feature_flags will be checked to confirm if the feature flags are still active

    stale feature flags are considered "deprecated" and should not be changeable in any circumstance.
    They are an intermediary step before code references to the flag being removed completely.
    """

    if feature_flag in STALE_FEATURE_FLAGS:
        return STALE_FEATURE_FLAGS[feature_flag]

    if user is None:
        user = AnonymousUser
    elif user == 'auto':
        user = AnonymousUser
        request = get_current_request()
        if request and getattr(request, 'user', None) and request.user.is_authenticated:
            user = request.user

    user_dict = _get_user_repr(user)
    env_value = get_bool_env(feature_flag, default=None)
    if env_value is not None:
        return env_value
    if override_system_default is not None:
        system_default = override_system_default
    else:
        system_default = settings.FEATURE_FLAGS_DEFAULT_VALUE
    return client.variation(feature_flag, user_dict, system_default)


def all_flags(user):
    """Return the output of this method in API response, to bootstrap client-side flags.
    More on https://docs.launchdarkly.com/sdk/features/bootstrapping#javascript
    stale_feature_flags will override any client configuration
    """
    user_dict = _get_user_repr(user)
    logger.debug(f'Resolve all flags state for user {user_dict}')
    state = client.all_flags_state(user_dict)
    flags = state.to_json_dict()

    env_ff = get_all_env_with_prefix('ff_', is_bool=True)
    env_fflag = get_all_env_with_prefix('fflag_', is_bool=True)
    env_fflag2 = get_all_env_with_prefix('fflag-', is_bool=True)
    env_fflag3 = get_all_env_with_prefix('feat_', is_bool=True)
    env_ff.update(env_fflag)
    env_ff.update(env_fflag2)
    env_ff.update(env_fflag3)

    for env_flag_name, env_flag_on in env_ff.items():
        flags[env_flag_name] = env_flag_on

    for feature_flag, value in STALE_FEATURE_FLAGS.items():
        flags[feature_flag] = value

    return flags
