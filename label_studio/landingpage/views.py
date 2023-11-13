from django.shortcuts import render, redirect
from django.urls import reverse
from django.conf import settings
import requests
from .forms import CreateProject
from .forms import CreateProject
from rest_framework.authtoken.models import Token
from projects.models import Project
from sensordata.models import SensorData
from .models import MainProject
from django.http import HttpResponse
from projects.models import Project
from .models import MainProject
from django.http import HttpResponse
import json
import zipfile
from tasks.models import Task, Annotation
import os, shutil

from django.http import JsonResponse, HttpResponseNotFound
from .models import MainProject

def landingpage(request, project_id):
    main_project = None
    for id in range(project_id, 0, -1):
        try:
            main_project = MainProject.objects.get(project_id=id)
            break  # Exit the loop if a project is found
        except MainProject.DoesNotExist:
            continue  # Continue looping to try the previous project_id

    if main_project is None:
        return HttpResponseNotFound('No existing project found for any project_id')
    return render(request, 'landingpage.html', {'main_project': main_project})


def workinprogress(request, project_id):
    project = Project.objects.get(id=project_id)
    return render(request, 'workinprogress.html', {'project':project})

def homepage(request):
    # Reset main projects
    MainProject.objects.all().delete()
    # Get all projects
    all_projects = Project.objects.all()
    # Loop through projects and only keep projects with names ending on '_dataimport'
    filtered_projects = [project for project in all_projects if project.title.endswith('_dataimport')]

    main_projects = []
    for project in filtered_projects:
        main_project = MainProject(
            project_id=project.id,
            name=project.title[:-11]  # Remove '_dataimport' from the project name
        )
        main_project.save()
        
    main_projects = MainProject.objects.all()
    
    return render(request, 'homepage.html', {'projects': main_projects})

def createProject(request):
    if request.method == 'POST':
        createprojectform = CreateProject(request.POST)
        if createprojectform.is_valid():
            name = createprojectform.cleaned_data['project_name']
            # Get current user token for authentication
            user = request.user
            token = Token.objects.get(user=user)

            # Get url for displaying all projects
            projects_url = request.build_absolute_uri(reverse('projects:api:project-list'))

            ### Create four projects from here
            # Create data import project
            dataimport_title = f'{name}_dataimport'
            dataimport_response = requests.post(
                projects_url,
                headers={'Authorization': f'Token {token}'},
                data={'title': dataimport_title}
            )

            # Create subject annotation project
            subjectannotation_title = f'{name}_subjectannotation'
            subjectannotation_response = requests.post(
                projects_url,
                headers={'Authorization': f'Token {token}'},
                data={'title': subjectannotation_title}
            )

            # Create activity annotation project
            activityannotation_title = f'{name}_activityannotation'
            activityannotation_response = requests.post(
                projects_url,
                headers={'Authorization': f'Token {token}'},
                data={'title': activityannotation_title}
            )
            
            # Create offset annotation project
            offsetannotation_title = f'{name}_offsetannotation'
            offsetannotation_response = requests.post(
                projects_url,
                headers={'Authorization': f'Token {token}'},
                data={'title': offsetannotation_title}
            )

            return redirect('landingpage:homepage')

    else:
        createprojectform = CreateProject()
    
    return render(request, 'createproject.html', {'createprojectform': createprojectform})

def deleteProject(request, project_id):
    mainproject = MainProject.objects.get(project_id=project_id)
    if request.method == 'POST':
        
        # Send POST to delete a sensor
        mainproject.delete()
        for ii in range(0,3):
            # Delete the project's file upload folder
            project_upload_folder = os.path.join(settings.MEDIA_ROOT, settings.UPLOAD_DIR, str(project_id+ii))
            if os.path.exists(project_upload_folder):
                shutil.rmtree(project_upload_folder)
            
            project = Project.objects.get(id=(project_id+ii))
            # Get all tasks of the project
            tasks = Task.objects.filter(project=project)
            tasks.delete()
            # annotations = Annotation.objects.filter(project=project)
            # annotations.delete()
            project.delete()
        return redirect('landingpage:homepage')
    else:
        # Go to delete confirmation page
        return render(request, 'deleteProject.html', {'mainproject': mainproject})
    
