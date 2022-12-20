from django.shortcuts import render, redirect
from django.urls import reverse
from .forms import SubjectAnnotationForm
from .utils.annotationtemplate import createSubjectAnnotationTemplate
import requests
from rest_framework.authtoken.models import Token

# Create your views here.
def annotationtaskpage(request):
    deploymentselectform = SubjectAnnotationForm()
    return render(request, 'annotationtaskpage.html', {'deploymentselectform':deploymentselectform})

def createannotationtask(request):
    if request.method == 'POST':
        subjectannotationform = SubjectAnnotationForm(request.POST, request.FILES)
        if subjectannotationform.is_valid():
            #Create project
            deployment = subjectannotationform.cleaned_data.get("deployment")
            deployment.CreateLists()
            sensorlist, subjectlist = deployment.sensorlist, deployment.subjectlist
            template = createSubjectAnnotationTemplate(sensorlist,subjectlist)
            title = str(deployment)
            
            projects_url = request.build_absolute_uri(reverse('projects:api:project-list')) # , kwargs={'label_config':template, 'title':title})
            
            user = request.user
            token = Token.objects.get(user=user)

            create_project_response =  requests.post(projects_url, headers={'Authorization': f'Token {token}'}, data={'label_config':template, 'title':title})
            
            #Import data

            list_projects_response = requests.get(projects_url, headers={'Authorization': f'Token {token}'})
            last_project_id = list_projects_response.json()["results"][0]["id"]


            import_url = request.build_absolute_uri(reverse('data_import:api-projects:project-import',kwargs={'pk':last_project_id}))
            file_url = request.FILES['file'].temporary_file_path()
            files = {f'{request.FILES["file"]}': open(file_url, 'rb')}

            import_response = requests.post(import_url, headers={'Authorization': f'Token {token}'}, files=files)
            return redirect('projects:project-index')

    subjectannotationform = SubjectAnnotationForm()
    return render(request, 'annotationtaskpage.html', {'deploymentselectform':subjectannotationform})