from django import forms
from sensormodel import models as sensormodelmodels

class SubjectAnnotationForm(forms.Form):
    deployment = forms.ModelChoiceField(sensormodelmodels.Deployment.objects.all())
    file = forms.FileField()