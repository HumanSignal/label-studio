from django.shortcuts import render, redirect
from django.urls import reverse
from django.apps import apps
from .forms import SensorDataForm, SensorOffsetForm, OffsetAnnotationForm
from .models import SensorData, SensorOffset
from .parsing.sensor_data import SensorDataParser
from .parsing.video_metadata import VideoMetaData
from .parsing.controllers.project_controller import ProjectController
from pathlib import Path
from .utils.annotation_template import create_offset_annotation_template
from tasks.models import Task, Annotation
from sensormodel.models import Subject

import json
from datetime import timedelta
from sensormodel.models import SensorType, Sensor
from rest_framework.authtoken.models import Token
import requests
from tempfile import NamedTemporaryFile
import numpy as np
import statistics
import pandas as pd
import zipfile
import re
import os

from projects.models import Project
from tasks.models import Task
from django.contrib import messages


UNITS = {'days': 86400, 'hours': 3600, 'minutes': 60, 'seconds':1, 'milliseconds':0.001}

# Create your views here.
def sensordatapage(request, project_id):
    project = Project.objects.get(id=project_id)
    sensordata = SensorData.objects.filter(project=project).order_by('project')
    return render(request, 'sensordatapage.html', {'sensordata':sensordata, 'project':project})

def addsensordata(request, project_id):
    project = Project.objects.get(id=project_id)
    mismatched_files = []
    if request.method =='POST':
        sensordataform = SensorDataForm(request.POST, request.FILES, project=project)
        if sensordataform.is_valid():
            # Get form data
            uploaded_file = sensordataform.cleaned_data['file']
            project = project
            sensor = sensordataform.cleaned_data.get('sensor')

            parsable_sensor_id = sensor.parsable_sensor_id
            
            # Check if the uploaded file is a zip file
            if zipfile.is_zipfile(uploaded_file):
                # Process the zip file
                with zipfile.ZipFile(uploaded_file, 'r') as zip_ref:
                    for file_name in zip_ref.namelist():
                        if (file_name.lower().endswith('.csv') or file_name.lower().endswith('.mp4')):  # Check if the file is a CSV or MP4 file
                            if parsable_sensor_id is None or file_validation(zip_ref, file_name, sensor, parsable_sensor_id):
                                # Extract each file from the zip to a temporary location
                                temp_file_path = zip_ref.extract(file_name)
                                # Process the individual file
                                process_sensor_file(request, temp_file_path, sensor, file_name, project)
                                # Delete the temporary file
                                os.remove(temp_file_path)
                            else:
                                mismatched_files.append(file_name)
                if mismatched_files:
                    # Redirect to the mismatched files warning page
                    request.session['mismatched_files'] = mismatched_files
                    return redirect('sensordata:file-upload-warning', project_id=project_id)
                
                return redirect('sensordata:sensordatapage', project_id=project_id)

            # Raise an exception if the uploaded file is not a zip file
            raise ValueError("Uploaded file must be a zip file.")
    else:
        sensordataform = SensorDataForm(project=project)

    return render(request, 'addsensordata.html', {'sensordataform': sensordataform, 'project':project})

def file_validation(zip_ref, file_name, sensor, parsable_sensor_id):
    # Find sensortype
    sensor_type = sensor.sensortype
    # Open the file
    with zip_ref.open(file_name) as file:
        for i, line in enumerate(file):
                if i == sensor_type.sensor_id_row:
                    sensor_id_column = sensor_type.sensor_id_column if sensor_type.sensor_id_column is not None else 0
                    sensor_id = line.decode('utf-8').split(',')[sensor_id_column].strip()     
                    if sensor_id == parsable_sensor_id:
                        return True

    return False

def file_warning(request, project_id):
    project = Project.objects.get(id=project_id)
    mismatched_files = request.session.pop('mismatched_files', [])
    return render(request, 'file_upload_warning.html', {'project':project, 'mismatched_files':mismatched_files})


