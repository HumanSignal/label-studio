from django import forms
import zipfile
from django.core.exceptions import ValidationError
from sensormodel.models import Sensor
from sensordata.models import SensorOffset
from projects.models import Project

class SensorDataForm(forms.Form):
    sensor = forms.ModelChoiceField(Sensor.objects.all())
    file = forms.FileField()

    def __init__(self, *args, **kwargs):
        project = kwargs.pop('project', None)  # Remove 'project' from kwargs
        super(SensorDataForm, self).__init__(*args, **kwargs)

        # Filter the sensor queryset based on the provided project
        if project:
            self.fields['sensor'].queryset = Sensor.objects.filter(project=project)
    
    def clean_file(self):
        uploaded_file = self.cleaned_data.get('file')
        if uploaded_file:
            if not zipfile.is_zipfile(uploaded_file):
                raise ValidationError("Uploaded file must be a valid zipfile!")
        return uploaded_file


class SensorOffsetForm(forms.ModelForm):
    class Meta:
        model = SensorOffset
        fields = ['sensor_A', 'sensor_B', 'offset', 'offset_Date']

    def __init__(self, *args, **kwargs):
        project = kwargs.pop('project', None)  # Remove 'project' from kwarg
        super().__init__(*args, **kwargs)

        # Filter camera choices to show only sensors with sensortype 'C'
        if project:
            self.fields['sensor_A'].queryset = Sensor.objects.filter(project=project)

        # Filter imu choices to show only sensors with sensortype 'I'
        if project:
            self.fields['sensor_B'].queryset = Sensor.objects.filter(project=project)