def exportProject(request, project_id):
    project = Project.objects.get(id=project_id)
    if request.method == 'POST':          
        # Get current user token for authentication
        user = request.user
        token = Token.objects.get(user=user)

        # Get project_id for subjectannotation and activity annotation
        subjectannotation_id = project_id + 1
        activityannotation_id = project_id + 2

        # Export subject annotations
        subjectannotation_url = request.build_absolute_uri(reverse('data_export:api-projects:project-export', kwargs={'pk': subjectannotation_id}))
        subject_annotations_response = requests.get(
            subjectannotation_url,
            headers={'Authorization': f'Token {token}'},
            params={'exportType': 'JSON'}
        )
        subject_annotations = subject_annotations_response.json()

        # Modify the video_url field in the JSON to delete the folder structure
        for annotation in subject_annotations:
            if 'data' in annotation and 'video_url' in annotation['data']:
                video_url = annotation['data']['video_url']
                if video_url.startswith('/data/upload/'):
                    video_url = os.path.basename(video_url)  
                    annotation['data']['video_url'] = video_url

        # Export subject annotation data
        subject_data = SensorData.objects.filter(project=project, file_upload_project2__isnull=False)
        subject_data_paths = [file.file_upload_project2.file.path for file in subject_data]

        # Export activity annotations
        activityannotation_url = request.build_absolute_uri(reverse('data_export:api-projects:project-export', kwargs={'pk': activityannotation_id}))
        activity_annotations_response = requests.get(
            activityannotation_url,
            headers={'Authorization': f'Token {token}'},
            params={'exportType': 'JSON'}
        )
        activity_annotations = activity_annotations_response.json()
        
        # Modify data folder structure in JSON
        for annotation in activity_annotations:
            if 'data' in annotation and 'csv' in annotation['data']:
                csv_url = annotation['data']['csv']
                if csv_url.startswith('/data/upload/'):
                    csv_filename = os.path.basename(csv_url)
                    annotation['data']['csv'] = csv_filename  

            if 'data' in annotation and 'video' in annotation['data']:
                video_source = annotation["data"]["video"]
                src_start = video_source.find("src='")  # Find the start of the src attribute
                if src_start != -1:
                    src_start += 5  # Move to the character after the single quote
                    src_end = video_source.find("'", src_start)  
                    if src_end != -1:
                        video_url = video_source[src_start:src_end]
                        if video_url.startswith('/data/upload/'):
                            video_filename = os.path.basename(video_url)
                            annotation["data"]["video"] = video_source.replace(video_url, video_filename)  

        # Get all physical chunk files
        # Get upload folder
        project_upload_folder = os.path.join(settings.MEDIA_ROOT, settings.UPLOAD_DIR, str(project_id)) 
        # Create a list of files with "_CHUNK_" in their name
        chunk_files = [file for file in os.listdir(project_upload_folder) if "CHUNK" in file]

        project_title = project.title.replace('_dataimport', '')

        # Create a zip file containing both JSON annotations
        response = HttpResponse(content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{project_title}_annotations.zip"'

        with zipfile.ZipFile(response, 'w') as zipf:
            # Create the 'subject_annotations' folder and add the JSON file
            with zipf.open('subject_annotations/subject_annotations.json', 'w') as subject_file:
                subject_file.write(json.dumps(subject_annotations).encode('utf-8'))
            
            # Add subject data files to the 'subject_annotations' folder
            for file_path in subject_data_paths:
                file_name = os.path.basename(file_path)
                with zipf.open(os.path.join('subject_annotations', file_name), 'w') as subject_data_file:
                    with open(file_path, 'rb') as f:
                        subject_data_file.write(f.read())

                # Diagnostic message: print the file being added
                print(f"Adding {file_name} to ZIP")

            # Create the 'activity_annotation' folder and add the JSON file
            with zipf.open('activity_annotations/activity_annotations.json', 'w') as activity_file:
                activity_file.write(json.dumps(activity_annotations).encode('utf-8'))

            # Add the chunk files to the 'activity_annotations' folder
            for chunk_file in chunk_files:
                chunk_file_path = os.path.join(project_upload_folder, chunk_file)
                with zipf.open(os.path.join('activity_annotations', chunk_file), 'w') as chunk_data_file:
                    with open(chunk_file_path, 'rb') as f:
                        chunk_data_file.write(f.read())

        return response
    
    return render(request, 'exportproject.html', {'project':project})
