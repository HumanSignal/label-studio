from django import forms
from . import models
from .models import Deployment, Sensor, Subject

class SensorForm(forms.ModelForm):
    class Meta:
        model = models.Sensor
        fields = ['name','parsable_sensor_id','sensortype']

        def __init__(self, *args, **kwargs):
            project = kwargs.pop('project', None)
            super(SubjectForm, self).__init__(*args, **kwargs)
            self.instance.project = project

        def clean_name(self):
            name = self.cleaned_data.get('name')
            project = self.instance.project
            existing_sensor = Sensor.objects.filter(name=name, project=project)
            if existing_sensor.exists():
                raise forms.ValidationError("A sensor with this name already exists in the project.")

            return name

class SubjectForm(forms.ModelForm):
    class Meta:
        model = models.Subject
        fields = ['name','color','size','extra_info']
    
    def __init__(self, *args, **kwargs):
        project = kwargs.pop('project', None)
        super(SubjectForm, self).__init__(*args, **kwargs)
        self.instance.project = project
    
    def clean_name(self):
        name = self.cleaned_data.get('name')
        project = self.instance.project
        existing_subject = Subject.objects.filter(name=name, project=project)
        if existing_subject.exists():
            raise forms.ValidationError("A subject with this name already exists in the project.")

        return name


class DeploymentForm(forms.ModelForm):
    class Meta:
        model = models.Deployment
        fields = ['name','begin_datetime','end_datetime','location','sensor','subject']

    def __init__(self, *args, **kwargs):
        project = kwargs.pop('project', None)  
        super(DeploymentForm, self).__init__(*args, **kwargs)

        # Filter the sensor queryset based on the provided project
        if project:
            self.fields['sensor'].queryset = Sensor.objects.filter(project=project)

        # Filter the subject queryset based on the provided project
        if project:
            self.fields['subject'].queryset = Subject.objects.filter(project=project)

    def clean(self):
        # Function used for form validation
        cleaned_data = super(DeploymentForm, self).clean()
         
        begin_datetime = cleaned_data.get('begin_datetime')
        end_datetime = cleaned_data.get('end_datetime')
        
        #Check if begin_datetime is before end_datetime
        if begin_datetime and end_datetime:
            if  begin_datetime >= end_datetime:
                self.add_error('begin_datetime','Begin date time must be before end date time.')

        sensor = cleaned_data.get('sensor')
        deployments = Deployment.objects.all()

        overlap_begin, overlapping_deployment_begin  = False, []
        overlap_end, overlapping_deployment_end = False, []

        # Check if there are other deployments that include the same sensor or subject during the same datetime,
        # this may not be possible
        
        for deployment in deployments:
            if deployment.sensor == sensor:
                if deployment.begin_datetime >= begin_datetime and deployment.begin_datetime <= end_datetime:
                    overlapping_deployment_begin.append(str(deployment))
                    overlap_begin = True
                if deployment.end_datetime >= begin_datetime and deployment.end_datetime <= end_datetime:
                    overlapping_deployment_end.append(str(deployment))
                    overlap_end = True                   

        # Displaying the correct error for the user
        if overlap_begin:
            depl_list = ' '.join(overlapping_deployment_begin)
            self.add_error('begin_datetime','Begin datetime overlaps with deployment(s): ' + depl_list)

        if overlap_end:
            depl_list = ' '.join(overlapping_deployment_end)
            self.add_error('end_datetime','End datetime overlaps with deployment(s): ' + depl_list)

          
        return cleaned_data
    
class DeploymentForm2(DeploymentForm):
    def clean(self):
        # Function used for form validation
        cleaned_data = super(DeploymentForm, self).clean()
        
        begin_datetime = cleaned_data.get('begin_datetime')
        end_datetime = cleaned_data.get('end_datetime')
        
        #Check if begin_datetime is before end_datetime
        if begin_datetime and end_datetime:
            if  begin_datetime >= end_datetime:
                self.add_error('begin_datetime','Begin date time must be before end date time.')

        #sensors = cleaned_data.get('sensor')
        #deployments = Deployment.objects.all()  
        
        return cleaned_data