def process_sensor_file(request, file_path, sensor, name, project):
    # Process the sensor file based on its type
    subjectannotation_project = Project.objects.get(id=project.id+1)
    sensortype = sensor.sensortype
    if sensortype.sensortype == 'I':  # IMU sensor type
        parse_IMU(request=request, file_path=file_path,sensor=sensor,name=name,project=project)
    elif sensortype.sensortype == 'C':  # Camera sensor type
        parse_camera(request=request, file_path=file_path,sensor=sensor,name=name,project=project)
        #parse_camera(request=request, file_path=file_path,sensor=sensor,name=name, project=subjectannotation_project)
    elif sensortype.sensortype == 'M':  # Other sensor type (add handling logic here)
        pass
    # Add handling for other sensor types as needed

def offset(request, project_id):
    project = Project.objects.get(id=project_id)
    offset_annotation_project = Project.objects.get(id=project.id+3)
    sensoroffset = SensorOffset.objects.all(project=project).order_by('offset_Date')
    offsetannotationform = OffsetAnnotationForm(project=project)
    return render(request, 'offset.html', {'offsetannotationform':offsetannotationform, 'sensoroffset':sensoroffset, 'project':project, 'offset_project': offset_annotation_project})


def delete_offset(request, project_id, id):
    project = Project.objects.get(id=project_id)
    offset = SensorOffset.objects.get(id=id)
    if request.method == 'POST':
        # Send POST to delete a sensor
        offset.delete()
        return redirect('sensordata:offset', project_id=project_id)
    else:
        # Go to delete confirmation page
        return render(request, 'deleteOffset.html', {'project':project})

def adjust_offset(request, project_id, id):
    project = Project.objects.get(id=project_id)
    offset = SensorOffset.objects.get(id=id)
    if request.method == 'POST':
        # Send POST to adjust a subject
        offsetform = SensorOffsetForm(request.POST, instance=offset)
        if offsetform.is_valid():
            offsetform.save()
            return redirect('sensordata:offset', project_id=project_id)
    else:
        # Go to subject adjustment page
        offsetform = SensorOffsetForm(instance=offset)
    return render(request, 'editOffset.html', {'offsetform':offsetform, 'project':project})

def parse_IMU(request, file_path, sensor, name, project):
    sensortype = SensorType.objects.get(id=sensor.sensortype.id)
    # Parse data

    project_controller = ProjectController()
    sensor_data = SensorDataParser(project_controller=project_controller, file_path=Path(file_path),sensor_model_id= sensortype.id)
    # Get parsed data
    imu_df = sensor_data.get_data()
    # Add L2 norm of Ax,Ay,Az
    try:
        imu_df['A3D'] = np.sqrt(imu_df['Ax']**2 + imu_df['Ay']**2 + imu_df['Az']**2)
    except KeyError as e:
        print(print("No Ax, Ay or Az columns. ", e))
        imu_df['A3D'] = imu_df['Ax']
    # Remove non-letters from column names
    imu_df.columns = [re.sub(r'[^a-zA-Z0-9]', '', col) for col in imu_df.columns]
    # Remove last line (=stopping line)
    imu_df.drop(imu_df.index[-1], inplace=True)
    # Convert all time entries to float
    imu_df.iloc[:,sensortype.timestamp_column] = imu_df.iloc[:,sensortype.timestamp_column].astype(float)
    # Now that the sensordata has been parsed it has to be transformed back to a .csv file and uploaded to the correct project
    # Create NamedTemporary file of type csv
    with NamedTemporaryFile(suffix='.csv', prefix=(str(name).split('/')[-1]) ,mode='w', delete=False) as csv_file:
        # Write the dataframe to the temporary file
        imu_df.to_csv(csv_file.name, index=False)
        file_path=csv_file.name
    # Upload parsed sensor(IMU) data to corresponding project
    upload_sensor_data(request=request, name=name, file_path=file_path ,project=project)
    # Retrieve id of the FileUpload object that just got created. This is the latest created instance of the class FileUpload
    fileupload_model = apps.get_model(app_label='data_import', model_name='FileUpload')
    file_upload = fileupload_model.objects.latest('id')
    # Parse to JSON to get begin and end datetime   
    sensor_data_json_string = imu_df.to_json()
    sensor_data_json = json.loads(sensor_data_json_string)
    begin_datetime = sensor_data.metadata.utc_dt
    relative_absolute = sensortype.relative_absolute
    # Get time key
    keys = list(sensor_data_json.keys())
    time_key = keys[sensortype.timestamp_column]
    times = sensor_data_json[time_key]
    sorted_keys = sorted(times.keys(), key=int)
    penultimate_key = sorted_keys[-2]
    end_time = times[penultimate_key]
    if relative_absolute == 'relative':
        # Get end datetime if the timestamp is relative
        time_unit = sensortype.timestamp_unit
        delta = timedelta(seconds= float(end_time) * UNITS[time_unit])
        end_datetime =  begin_datetime + delta
    elif relative_absolute == 'absolute':
        # Get end datetime if the timestamp is absolute (needs to be checked with )
        pass
        # !! NOT YET WORKING !!
        # timestamp_unit = sensortype.timestamp_unit
        # end_time = dateutil.parser.parse(end_time)
        
        # end_datetime = begin_datetime + end_time

    # Create SensorData object with parsed data
    sensordata = SensorData.objects.create(name=name, sensor=sensor,\
        begin_datetime=begin_datetime, end_datetime=end_datetime, project=project,file_upload=file_upload)

