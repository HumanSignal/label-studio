"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.conf import settings as django_settings
from core.utils.common import collect_versions
from core.feature_flags import all_flags  # type: ignore[attr-defined]


def sentry_fe(request):  # type: ignore[no-untyped-def]
    # return the value you want as a dictionary, you may add multiple values in there
    return {
        'SENTRY_FE': django_settings.SENTRY_FE  # type: ignore[misc]
    }


def settings(request):  # type: ignore[no-untyped-def]
    """ Make available django settings on each template page
    """
    versions = collect_versions()  # type: ignore[no-untyped-call]

    # django templates can't access names with hyphens
    versions['lsf'] = versions.get('label-studio-frontend', {})
    versions['lsf']['commit'] = versions['lsf'].get('commit', 'none')[0:6]

    versions['backend'] = {}
    if 'label-studio-os-backend' in versions:
        versions['backend']['commit'] = versions['label-studio-os-backend'].get('commit', 'none')[0:6]
    if 'label-studio-enterprise-backend' in versions:
        versions['backend']['commit'] = versions['label-studio-enterprise-backend'].get('commit', 'none')[0:6]

    if 'dm2' in versions:
        versions['dm2']['commit'] = versions['dm2'].get('commit', 'none')[0:6]

    feature_flags = {}
    if hasattr(request, 'user'):
        feature_flags = all_flags(request.user)  # type: ignore[no-untyped-call]

    return {
        'settings': django_settings,
        'versions': versions,
        'feature_flags': feature_flags
    }
