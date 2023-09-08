from django.conf import settings


def event_processor(event, hint):
    # skip all transactions without errors
    if 'exc_info' not in hint:
        return None

    # skip specified exceptions
    exceptions = event.get('exception', {}).get('values', [{}])
    last = exceptions[-1]
    if last.get('type') in [
        'Http404',
        'NotAuthenticated',
        'AuthenticationFailed',
        'NotFound',
        'XMLSyntaxError',
        'FileUpload.DoesNotExist',
        'Forbidden',
        'KeyboardInterrupt',
    ]:
        return None

    # sentry ignored factory class
    if 'SentryIgnored' in last.get('type'):
        return None

    if last.get('type') == 'OperationalError':
        value = last.get('value')
        messages = [
            'sorry, too many clients already',
            'Name or service not known',
            'could not connect to server',
            'the database system is shutting down',
            'remaining connection slots are reserved for non-replication superuser connections',
            'unable to open database file',
        ]
        for message in messages:
            if message in value:
                return None

    if last.get('type') == 'OSError':
        value = last.get('value')
        messages = [
            'Too many open files: ',
        ]
        for message in messages:
            if message in value:
                return None

    # special flag inside of logger.error(..., extra={'sentry_skip': True}) to skip error message
    if event.get('extra', {}).get('sentry_skip', False):
        return None

    # skip transactions by urls
    if event.get('transaction') in [
        '/static/{path}',
        '/dm/{path}',
        '/react-app/{path}',
        '/label-studio-frontend/{path}',
        '/favicon.ico',
        '/health',
    ]:
        return None

    return event  # to return all other events


def init_sentry(release_name, release_version):
    if settings.SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration

        if settings.SENTRY_REDIS_ENABLED:
            from sentry_sdk.integrations.redis import RedisIntegration
            from sentry_sdk.integrations.rq import RqIntegration

            advanced = [RedisIntegration(), RqIntegration()]
        else:
            advanced = []

        # define the event processor, this runs before before_send if enabled
        sentry_sdk.scope.add_global_event_processor(event_processor)

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            integrations=[DjangoIntegration()] + advanced,
            traces_sample_rate=settings.SENTRY_RATE,
            send_default_pii=True,
            environment=settings.SENTRY_ENVIRONMENT,
            release=release_name + '@' + str(release_version),
        )
