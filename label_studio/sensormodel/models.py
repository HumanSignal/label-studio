from django.db import models

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
    sensor_id = models.IntegerField()
    description = models.TextField(max_length=100, blank=True)
    sensor_hash = models.CharField(max_length=10,blank=True)
    sensortype = models.ForeignKey(SensorType,on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return 'Sensor: ' + str(self.sensor_id)


class Subject(models.Model):
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=50)
    size = models.CharField(max_length=50)
    extra_info = models.TextField(max_length=100, blank=True)
    
    def __str__(self):
        return 'Subject: ' + self.name


# Deployments are connections of subjects and sensors that are connected to the subject
class Deployment(models.Model): 
    name = models.CharField(max_length=50, blank=True)
    begin_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    location = models.TextField(max_length=50)
    position = models.TextField(max_length=50, blank=True)
    
    sensor = models.ManyToManyField(Sensor,blank=True)
    subject = models.ManyToManyField(Subject,blank=True) 
    sensorlist = models.TextField(max_length=500,blank=True)
    subjectlist = models.TextField(max_length=500,blank =True)

    # Function that puts all sensors and all subjects in two list, for easier display in HTML table
    def CreateLists(self):
        sensList = self.sensor.all()
        for sens in sensList:
            self.sensorlist += str(sens) + ', '
        self.sensorlist = self.sensorlist[:-2]
        subjlist = self.subject.all()
        for subj in subjlist:
            self.subjectlist += str(subj)+ ', '
        self.subjectlist = self.subjectlist[:-2]
        
    def __str__(self):
        return 'Deployment: ' + self.name



