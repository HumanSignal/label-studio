from django.db import models
from data_import.models import FileUpload
from projects.models import Project
from sensormodel.models import Subject

class SubjectPresence(models.Model):
    file_upload = models.ForeignKey(FileUpload, on_delete=models.CASCADE, null=True)
    project = models.ForeignKey(Project,on_delete=models.CASCADE, blank=True,null=True)
    subject = models.ForeignKey(Subject,on_delete=models.CASCADE, blank=True,null=True)
    start_time = models.FloatField(blank=True,null=True)
    end_time = models.FloatField(blank=True,null=True)

