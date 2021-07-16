from django.conf import *


def event_processor(event, hint):
    # static loading
    if event.get("transaction") == "/react-app/{path}":
        return None
    # Http 404 erros
    if event.get('exception', {}).get('values', [{}])[-1].get('type') == 'Http404':
        return None

    return event  # to return all other events


def init_sentry(release_name, release_version):
    if settings.SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration
        from sentry_sdk.scope import add_global_event_processor
        from core.utils.exceptions import (
            LabelStudioErrorSentryIgnored, LabelStudioAPIExceptionSentryIgnored,
            LabelStudioValidationErrorSentryIgnored
        )

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
            ignore_errors=[
                LabelStudioErrorSentryIgnored,
                LabelStudioAPIExceptionSentryIgnored,
                LabelStudioValidationErrorSentryIgnored]
        )
