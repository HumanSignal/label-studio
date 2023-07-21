from django import forms
from . import models

class CreateProject(forms.Form):
    project_name = forms.CharField(max_length=50, required=False)
    #optional_description = forms.CharField(max_length=250, required=False)