def parse_camera(request, file_path, sensor, name, project):
    subjectannotation_project = Project.objects.get(id=(project.id+1))
    # Upload video to project
    upload_sensor_data(request=request, name=name, file_path=file_path ,project=project)
    # Upload video to subjectannotation project
    upload_sensor_data(request=request, name=name, file_path=file_path ,project=subjectannotation_project)
    # Retrieve id of the FileUpload object that just got created. This is the latest created instance of the class FileUpload
    fileupload_model = apps.get_model(app_label='data_import', model_name='FileUpload')
    file_upload_dataimport = fileupload_model.objects.filter(project=project).latest('id')
    file_upload_subjectannotation = fileupload_model.objects.filter(project=subjectannotation_project).latest('id')
    
    # Get sensortype config
    sensortype = SensorType.objects.get(id=sensor.sensortype.id)
    sensor_timezone = sensortype.timezone
    # Parse video meta data
    videometadata = VideoMetaData(file_path=file_path,sensor_timezone=sensor_timezone)
    
    # Use parsed data from metadata to create SensorData object
    # Get the begin datetime and duration to determine the end datetime 
    begin_datetime = videometadata.video_begin_time
    video_duration = videometadata.video_duration # in seconds
    delta = timedelta(seconds= float(video_duration))
    end_datetime =  begin_datetime + delta

    # Create SensorData object with parsed data
    sensordata = SensorData.objects.create(name=name, sensor=sensor,\
        begin_datetime=begin_datetime, end_datetime=end_datetime, project=project, file_upload=file_upload_dataimport, file_upload_project2 = file_upload_subjectannotation)
    
def upload_sensor_data(request, name, file_path, project):
    user = request.user
    token = Token.objects.get(user=user)
    # Get url for importing data to the correct project
    import_url = request.build_absolute_uri(reverse('data_import:api-projects:project-import',kwargs={'pk':project.id}))
    # Get temporary file URL from the form
    files = {f'{name}': open(file_path, 'rb')}
    # Import the video to the correct project
    import_req = requests.post(import_url, headers={'Authorization': f'Token {token}'}, files=files)

