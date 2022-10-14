from django.db import models

class Sensor(models.Model):
    sensor_id = models.IntegerField()
    description = models.TextField(max_length=100)

    def __str__(self):
        return str(self.sensor_id) + ' | ' + self.description

class Subject(models.Model):
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=50)
    size = models.CharField(max_length=50)
    extra_info = models.TextField(max_length=100)

    def __str__(self):
        return 'Subject: ' + self.name


class Deployment(models.Model):
    begin_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    location = models.TextField(max_length=50)
    position = models.TextField(max_length=50)
    
    sensor = models.ManyToManyField(Sensor)
    subject = models.ManyToManyField(Subject)

    sensorlist = models.TextField(max_length=200)
    subjectlist = models.TextField(max_length=200)

    def CreateLists(self):
        self.sensorlist = str(self.sensor.all())[11:-2]
        self.subjectlist = str(self.subject.all())[11:-2]
        return 

    def __str__(self):
        return 'Deployment: ' + self.id


