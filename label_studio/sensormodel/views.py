from django.shortcuts import render, redirect
from .models import Sensor, Deployment,  Subject
from . import forms

# Create your views here.
def tablepage(request):
    sensors = Sensor.objects.all().order_by('sensor_id')
    subjects = Subject.objects.all().order_by('name')
    deployments = Deployment.objects.all().order_by('begin_datetime')
    for deployment in deployments:
        deployment.CreateLists()
    return render(request, 'tablepage.html', {'sensors': sensors, 'subjects': subjects, 'deployments': deployments})

def add(request):
    if request.method == 'POST':
        sensorform = forms.CreateSensor(request.POST)
        if sensorform.is_valid():
            sensorform.save()
            return redirect('sensormodel:tablepage')
        subjectform = forms.CreateSubject(request.POST)
        if subjectform.is_valid():
            subjectform.save()
            return redirect('sensormodel:tablepage')
        deploymentform = forms.CreateDeployment(request.POST)
        if deploymentform.is_valid():
            deploymentform.save()
            return redirect('sensormodel:tablepage')
    else:
        sensorform = forms.CreateSensor(request.POST)
        subjectform = forms.CreateSubject(request.POST)
        deploymentform = forms.CreateDeployment(request.POST)
    return render(request, 'add.html', {'sensorform':sensorform, 'subjectform':subjectform, 'deploymentform':deploymentform})


def adjust_deployment(request, id):
    deployment = Deployment.objects.get(id=id)
    if request.method == 'POST':
        deploymentform = forms.CreateDeployment(request.POST, instance=deployment)
        if deploymentform.is_valid():
            deploymentform.save()
            return redirect('sensormodel:tablepage')
    else:
        deploymentform = forms.CreateDeployment(instance=deployment)
    return render(request, 'deployment.html', {'deploymentform':deploymentform})
    
def adjust_sensor(request, id):
    sensor = Sensor.objects.get(id=id)
    if request.method == 'POST':
        sensorform = forms.CreateSensor(request.POST,instance=sensor)
        if sensorform.is_valid():
            sensorform.save()
            return redirect('sensormodel:tablepage')
    else:
        sensorform = forms.CreateSensor(instance=sensor)
    return render(request, 'sensor.html', {'sensorform':sensorform})


def adjust_subject(request, id):
    subject = Subject.objects.get(id=id)
    if request.method == 'POST':
        subjectform = forms.CreateSubject(request.POST, instance=subject)
        if subjectform.is_valid():
            subjectform.save()
            return redirect('sensormodel:tablepage')
    else:
        subjectform = forms.CreateSubject(instance=subject)
    return render(request, 'subject.html', {'subjectfrom':subjectform})
    
def delete_deployment(request, id):
    deployment = Deployment.objects.get(id=id)
    if request.method == 'POST':
        deployment.delete()
        return redirect('sensormodel:tablepage')
    else:
        return render(request, 'deleteconfirmation.html')
    
def delete_sensor(request, id):
    sensor = Sensor.objects.get(id=id)
    if request.method == 'POST':
        sensor.delete()
        return redirect('sensormodel:tablepage')
    else:
        return render(request, 'deleteconfirmation.html')


def delete_subject(request, id):
    subject = Subject.objects.get(id=id)
    if request.method == 'POST':
        subject.delete()
        return redirect('sensormodel:tablepage')
    else:
        return render(request, 'deleteconfirmation.html')


