from django import forms
from projects.models import Project
from sensormodel.models import Subject

class TaskGenerationForm(forms.Form):
    project = forms.ModelChoiceField(Project.objects.all(),
                                     help_text="Choose the subject annotation project",
                                     label="Subject annotation project")
    subject = forms.ModelChoiceField(Subject.objects.all(),
                                     help_text="Choose the subject for which tasks should be generated",
                                     label="Subject")
    segment_duration = forms.IntegerField(min_value=1,
                                          help_text="Choose the duration of each annotation segment",
                                          label="Segment duration")