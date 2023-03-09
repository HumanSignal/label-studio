from django.test import TestCase
from django.urls import reverse
from sensormodel.models import Deployment, Sensor 
from sensormodel.views import *


class TestTablePage(TestCase):
    def test_home_page(self):
        response = self.client.get('/sensormodel')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'tablepage.html','base.html')

class TestAdd(TestCase):
    def test_add_valid_deployment(self):
        data = {
            'name': 'depl. 1 valid', 
            'begin_datetime': '2000-01-01 12:00:00', 
            'end_datetime': '2000-01-01 13:00:00',
            'location': 'neck',
            'position': 'bottom'
        }
        self.client.post(reverse('sensormodel:add'),data)     
        self.assertTrue(Deployment.objects.filter(location='neck').exists())

    def test_add_invalid_deployment(self):
        data = {
            'name': 'depl. 1 valid', 
            'begin_datetime': '2001-01-01 12:00:00', 
            'end_datetime': '2000-01-01 13:00:00',
            'location': 'neck',
            'position': 'bottom'
        }
        self.client.post(reverse('sensormodel:add'),data)     
        self.assertFalse(Deployment.objects.filter(location='neck').exists())
    
    def test_add_subject(self):
        data = {
            'name':'Horse', 'color':  'Grey', 'size':  '2.10cm', 'extra_info':  'Lorem Ipsum'
        }
        self.client.post(reverse('sensormodel:add'),data)
        self.assertTrue(Subject.objects.filter(name= 'Horse').exists())

    def test_add_sensor(self):
        data = {
            'sensor_id': 1234, 'description': 'test'
        }
        self.client.post(reverse('sensormodel:add'),data)
        self.assertTrue(Sensor.objects.filter(sensor_id= 1234).exists())

class TestAdjust(TestCase):
    def setUp(self):
        Subject.objects.create(id = 1, name='Horse', color= 'Grey', size= '2.10cm', extra_info = 'Lorem Ipsum')
        Sensor.objects.create(id= 1, sensor_id=1234, description= "Test 1")

        Deployment.objects.create(id = 1, name='depl. 1', begin_datetime='2000-01-01 12:00:00', end_datetime='2000-01-01 13:00:00',location='neck')

    def test_adjust_deployemnt(self):
        changed_data = {
            'name': 'depl. 1 change', 
            'begin_datetime': '2000-01-01 12:00:00', 
            'end_datetime': '2000-01-01 13:00:00',
            'location': 'neck',
            'position': 'bottom'
        }
        self.client.post(reverse('sensormodel:adjust_deployment',kwargs={'id':1}),changed_data)
        deployment = Deployment.objects.get(id=1)
        self.assertEqual(deployment.name,'depl. 1 change')


    def test_adjust_subject(self):
        changed_data = {
            'name':'Cow', 'color':  'Grey', 'size':  '2.10cm', 'extra_info':  'Lorem Ipsum'
            }
        self.client.post(reverse('sensormodel:adjust_subject',kwargs={'id':1}),changed_data)
        subject = Subject.objects.get(id=1)
        self.assertEqual(subject.name,'Cow')


    def test_adjust_sensor(self):
        changed_data = {
            'sensor_id': 1235, 'description': 'test'
            }
        self.client.post(reverse('sensormodel:adjust_sensor',kwargs={'id':1}),changed_data)
        sensor = Sensor.objects.get(id=1)
        self.assertEqual(sensor.sensor_id, 1235)

class TestDeltete(TestCase):
    def setUp(self):
        Subject.objects.create(id = 1, name='Horse', color= 'Grey', size= '2.10cm', extra_info = 'Lorem Ipsum')
        Sensor.objects.create(id= 1, sensor_id=1234, description= "Test 1")

        Deployment.objects.create(id = 1, name='depl. 1', begin_datetime='2000-01-01 12:00:00', end_datetime='2000-01-01 13:00:00',location='neck')

    def test_confirm_before_deletion(self):
        response = self.client.get(reverse('sensormodel:delete_subject',kwargs={'id':1}))
        self.assertTemplateUsed(response, 'deleteconfirmation.html')

    def test_delete_deployemnt(self):
        self.assertTrue(Deployment.objects.filter(id=1).exists())
        response = self.client.post(reverse('sensormodel:delete_deployment',kwargs={'id':1}))
        self.assertEqual(response.status_code,302) #redirect
        self.assertFalse(Deployment.objects.filter(id=1).exists())

    def test_delete_subject(self):
        self.assertTrue(Subject.objects.filter(id=1).exists())
        response = self.client.post(reverse('sensormodel:delete_subject',kwargs={'id':1}))
        self.assertEqual(response.status_code,302) #redirect
        self.assertFalse(Subject.objects.filter(id=1).exists())


    def test_delete_sensor(self):
        self.assertTrue(Sensor.objects.filter(id=1).exists())
        response = self.client.post(reverse('sensormodel:delete_sensor',kwargs={'id':1}))
        self.assertEqual(response.status_code,302) #redirect
        self.assertFalse(Sensor.objects.filter(id=1).exists())


