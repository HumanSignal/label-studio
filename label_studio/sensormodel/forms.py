from django import forms
from . import models
from .models import Deployment

class SensorForm(forms.ModelForm):
    class Meta:
        model = models.Sensor
        fields = ['sensor_id','description','sensortype']

class SubjectForm(forms.ModelForm):
    class Meta:
        model = models.Subject
        fields = ['name','color','size','extra_info']

class DeploymentForm(forms.ModelForm):
    class Meta:
        model = models.Deployment
        fields = ['name','begin_datetime','end_datetime','location','sensor','subject']

    def clean(self):
        cleaned_data = super(DeploymentForm, self).clean()
         
        begin_datetime = cleaned_data.get('begin_datetime')
        end_datetime = cleaned_data.get('end_datetime')

        if begin_datetime and end_datetime:
            if  begin_datetime >= end_datetime:
                self.add_error('begin_datetime','Begin date time must be before end date time.')

        sensors = cleaned_data.get('sensor')
        deployments = Deployment.objects.all()

        overlap_begin, overlapping_deployment_begin  = False, []
        overlap_end, overlapping_deployment_end = False, []

        for sensor in sensors:
            for deployment in deployments:
                if sensor in deployment.sensor.all():
                    if deployment.begin_datetime >= begin_datetime and deployment.begin_datetime <= end_datetime:
                        overlapping_deployment_begin.append(str(deployment))
                        overlap_begin = True
                    if deployment.end_datetime >= begin_datetime and deployment.end_datetime <= end_datetime:
                        overlapping_deployment_end.append(str(deployment))
                        overlap_end = True                   


        if overlap_begin:
            depl_list = ' '.join(overlapping_deployment_begin)
            self.add_error('begin_datetime','Begin datetime overlaps with deployment(s): ' + depl_list)

        if overlap_end:
            depl_list = ' '.join(overlapping_deployment_end)
            self.add_error('end_datetime','End datetime overlaps with deployment(s): ' + depl_list)

          
        return cleaned_data