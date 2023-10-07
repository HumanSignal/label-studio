from django import forms
from . import models
from projects.models import Project
from .models import MainProject

class CreateProject(forms.Form):
    project_name = forms.CharField(max_length=50, required=False)
    #optional_description = forms.CharField(max_length=250, required=False)

    def clean_project_name(self):
        project_name = self.cleaned_data.get('project_name')

        # Check if a MainProject with the same name already exists
        if MainProject.objects.filter(name=project_name).exists():
            raise forms.ValidationError("A project with this name already exists.")

        return project_name