from django.shortcuts import render, redirect 
from .models import Sensor, Deployment,  Subject, SensorType
from . import forms
from .utils.validate_config_json import validateConfigJSON
import os
from pathlib import Path
import yaml
from yaml.loader import SafeLoader
import json
from projects.models import Project

def deployment(request, project_id):
    project = Project.objects.get(id=project_id)
    deployments = Deployment.objects.filter(project=project).order_by('begin_datetime')
    if request.method == 'POST':
        deploymentform = forms.DeploymentForm(request.POST)
        if deploymentform.is_valid():
            deployment = deploymentform.save(commit=False)
            deployment.project = project
            deployment.save()
            return redirect('sensormodel:deployment', project_id=project_id)
    else:
        deploymentform = forms.DeploymentForm(project=project)
    return render(request, 'overviewDeployment.html', {'deploymentform':deploymentform, 'deployments': deployments, 'project':project})

def sensor(request, project_id):
    project = Project.objects.get(id=project_id)
    sensors = Sensor.objects.filter(project=project).order_by('sensor_id')
    sensortypes = SensorType.objects.all().order_by('manufacturer')
    if request.method =='POST':
        sensorform = forms.SensorForm(request.POST)
        if sensorform.is_valid():
            sensor = sensorform.save(commit=False)
            sensor.project = project
            sensor.save()
            return redirect('sensormodel:sensor', project_id = project_id)
    else:
        sensorform = forms.SensorForm(request.POST)
    return render(request, 'overviewSensor.html', {'sensorform':sensorform, 'sensors':sensors, 'sensortypes':sensortypes, 'project': project})

def subject(request, project_id):
    project = Project.objects.get(id=project_id)
    subjects = Subject.objects.filter(project=project).order_by('name')
    if request.method == 'POST':
        subjectform = forms.SubjectForm(request.POST)
        if subjectform.is_valid():
            subject = subjectform.save(commit=False)
            subject.project = project
            subject.save()
            return redirect('sensormodel:subject', project_id = project_id)
    else:
        subjectform = forms.SubjectForm(request.POST)
    return render(request, 'overviewSubject.html', {'subjectform':subjectform, 'subjects':subjects, 'project':project})

def adjust_deployment(request, project_id, id):
    deployment = Deployment.objects.get(id=id)
    project = Project.objects.get(id=project_id)
    if request.method == 'POST':
        # Send POST to adjust a deployment
        deploymentform = forms.DeploymentForm2(request.POST, instance=deployment)
        if deploymentform.is_valid():
            deploymentform.save()
            return redirect('sensormodel:deployment', project_id = project_id)
    else:
        # Go to deployment adjustment page
        deploymentform = forms.DeploymentForm2(instance=deployment)
    return render(request, 'deployment.html', {'deploymentform':deploymentform, 'project':project})
    
def adjust_sensor(request, project_id, id):
    sensor = Sensor.objects.get(id=id)
    project = Project.objects.get(id=project_id)
    if request.method == 'POST':
        # Send POST to adjust a sensor
        sensorform = forms.SensorForm(request.POST,instance=sensor)
        if sensorform.is_valid():
            sensorform.save()
            return redirect('sensormodel:sensor', project_id = project_id)
    else:
        # Go to sensor adjustment page
        sensorform = forms.SensorForm(instance=sensor)
    return render(request, 'sensor.html', {'sensorform':sensorform, 'project':project})


def adjust_subject(request, project_id, id):
    subject = Subject.objects.get(id=id)
    project = Project.objects.get(id=project_id)
    if request.method == 'POST':
        # Send POST to adjust a subject
        subjectform = forms.SubjectForm(request.POST, instance=subject)
        if subjectform.is_valid():
            subjectform.save()
            return redirect('sensormodel:subject', project_id = project_id)
    else:
        # Go to subject adjustment page
        subjectform = forms.SubjectForm(instance=subject)
    return render(request, 'subject.html', {'subjectform':subjectform, 'project':project})
    
def delete_deployment(request, project_id, id):
    deployment = Deployment.objects.get(id=id)
    project = Project.objects.get(id=project_id)
    if request.method == 'POST':
        # Send POST to delete a deployment
        deployment.delete()
        return redirect('sensormodel:deployment', project_id = project_id)
    else:
        # Go to delete confirmation page
        return render(request, 'deleteDeployment.html', {'project':project})
    
def delete_sensor(request, project_id, id):
    sensor = Sensor.objects.get(id=id)
    project = Project.objects.get(id=project_id)
    if request.method == 'POST':
        # Send POST to delete a sensor
        sensor.delete()
        return redirect('sensormodel:sensor', project_id = project_id)
    else:
        # Go to delete confirmation page
        return render(request, 'deleteSensor.html', {'project':project})


def delete_subject(request, project_id, id):
    subject = Subject.objects.get(id=id)
    project = Project.objects.get(id=project_id)
    if request.method == 'POST':
        # Send POST to delete a subject
        subject.delete()
        return redirect('sensormodel:subject', project_id = project_id)
    else:
        # Go to delete confirmation page
        return render(request, 'deleteSubject.html', {'project':project})

def sync_sensor_parser_templates(request):
    # Search sensortypes repo for (new) config .yaml files and add them to DB
    if request.method == 'POST':

        # # Reset the sensortypes
        # SensorType.objects.all().delete()
        
        # Get submodule path
        path = Path(__file__).parents[2]/ 'sensortypes' # Path of subrepo
        # Extract file names and (temporarily) store only .yaml files
        parser_files = []
        files = os.listdir(path)
        for file in files:
            name, ext = os.path.splitext(file)
            if ext == '.yaml':
                parser_files.append(file) 
        for parser_file in parser_files:
            # Each config file is name like: manufacturer_name_version.yaml
            file_name = str(parser_file).split('.')[0]
            manufacturer, name, version = file_name.split('_')
            
            if not SensorType.objects.filter(manufacturer=manufacturer,name=name, version=version).exists():
                # If there does not yet exist such an config file in the repo, read the file and save in config
                with open(path / str(parser_file)) as f:
                    config = yaml.load(f, Loader=SafeLoader)
                    config = str(config).replace("\'", "\"")
                    config = config.replace("None", "\"\"")
                    
                    
                if validateConfigJSON(str(config)):
                    # If the config is valid add to DB
                    config = json.loads(config)
                    SensorType.objects.create(manufacturer=manufacturer,name=name, version=version, **config).save()
    return redirect('sensormodel:sensor')