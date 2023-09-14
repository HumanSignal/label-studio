"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from django.forms import CharField, HiddenInput, ModelForm

from .models import Organization


class OrganizationForm(ModelForm):
    """ """

    org_update = CharField(widget=HiddenInput(), required=False)

    class Meta:
        model = Organization
        fields = ('title',)


class OrganizationSignupForm(ModelForm):
    """ """

    class Meta:
        model = Organization
        fields = ('title',)
