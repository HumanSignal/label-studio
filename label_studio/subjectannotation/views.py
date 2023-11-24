from django.shortcuts import render, redirect
from django.urls import reverse
from .utils.annotationtemplate import createSubjectAnnotationTemplate
import requests
from rest_framework.authtoken.models import Token
from tasks.models import Task, Annotation
from subjectannotation.models import SubjectPresence
from sensormodel.models import Subject
from projects.models import Project
from sensordata.models import SensorData

# Create your views here.
def annotationtaskpage(request, project_id):
    project = Project.objects.get(id=project_id)
    return render(request, 'annotationtaskpage.html', {'project':project})

def createannotationtask(request, project_id):
    project = Project.objects.get(id=project_id)
    # Functions that creates an API call to create a task with subjects as labels for subject annotation
    if request.method == 'POST':                    
        # Retrieve the subject list
        subjects = Subject.objects.filter(project=project)
        
        # Create labels for subject annotation
        labels = ",".join([f"Subject: {subject.name}" for subject in subjects])
        
        # Get url for displaying all projects
        projects_url = request.build_absolute_uri(reverse('projects:api:project-list'))
        
        # Get current user token for authentication
        user = request.user
        token = Token.objects.get(user=user)


        # Get list of project
        list_projects_response = requests.get(projects_url, headers={'Authorization': f'Token {token}'})
        projects = list_projects_response.json()["results"]          
        
        if project_id is not None:
            project_id += 1
            title = None
            for project in projects:
                if project["id"] == project_id:
                    title = project["title"]
                    break
            if title == None:
                # error for not finding subjectannotation project
                raise ValueError(f'Could not find subject annotation project {title}')
            # Create a XML markup for annotatings
            template = createSubjectAnnotationTemplate(labels)

            # Get url for displaying project detail
            project_detail_url = request.build_absolute_uri(reverse('projects:api:project-detail', args=[project_id]))
            # Get url for importing data to the correct project
            import_url = request.build_absolute_uri(reverse('data_import:api-projects:project-import',kwargs={'pk':project_id}))


            # Create labels using LS API
            requests.patch(project_detail_url, headers={'Authorization': f'Token {token}'}, data={'label_config':template})
            
            tasks_url = reverse('data_manager:project-data', kwargs={'pk':project_id})
            return redirect(tasks_url)
            
    return render(request, 'annotationtaskpage.html', {'project':project})


def parse_subject_presence_annotations(request, project):
    SubjectPresence.objects.all().delete()
    subj_anno_proj = Project.objects.get(id=project.id+1)
    tasks = Task.objects.filter(project= subj_anno_proj)
    annotations = Annotation.objects.filter(task__in= tasks)
    for annotation in annotations:
        file_upload_project2 = Task.objects.get(id=annotation.task_id).file_upload
        file_upload = SensorData.objects.get(file_upload_project2=file_upload_project2).file_upload
        results= annotation.result
        for result in results:
            labels = result['value']['labels']
            start_time = result['value']['start']
            end_time = result['value']['end']
            for label in labels:
                subject = Subject.objects.get(project= project, name=label.replace('Subject: ',''))
                if not SubjectPresence.objects.filter(file_upload=file_upload,project=project,subject=subject,
                                                 start_time=start_time,end_time=end_time).exists():
                    SubjectPresence.objects.create(file_upload=file_upload,project=project,subject=subject,
                                                 start_time=start_time,end_time=end_time)
                