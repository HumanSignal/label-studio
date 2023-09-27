"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import uuid
from time import time

from core.utils.common import load_func
from django import forms
from django.conf import settings
from django.contrib import auth
from django.core.files.images import get_image_dimensions
from django.shortcuts import redirect
from django.urls import reverse
from organizations.models import Organization


def hash_upload(instance, filename):
    filename = str(uuid.uuid4())[0:8] + '-' + filename
    return settings.AVATAR_PATH + '/' + filename


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
        raise forms.ValidationError('Please use an image that is %s x %s pixels or smaller.' % (max_width, max_height))

    # validate content type
    main, sub = avatar.content_type.split('/')
    if not (main == 'image' and sub.lower() in ['jpeg', 'jpg', 'gif', 'png']):
        raise forms.ValidationError('Please use a JPEG, GIF or PNG image.')

    # validate file size
    max_size = 1024 * 1024
    if len(avatar) > max_size:
        raise forms.ValidationError('Avatar file size may not exceed ' + str(max_size / 1024) + ' kb')

    return avatar


def save_user(request, next_page, user_form):
    """Save user instance to DB"""
    user = user_form.save()
    user.username = user.email.split('@')[0]
    user.save()

    if Organization.objects.exists():
        org = Organization.objects.first()
        org.add_user(user)
    else:
        org = Organization.create_organization(created_by=user, title='Label Studio')
    user.active_organization = org
    user.save(update_fields=['active_organization'])

    request.advanced_json = {
        'email': user.email,
        'allow_newsletters': user.allow_newsletters,
        'update-notifications': 1,
        'new-user': 1,
    }
    redirect_url = next_page if next_page else reverse('projects:project-index')
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    return redirect(redirect_url)


def proceed_registration(request, user_form, organization_form, next_page):
    """Register a new user for POST user_signup"""
    # save user to db
    save_user = load_func(settings.SAVE_USER)
    response = save_user(request, next_page, user_form)

    return response


def login(request, *args, **kwargs):
    request.session['last_login'] = time()
    return auth.login(request, *args, **kwargs)
