from django.shortcuts import render, redirect
from django.urls import reverse
import requests
from .forms import CreateProject
from .forms import CreateProject
from rest_framework.authtoken.models import Token
from projects.models import Project
from .models import MainProject
from django.http import HttpResponse
from projects.models import Project
from .models import MainProject
from django.http import HttpResponse
import json
import zipfile

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

            ### Create three projects from here
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
            project = Project.objects.get(id=(project_id+ii))
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

        # Export activity annotations
        activityannotation_url = request.build_absolute_uri(reverse('data_export:api-projects:project-export', kwargs={'pk': activityannotation_id}))
        activity_annotations_response = requests.get(
            activityannotation_url,
            headers={'Authorization': f'Token {token}'},
            params={'exportType': 'JSON'}
        )
        activity_annotations = activity_annotations_response.json()

        project_title = project.title.replace('_dataimport', '')

        # Create a zip file containing both JSON annotations
        response = HttpResponse(content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{project_title}_annotations.zip"'

        with zipfile.ZipFile(response, 'w') as zipf:
            zipf.writestr('subject_annotations.json', json.dumps(subject_annotations))
            zipf.writestr('activity_annotations.json', json.dumps(activity_annotations))

        return response
    
    return render(request, 'exportproject.html', {'project':project})
