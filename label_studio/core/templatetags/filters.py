"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import re
import json
from django import template
from datetime import datetime
from django.utils.safestring import mark_safe
from django.conf import settings
from django.template.loader_tags import do_include

register = template.Library()


@register.filter
def initials(val, jn=""):
    """ Given a string return its initials join by $jn
    """
    res = []
    parts = val.split(' ')
    if len(parts) <= 1:
        parts = re.findall('[A-Z][^A-Z]*', val)
        print(parts)

    if len(parts) > 1:
        res = [ parts[0][0], parts[1][0] ]
    elif len(parts) == 1:
        res = [ val[0], val[1] ]
        
    return jn.join(res).upper()
        

@register.filter
def get_at_index(l, index):
    return l[index]


@register.filter
def get_item(dictionary, key):
    return dictionary.get(key, None)


@register.filter
def json_dumps_ensure_ascii(dictionary):
    return json.dumps(dictionary, ensure_ascii=False)


@register.filter
def json_escape_quote(data):
    data_str = json.dumps(data, ensure_ascii=False)
    return data_str.replace("'", "\\'")


@register.filter
def escape_lt_gt(s):
    return s.replace('<', '&lt;').replace('>', '&gt;')


@register.filter
def datetime2str(d):
    if isinstance(d, str):
        return d
    return d.strftime('%Y-%m-%d %H:%M:%S')


@register.filter
def start_zero_padding(number):
    return '%5.5i' % number


@register.filter
def collaborator_id_in_url(id_, url):
    return ('collaborator_id=' + str(id_)) in url


@register.filter
def date_for_license(date):
    if isinstance(date, str):
        date = datetime.strptime(date, '%Y-%m-%d')
    return date.strftime("%d %b %Y %H:%M")


@register.filter
def current_date(some):
    return datetime.now()


@register.filter
def is_current_date_greater_than(date):
    if date is None:
        return False
    if isinstance(date, str):
        date = datetime.strptime(date, '%Y-%m-%d')
    return datetime.now() > date


@register.filter
def multiply(value, arg):
    return value * arg


@register.simple_tag
def custom_autocomplete(key=''):
    if settings.LICENSE.get('disable_autocomplete', False):
        if key == 'password':
            return mark_safe('autocomplete="new-password"')
        return mark_safe('autocomplete="off"')
    else:
        return ''


@register.simple_tag(takes_context=True)
def var_exists(context, name):
    dicts = context.dicts  # array of dicts
    if dicts:
        for d in dicts:
            if name in d:
                return True
    return False


class TryIncludeNode(template.Node):
    """
    A Node that instantiates an IncludeNode but wraps its render() in a
    try/except in case the template doesn't exist.
    """
    def __init__(self, parser, token):
        self.include_node = do_include(parser, token)

    def render(self, context):
        try:
            return self.include_node.render(context)
        except template.TemplateDoesNotExist:
            return ''


@register.tag('try_include')
def try_include(parser, token):
    """
    Include the specified template but only if it exists.
    """
    return TryIncludeNode(parser, token)
