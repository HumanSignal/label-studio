from django.db import models

# Create your models here.
class MainProject(models.Model):
    name = models.CharField(max_length=50)
    project_id = models.IntegerField()

    def __str__(self):
        return 'Project: ' + self.name