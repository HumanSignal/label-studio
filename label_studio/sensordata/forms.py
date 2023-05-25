from django import forms
from sensormodel.models import Sensor
from sensordata.models import SensorOffset
from projects.models import Project

class SensorDataForm(forms.Form):
    name = forms.CharField(max_length=100, required=False)
    sensor = forms.ModelChoiceField(Sensor.objects.all())
    project = forms.ModelChoiceField(Project.objects.all())
    file = forms.FileField()

class SensorOffsetForm(forms.ModelForm):
    class Meta:
        model = SensorOffset
        fields = ['sensor_A', 'sensor_B', 'offset', 'offset_Date']

