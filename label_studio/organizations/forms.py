"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from .models import Organization, OrganizationMember


from django.forms import Textarea, ModelForm, TextInput, Form, FileField, Select, HiddenInput, CharField


class OrganizationForm(ModelForm):  # type: ignore[type-arg]
    """
    """
    org_update = CharField(widget=HiddenInput(), required=False)
    
    class Meta:
        model = Organization
        fields = ('title',)


class OrganizationSignupForm(ModelForm):  # type: ignore[type-arg]
    """
    """
    class Meta:
        model = Organization
        fields = ('title',)
