"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.conf import settings

from label_studio.core.utils.common import load_func


def get_storage_classes(storage_type='import'):
    """Helper function to return all registered ***ImportStorage classes.
    It's been made through the APIViews rather than using models directly to make it consistent with what we expose.
    Note: this func doesn't include LocalFiles storages!
    storage_type: import, export
    """
    storage_list = load_func(settings.GET_STORAGE_LIST)
    storage_classes = []
    for storage_decl in storage_list():
        storage_api_class = storage_decl[f'{storage_type}_list_api']
        storage_classes.append(storage_api_class.serializer_class.Meta.model)
    return storage_classes
