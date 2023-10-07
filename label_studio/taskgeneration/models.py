from django.db import models
from projects.models import Project
from sensormodel.models import Subject
from sensordata.models import SensorData


class SensorOverlap(models.Model):
    sensordata_A = models.ForeignKey(SensorData, on_delete=models.CASCADE, null=True,related_name='sensor_A')
    sensordata_B = models.ForeignKey(SensorData, on_delete=models.CASCADE, null=True,related_name='sensor_B')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True)

    start_A = models.FloatField(blank=True,null=True)
    end_A = models.FloatField(blank=True,null=True)
    start_B = models.FloatField(blank=True,null=True)
    end_B = models.FloatField(blank=True,null=True)