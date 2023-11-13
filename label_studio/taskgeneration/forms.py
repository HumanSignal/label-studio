from django import forms
from projects.models import Project
from sensormodel.models import Subject

class TaskGenerationForm_dead(forms.Form):
    project = forms.ModelChoiceField(Project.objects.all(),
                                     help_text="Choose the subject annotation project",
                                     label="Subject annotation project")
    subject = forms.ModelChoiceField(Subject.objects.all(),
                                     help_text="Choose the subject for which tasks should be generated",
                                     label="Subject")
    segment_duration = forms.IntegerField(min_value=1,
                                          help_text="Choose the duration of each annotation segment",
                                          label="Segment duration")
    
class TaskGenerationForm(forms.Form):
    subject = forms.ModelChoiceField(
        queryset=Subject.objects.all(),
        help_text="Choose the subject for which tasks should be generated",
        label="Subject",
        required=True
    )

    segment_duration = forms.IntegerField(
        min_value=1,
        help_text="Choose the duration of each annotation segment",
        label="Segment duration",
        required=True
    )

    column_name = forms.ChoiceField(
        choices=(),  
        required=True
    )

    def __init__(self, *args, **kwargs):
        project = kwargs.pop('project', None) 
        column_names_choices = kwargs.pop('column_names_choices', None)
        super(TaskGenerationForm, self).__init__(*args, **kwargs)
        
        if column_names_choices:
            self.fields['column_name'].choices = column_names_choices

        if project:
            self.fields['subject'].queryset = Subject.objects.filter(project=project)
