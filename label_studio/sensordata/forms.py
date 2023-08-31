from django import forms
from sensormodel.models import Sensor
from sensordata.models import SensorOffset
from projects.models import Project

class SensorDataForm(forms.Form):
    name = forms.CharField(max_length=100, required=False)
    sensor = forms.ModelChoiceField(Sensor.objects.all())
    project = forms.ModelChoiceField(Project.objects.filter(title__endswith='_dataimport'))
    file = forms.FileField()

class SensorOffsetForm(forms.ModelForm):
    class Meta:
        model = SensorOffset
        fields = ['camera', 'imu', 'offset', 'offset_Date']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Filter camera choices to show only sensors with sensortype 'C'
        self.fields['camera'].queryset = Sensor.objects.filter(sensortype__sensortype='C')

        # Filter imu choices to show only sensors with sensortype 'I'
        self.fields['imu'].queryset = Sensor.objects.filter(sensortype__sensortype='I')