from django.shortcuts import render, redirect
from django.urls import reverse
import requests
from .forms import CreateProject, ExportProject
from rest_framework.authtoken.models import Token
import json
import zipfile
from django.http import HttpResponse

def landingpage(request):
    return render(request, 'landingpage.html')

def workinprogress(request):
    return render(request, 'workinprogress.html')

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

            return redirect('landingpage:landingpage')

    else:
        createprojectform = CreateProject()
    return render(request, 'createproject.html', {'createprojectform': createprojectform})

def exportProject(request):
    if request.method == 'POST':
        exportprojectform = ExportProject(request.POST)
        if exportprojectform.is_valid():
            project = exportprojectform.cleaned_data['project']
            
            # Get current user token for authentication
            user = request.user
            token = Token.objects.get(user=user)

            # Get project_id for subjectannotation and activity annotation
            subjectannotation_id = project.id + 1
            activityannotation_id = project.id + 2

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

    else:
        exportprojectform = ExportProject()
    
    return render(request, 'createproject.html', {'createprojectform': createprojectform})

def exportProject(request):
    if request.method == 'POST':
        exportprojectform = ExportProject(request.POST)
        if exportprojectform.is_valid():
            project = exportprojectform.cleaned_data['project']
            
            # Get current user token for authentication
            user = request.user
            token = Token.objects.get(user=user)

            # Get project_id for subjectannotation and activity annotation
            subjectannotation_id = project.id + 1
            activityannotation_id = project.id + 2

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

    else:
        exportprojectform = ExportProject()
    
    return render(request, 'exportproject.html', {'exportprojectform': exportprojectform})
