from django.db import models
from projects.models import Project

class SensorType(models.Model):
    SENSOR_CHOICES = (
        ('I', 'IMU'),
        ('C', 'Camera'),
        ('M', 'Microphone'),
    )
    sensortype = models.CharField(max_length=1, choices=SENSOR_CHOICES,default='I')
    manufacturer = models.CharField(max_length=50, blank=True)
    name = models.CharField(max_length=50, blank=True)
    version = models.CharField(max_length=50, blank=True)

    #IMU
    date_row = models.IntegerField(default= 1)
    time_row = models.IntegerField(default= 1)
    timestamp_column = models.IntegerField(default= 1)
    relative_absolute = models.CharField(default='relative', max_length=100)
    timestamp_unit = models.CharField(default='seconds', max_length=100)
    format_string = models.CharField(null=True, max_length=100)
    sensor_id_row = models.IntegerField(null=True, default= 1)
    sensor_id_column = models.IntegerField(null=True)
    sensor_id_regex = models.CharField(max_length=100, null=True)
    col_names_row = models.IntegerField(default= 1)
    comment_style = models.CharField(max_length=100, null=True)

    #Camera
    timezone = models.TextField(default='UTC')
    
    def __str__(self):
        return self.manufacturer + '| ' + self.name + '| ' + self.version

class Sensor(models.Model):
    name = models.TextField(max_length=25)
    parsable_sensor_id = models.CharField(max_length=25, default=None, null=True, blank=True)
    sensor_hash = models.CharField(max_length=10,blank=True)
    sensortype = models.ForeignKey(SensorType,on_delete=models.CASCADE, null=True, blank=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True)

    def __str__(self):
        return 'Sensor: ' + str(self.name)


class Subject(models.Model):
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=50)
    size = models.CharField(max_length=50)
    extra_info = models.TextField(max_length=100, blank=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True)
    
    def __str__(self):
        return 'Subject: ' + self.name


# Deployments are connections of subjects and sensors that are connected to the subject
class Deployment(models.Model): 
    name = models.CharField(max_length=50, blank=True)
    begin_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    location = models.TextField(max_length=50, blank=True)
    position = models.TextField(max_length=50, blank=True)

    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True)
    
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, blank=True, null=True) 
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, blank=True, null=True)
        
    def __str__(self):
        return 'Deployment: ' + self.name