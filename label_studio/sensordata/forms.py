from django import forms
from sensormodel import models as sensormodelmodels
from . import models


class SensorDataForm(forms.Form):
    name = forms.CharField(max_length=100, required=False)
    sensor = forms.ModelChoiceField(sensormodelmodels.Sensor.objects.all())
    file = forms.FileField()

class SensorOffsetForm(forms.ModelForm):
    class Meta:
        model = models.SensorOffset
        fields = ['sensor_A', 'sensor_B', 'offset', 'offset_Date']