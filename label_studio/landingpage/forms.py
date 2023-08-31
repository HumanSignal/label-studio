from django import forms
from . import models
from projects.models import Project

class CreateProject(forms.Form):
    project_name = forms.CharField(max_length=50, required=False)
    #optional_description = forms.CharField(max_length=250, required=False)

class ExportProject(forms.Form):
    project = forms.ModelChoiceField(Project.objects.filter(title__endswith='_dataimport'), label='Choose your project')