from django.db import models
from projects.models import Project
from sensormodel.models import Sensor
from data_import.models import FileUpload

class SensorData(models.Model):
    name = models.CharField(blank=True,null=True, max_length=100)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True)
    begin_datetime = models.DateTimeField(blank=True,null=True)
    end_datetime = models.DateTimeField(blank=True,null=True)
    file_upload = models.ForeignKey(FileUpload, on_delete=models.CASCADE,blank= True, null=True, related_name='dataimport_file')
    file_upload_project2 = models.ForeignKey(FileUpload, on_delete=models.CASCADE,blank= True, null=True, related_name='subjectannotation_file')
    file_hash = models.CharField(max_length=10,blank=True,null=True)
    sensor = models.ForeignKey(Sensor,on_delete=models.CASCADE, null=True)

    def __str__(self):
        return f'Name: {self.name} | Sensor: {self.sensor}' 

class SensorOffset(models.Model):
    sensor_A = models.ForeignKey(Sensor, on_delete=models.CASCADE, null=True, related_name='SensorA_offsets')
    sensor_B = models.ForeignKey(Sensor, on_delete=models.CASCADE, null=True, related_name='SensorB_offsets')
    offset = models.IntegerField(blank=True, null=True)
    offset_Date = models.DateTimeField(blank=True, null=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True)