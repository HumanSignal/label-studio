"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import uuid

from django import forms
from django.conf import settings
from django.core.files.images import get_image_dimensions


def hash_upload(instance, filename):
    filename = str(uuid.uuid4())[0:8] + '-' + filename
    return settings.AVATAR_PATH + filename


def check_avatar(files):
    images = list(files.items())
    if not images:
        return None

    filename, avatar = list(files.items())[0]  # get first file
    w, h = get_image_dimensions(avatar)
    if not w or not h:
        raise forms.ValidationError("Can't read image, try another one")

    # validate dimensions
    max_width = max_height = 1200
    if w > max_width or h > max_height:
        raise forms.ValidationError('Please use an image that is %s x %s pixels or smaller.'
                                    % (max_width, max_height))

    # validate content type
    main, sub = avatar.content_type.split('/')
    if not (main == 'image' and sub.lower() in ['jpeg', 'jpg', 'gif', 'png']):
        raise forms.ValidationError(u'Please use a JPEG, GIF or PNG image.')

    # validate file size
    max_size = 1024 * 1024
    if len(avatar) > max_size:
        raise forms.ValidationError('Avatar file size may not exceed ' + str(max_size/1024) + ' kb')

    return avatar
