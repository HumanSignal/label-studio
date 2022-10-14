from socket import fromshare
from django import forms
from . import models

class CreateSensor(forms.ModelForm):
    class Meta:
        model = models.Sensor
        fields = ['sensor_id','description']

class CreateSubject(forms.ModelForm):
    class Meta:
        model = models.Subject
        fields = ['name','color','size','extra_info']

class CreateDeployment(forms.ModelForm):
    class Meta:
        model = models.Deployment
        fields = ['begin_datetime','end_datetime','location','sensor','subject']

