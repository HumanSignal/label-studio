import ldclient
import logging

from ldclient.config import Config, HTTPConfig
from ldclient.integrations import Files, Redis
from ldclient.feature_store import CacheConfig

from django.conf import settings
from label_studio.core.utils.params import get_bool_env, get_all_env_with_prefix
from label_studio.core.utils.io import find_node

logger = logging.getLogger(__name__)


if settings.FEATURE_FLAGS_FROM_FILE:
    # Feature flags from file
    if not settings.FEATURE_FLAGS_FILE:
        raise ValueError('When "FEATURE_FLAGS_FROM_FILE" is set, you have to specify a valid path for feature flags file, e.g.'
                         'FEATURE_FLAGS_FILE=my_flags.yml')

    package_name = 'label_studio' if settings.VERSION_EDITION == 'Community' else 'label_studio_enterprise'
    if settings.FEATURE_FLAGS_FILE.startswith('/'):
        feature_flags_file = settings.FEATURE_FLAGS_FILE
    else:
        feature_flags_file = find_node(package_name, settings.FEATURE_FLAGS_FILE, 'file')

    logger.info(f'Read flags from file {feature_flags_file}')
    data_source = Files.new_data_source(paths=[feature_flags_file])
    config = Config(
        sdk_key=settings.FEATURE_FLAGS_API_KEY or 'whatever',
        update_processor_class=data_source,
        send_events=False)
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
        store = Redis.new_feature_store(
            url=settings.REDIS_LOCATION,
            prefix='feature-flags',
            caching=CacheConfig(expiration=30))
        ldclient.set_config(Config(
            settings.FEATURE_FLAGS_API_KEY,
            feature_store=store,
            http=HTTPConfig(connect_timeout=5)
        ))
    else:
        logger.debug('Set LaunchDarkly config without Redis...')
        ldclient.set_config(Config(settings.FEATURE_FLAGS_API_KEY, http=HTTPConfig(connect_timeout=5)))
    client = ldclient.get()


def _get_user_repr(user):
    """Turn user object into dict with required properties"""
    from users.serializers import UserSerializer
    if user.is_anonymous:
        return {'key': str(user)}
    user_data = UserSerializer(user).data
    user_data['key'] = user_data['email']
    logger.debug(f'Read user properties: {user_data}')
    return user_data


def flag_set(feature_flag, user):
    """Use this method to check whether this flag is set ON to the current user, to split the logic on backend
    For example,
    ```
    if flag_set('ff-dev-123-some-fixed-issue-231221-short', user):
        run_new_code()
    else:
        run_old_code()
    ```
    """
    user_dict = _get_user_repr(user)
    env_value = get_bool_env(feature_flag, default=None)
    if env_value is not None:
        return env_value
    return client.variation(feature_flag, user_dict, settings.FEATURE_FLAGS_DEFAULT_VALUE)


def all_flags(user):
    """Return the output of this method in API response, to bootstrap client-side flags.
    More on https://docs.launchdarkly.com/sdk/features/bootstrapping#javascript
    """
    logger.debug(f'Get all_flags request for {user}')
    user_dict = _get_user_repr(user)
    logger.debug(f'Resolve all flags state {user_dict}')
    state = client.all_flags_state(user_dict)
    logger.debug(f'State received: {state}')
    flags = state.to_json_dict()
    logger.debug(f'Flags received: {flags}')
    env_ff = get_all_env_with_prefix('ff_', is_bool=True)
    logger.debug(f'Override by flags from env: {env_ff}')
    for env_flag_name, env_flag_on in env_ff.items():
        flags[env_flag_name] = env_flag_on
    logger.debug(f'Requested all active feature flags: {flags}')
    return flags
