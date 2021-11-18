"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""  # noqa: E501

from django.forms import CharField, FileField, Form, HiddenInput, ModelForm, Select, Textarea, TextInput

from .models import Organization, OrganizationMember


class OrganizationForm(ModelForm):
    """ """

    org_update = CharField(widget=HiddenInput(), required=False)

    class Meta:
        model = Organization
        fields = ("title",)


class OrganizationSignupForm(ModelForm):
    """ """

    class Meta:
        model = Organization
        fields = ("title",)
