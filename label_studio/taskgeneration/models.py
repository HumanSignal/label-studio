from django.db import models
from projects.models import Project
from sensormodel.models import Subject
from sensordata.models import SensorData


class VideoImuOverlap(models.Model):
    video = models.ForeignKey(SensorData, on_delete=models.CASCADE, null=True,related_name='video')
    imu = models.ForeignKey(SensorData, on_delete=models.CASCADE, null=True,related_name='imu')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True)

    start_video = models.FloatField(blank=True,null=True)
    end_video = models.FloatField(blank=True,null=True)
    start_imu = models.FloatField(blank=True,null=True)
    end_imu = models.FloatField(blank=True,null=True)