def deletesensordata(request, project_id, id):
    try:
        project = Project.objects.get(id=project_id)
        sensordata = SensorData.objects.get(id=id)
        
        if request.method == 'POST':
            # Delete related tasks with the same file_upload and project
            data_tasks = Task.objects.filter(
                file_upload=sensordata.file_upload,
                project=project
            )
            
            data_tasks.delete()
            
            # Get the path to the physical data file
            data_file_path = sensordata.file_upload.file.path

            # Delete the physical data file
            if os.path.exists(data_file_path):
                os.remove(data_file_path)

            # Check if file_upload_project2 exists and delete associated tasks and file
            if sensordata.file_upload_project2:
                new_project_id = project_id + 1
                subject_project = Project.objects.get(id=new_project_id)
                subject_tasks = Task.objects.filter(
                    file_upload=sensordata.file_upload_project2,
                    project=subject_project
                )
                subject_tasks.delete()

                data_file_path_2 = sensordata.file_upload_project2.file.path
                if os.path.exists(data_file_path_2):
                    print('deleted')
                    os.remove(data_file_path_2)

            # Delete the SensorData object
            sensordata.delete()
            
            return redirect('sensordata:sensordatapage', project_id=project_id)
        else:
            # Go to delete confirmation page
            return render(request, 'deleteconfirmation.html', {'project': project})
    except (Project.DoesNotExist, SensorData.DoesNotExist):
        raise ValueError("Project or SensorData does not exist.")

    

def generate_offset_anno_tasks(request, project_id):
    project = Project.objects.get(id=project_id)
    offset_annotation_project = Project.objects.get(id=project.id+3)
    if request.method == 'POST':
        offsetannotationform = OffsetAnnotationForm(request.POST)
        if offsetannotationform.is_valid():
            sync_sensordata = offsetannotationform.cleaned_data.get('sync_sensordata')
            try:
                # Get ground truth sensor type from the subject annotation project
                sensortype_A = SensorData.objects.filter(project__id=project.id+1).first().sensor.sensortype
            except: 
                print('No sensortypes found in subject annotation project')
            sensortype_B = Sensor.objects.filter(project=project).exclude(sensortype=sensortype_A).first().sensortype
            for sendata_A in sync_sensordata.filter(sensor__sensortype__sensortype=sensortype_A.sensortype):
                for sendata_B in sync_sensordata.filter(sensor__sensortype__sensortype=sensortype_B.sensortype):
                    sendata_B_df = pd.read_csv(sendata_B.file_upload.file.path,skipfooter=1, engine='python')
                    timestamp_column_name = sendata_B_df.columns[sensortype_B.timestamp_column]
                    task_json_template = {
                        "csv": f"{sendata_B.file_upload.file.url}?time={timestamp_column_name}&values={'a3d'}",
                        "video": f"<video src='{sendata_A.file_upload.file.url}' width='100%' controls onloadeddata=\"setTimeout(function(){{ts=Htx.annotationStore.selected.names.get('ts');t=ts.data.{timestamp_column_name.lower()};v=document.getElementsByTagName('video')[0];w=parseInt(t.length*(5/v.duration));l=t.length-w;ts.updateTR([t[0], t[w]], 1.001);r=$=>ts.brushRange.map(n=>(+n).toFixed(2));_=r();setInterval($=>r().some((n,i)=>n!==_[i])&&(_=r())&&(v.currentTime=v.duration*(r()[0]-t[0])/(t.slice(-1)[0]-t[0]-(r()[1]-r()[0]))),20); console.log('video is loaded, starting to sync with time series')}}, 3000); \" />",
                        "sensor_a": f"{sendata_A.sensor}",
                        "sensor_b": f"{sendata_B.sensor}",
                        "offset_date": f"{min(sendata_A.begin_datetime,sendata_B.begin_datetime)}"
                    }
                    with NamedTemporaryFile(prefix=f'{sendata_A.sensor.id}_{sendata_B.sensor.id}', suffix='.json',mode='w',delete=False) as task_json_file:
                        json.dump(task_json_template,task_json_file,indent=4)
                    upload_sensor_data(request, name=f'{sendata_A.sensor}_{sendata_B.sensor}', file_path=task_json_file.name, project=offset_annotation_project)
            # Update labeling setup to support offset annotation
            # Create a XML markup for annotating. Value column is always 'a3d'
            template = create_offset_annotation_template(timestamp_column_name=timestamp_column_name,value_column_name='a3d')
            # Get url for displaying project detail
            project_detail_url = request.build_absolute_uri(reverse('projects:api:project-detail', args=[project.id+3]))
            # Update labeling set up
            token = Token.objects.get(user=request.user)
            requests.patch(project_detail_url, headers={'Authorization': f'Token {token}'}, data={'label_config':template})
            return redirect(reverse('data_manager:project-data', kwargs={'pk':project.id+3}))
        else:
            sensoroffset = SensorOffset.objects.all().order_by('offset_Date')
            offsetannotationform = OffsetAnnotationForm(project=project)
            return render(request, 'offset.html', {'offsetannotationform':offsetannotationform, 'sensoroffset':sensoroffset, 'project':project, 'offset_project':offset_annotation_project}) 
    else:
        sensoroffset = SensorOffset.objects.all().order_by('offset_Date')
        offsetannotationform = OffsetAnnotationForm(project=project)
        return render(request, 'offset.html', {'offsetannotationform':offsetannotationform, 'sensoroffset':sensoroffset, 'project':project, 'offset_project': offset_annotation_project}) 
    

