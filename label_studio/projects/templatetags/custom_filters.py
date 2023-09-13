"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django import template

register = template.Library()


@register.filter(name='seconds_to_pretty_time')
def seconds_to_pretty_time(value, show_seconds=False):
    if value is None:
        return 'N/A'
    if value < 60:
        value = int(value)
        if show_seconds:
            return f'{value} second' + ('s' if value > 1 else '')
        return '< 1 minute'
    if value < 3600:
        m = int(value / 60.)
        if m == 1:
            return '1 minute'
        else:
            return f'{m} minutes'
    h = int(value / 3600)
    if h == 1:
        return '1 hour'
    else:
        return f'{h} hours'
