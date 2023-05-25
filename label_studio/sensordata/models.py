from django.db import models
from sensormodel.models import SensorType, Sensor



class SensorData(models.Model):
    name = models.CharField(blank=True,null=True, max_length=100)
    project_id = models.IntegerField(blank=True,null=True)
    begin_datetime = models.DateTimeField(blank=True,null=True)
    end_datetime = models.DateTimeField(blank=True,null=True)
    file_hash = models.CharField(max_length=10,blank=True,null=True)
    sensortype = models.ForeignKey(SensorType,on_delete=models.CASCADE, null=True)


class SensorOffset(models.Model):
    sensor_A = models.ForeignKey(Sensor, on_delete=models.CASCADE, null=True, related_name='SensorA_offsets')
    sensor_B = models.ForeignKey(Sensor, on_delete=models.CASCADE, null=True, related_name='SensorB_offsets')
    offset = models.IntegerField(blank=True, null=True)
    offset_Date = models.DateTimeField(blank=True, null=True)
