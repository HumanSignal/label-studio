from django.db import models
from data_import.models import FileUpload

class SubjectPresence(models.Model):
    file_upload = models.ForeignKey(FileUpload, on_delete=models.CASCADE, null=True)
    project_id = models.IntegerField(blank=True,null=True)
    start_time = models.FloatField(blank=True,null=True)
    end_time = models.FloatField(blank=True,null=True)

