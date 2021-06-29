from django.conf import *


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

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            integrations=[DjangoIntegration()] + advanced,
            traces_sample_rate=settings.SENTRY_RATE,
            send_default_pii=True,
            environment=settings.SENTRY_ENVIRONMENT,
            release=release_name + '@' + str(release_version)
        )