def parse_offset_annotations(request,project_id):
    project = Project.objects.get(id=project_id)
    offset_annotation_project = Project.objects.get(id=project.id+3)
    tasks = Task.objects.filter(project= offset_annotation_project)
    for task in tasks:
        sensor_A = Sensor.objects.get(sensor_id = task.data['sensor_a'].replace('Sensor: ', ''))
        sensor_B = Sensor.objects.get(sensor_id = task.data['sensor_b'].replace('Sensor: ', ''))
        annotations = Annotation.objects.filter(task__in= tasks)
        if annotations.first().result[0]['value']['timeserieslabels'][0] == 'Negative offset':
            offsets = [annotation_result['value']['end']-annotation_result['value']['start']  for annotation_result in annotations.first().result]
            try:
                avg_offset = statistics.mean(offsets) # avg offset as a float in seconds
            except statistics.StatisticsError as e:
                print(f'{e}, There are no offset annotations for {sensor_A} and {sensor_B}')
            offset_date = task.data['offset_date']
            if not SensorOffset.objects.filter(sensor_A = sensor_A, sensor_B = sensor_B, offset = -1*int(avg_offset*1000), offset_Date = offset_date):
                SensorOffset.objects.create(sensor_A = sensor_A,
                                               sensor_B = sensor_B,
                                               offset = -1*int(avg_offset*1000), # convert to milliseconds integer
                                               offset_Date = offset_date)
        elif annotations.first().result[0]['value']['timeserieslabels'][0] == 'Positive offset':
            
            offsets = [annotation_result['value']['end']-annotation_result['value']['start']  for annotation_result in annotations.first().result]
            try:
                avg_offset = statistics.mean(offsets) # avg offset as a float in seconds
            except statistics.StatisticsError as e:
                print(f'{e}, There are no offset annotations for {sensor_A} and {sensor_B}')
            offset_date = task.data['offset_date'] 
            if not SensorOffset.objects.filter(sensor_A = sensor_A, sensor_B = sensor_B, offset = int(avg_offset*1000), offset_Date = offset_date).exists():
                SensorOffset.objects.create(sensor_A = sensor_A,
                                               sensor_B = sensor_B,
                                               offset = int(avg_offset*1000), # convert to milliseconds integer
                                               offset_Date = offset_date)
        else:
            print('The labels in the offset labeling have been changed. This will cause malfunctioning')
    sensoroffset = SensorOffset.objects.all().order_by('offset_Date')
    offsetannotationform = OffsetAnnotationForm(project=project)
    return render(request, 'offset.html', {'offsetannotationform':offsetannotationform, 'sensoroffset':sensoroffset, 'project':project , 'offset_project': offset_annotation_project}) 

