from django import forms
from . import models

class SensorForm(forms.ModelForm):
    class Meta:
        model = models.Sensor
        fields = ['sensor_id','description','manufacturer','name','version','parser_template']

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

            # self._errors['begin_datetime'] = self.error_class([
            #     'Begin date time must be before end date time.'])
            
        return cleaned_data