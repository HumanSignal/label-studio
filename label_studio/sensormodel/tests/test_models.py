from django.test import TestCase

from sensormodel.models import Sensor, Subject, Deployment

class TestSensorModel(TestCase):
    def setUp(self):
        Sensor.objects.create(sensor_id=1234, description= "Test 1")
    
    def test_create_sensor(self):
        sensor = Sensor.objects.get(sensor_id=1234)
        self.assertEqual(str(sensor),'Sensor: 1234')

class TestSubjectModel(TestCase):
    def setUp(self):
        Subject.objects.create(name='Horse', color= 'Grey', size= '2.10cm', extra_info = 'Lorem Ipsum')
        Subject.objects.create(name='Horse, no info', color= 'Grey', size= '2.10cm')

    def test_create_subject(self):
        subject = Subject.objects.get(name='Horse')
        self.assertEqual(str(subject),'Subject: Horse')
    
    def test_create_subject_no_extra_info(self):
        subject = Subject.objects.get(name='Horse, no info')
        self.assertEqual(str(subject),'Subject: Horse, no info')
        self.assertEqual(subject.extra_info, '')


class TestDeploymentModel(TestCase):
    def setUp(self):
        subject = Subject.objects.create(name='Horse', color= 'Grey', size= '2.10cm', extra_info = 'Lorem Ipsum')
        sensor1 = Sensor.objects.create(sensor_id=1234, description= "Test 1")
        sensor2 = Sensor.objects.create(sensor_id=1235, description= "Test 2")

        deployment = Deployment.objects.create(name='depl. 1', begin_datetime='2000-01-01 12:00:00', end_datetime='2000-01-01 13:00:00',location='neck')
        deployment.sensor.set([sensor1, sensor2])
        deployment.subject.set([subject])

    def test_create_deployment(self):
        deployment = Deployment.objects.get(name='depl. 1')
        self.assertEqual(str(deployment),'Deployment: depl. 1')

    def test_link_sensor_and_subject(self):
        deployment = Deployment.objects.get(name='depl. 1')
        deployment.CreateLists()
        self.assertEqual(deployment.sensorlist,'Sensor: 1234, Sensor: 1235')
        self.assertEqual(deployment.subjectlist,'Subject: Horse')
