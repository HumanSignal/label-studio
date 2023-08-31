from django import forms
from projects.models import Project

class SubjectAnnotationForm(forms.Form):
    project = forms.ModelChoiceField(Project.objects.filter(title__endswith='_dataimport'), label='Choose your project')