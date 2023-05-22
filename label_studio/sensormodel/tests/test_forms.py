from django.test import TestCase

from sensormodel.forms import DeploymentForm

class TestDeploymentForm(TestCase):
    def test_begindate_before_enddate(self):
        baddeploymentform = DeploymentForm(data={'name': 'depl. 1', 'begin_datetime': '2001-01-01 12:00:00', 'end_datetime': '2000-01-01 13:00:00','location': 'neck'})
    
        self.assertEqual(
            baddeploymentform.errors['begin_datetime'], ['Begin date time must be before end date time.']
        )