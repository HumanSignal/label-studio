import ldclient
import logging

from ldclient.config import Config, HTTPConfig
from ldclient.integrations import Files, Redis
from ldclient.feature_store import CacheConfig

from label_studio.core.utils.params import get_bool_env, get_all_env_with_prefix
from label_studio.core.utils.io import find_file

logger = logging.getLogger(__name__)

ff_client = None


def initialize_feature_flags_from_file(file_path):
    global ff_client
    feature_flags_file = find_file(file_path)
    logger.info(f'Read flags from file {feature_flags_file}')
    data_source = Files.new_data_source(paths=[feature_flags_file])
    config = Config(
        sdk_key='whatever',
        update_processor_class=data_source,
        send_events=False)
    ldclient.set_config(config)
    ff_client = ldclient.get()


def initialize_feature_flags_offline():
    global ff_client

    # On-prem usage, without feature flags file
    ldclient.set_config(Config('whatever', offline=True))
    ff_client = ldclient.get()


def initialize_feature_flags_with_redis_store(api_key, redis_location):
    global ff_client
    # Production usage
    logger.debug('Set LaunchDarkly config...')
    store = Redis.new_feature_store(
        url=redis_location,
        prefix='feature-flags',
        caching=CacheConfig(expiration=30))
    ldclient.set_config(Config(
        api_key,
        http=HTTPConfig(connect_timeout=5),
        feature_store=store
    ))
    logger.debug('Get LaunchDarkly client...')
    ff_client = ldclient.get()


def _check_client():
    if ff_client is None:
        raise ValueError(
            'Feature Flag client is not initialized: you have to initialize it by calling \n'
            'initialize_feature_flags_from_file(), '
            'initialize_feature_flags_offline() or '
            'initialize_feature_flags_with_redis_store() '
            'from your settings.py file'
        )


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
    _check_client()
    user_dict = _get_user_repr(user)
    default_value = get_bool_env(feature_flag, False)
    is_on = ff_client.variation(feature_flag, user_dict, default_value)
    return is_on


def all_flags(user):
    """Return the output of this method in API response, to bootstrap client-side flags.
    More on https://docs.launchdarkly.com/sdk/features/bootstrapping#javascript
    """
    _check_client()
    logger.debug(f'Get all_flags request for {user}')
    user_dict = _get_user_repr(user)
    logger.debug(f'Resolve all flags state {user_dict}')
    state = ff_client.all_flags_state(user_dict)
    logger.debug(f'State received: {state}')
    flags = state.to_json_dict()
    logger.debug(f'Flags received: {flags}')
    env_ff = get_all_env_with_prefix('ff_')
    logger.debug(f'Read flags from env: {env_ff}')
    for env_flag_name, env_flag_on in env_ff.items():
        if env_flag_name not in flags and env_flag_on:
            flags[env_flag_name] = True
    logger.debug(f'Requested all active feature flags: {flags}')
    return flags
