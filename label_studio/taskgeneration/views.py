from django.shortcuts import render, redirect
from django.db.models import Q
from datetime import timedelta
from tempfile import NamedTemporaryFile
from sensordata.views import upload_sensor_data
from django.conf import settings
from django.apps import apps
from django.http import HttpResponse
from django.urls import reverse
from rest_framework.authtoken.models import Token
from django.core.exceptions import ObjectDoesNotExist

import subprocess
import os
import pandas as pd
import numpy as np
import json
import requests

from sensordata.models import SyncSensorOverlap
from projects.models import Project
from sensormodel.models import Deployment, Sensor
from sensordata.models import SensorData, SensorOffset
from subjectannotation.models import SubjectPresence
from taskgeneration.models import SensorOverlap
from taskgeneration.forms import TaskGenerationForm
from taskgeneration.utils.annotation_template import create_activity_annotation_template
from subjectannotation.views import parse_subject_presence_annotations

def task_generation_page(request,project_id):
    project = Project.objects.get(id=project_id)
    columns_names_choices = request.session.get('choices', None)
    taskform = TaskGenerationForm(column_names_choices=columns_names_choices, project=project)
    return render(request, 'taskgeneration.html', {'taskgenerationform':taskform, 'project':project})

def create_task_pairs(project, subject, sensortype_B):
    # Load data for given project and subject
    SensorOverlap.objects.all().delete()
    subject_presences = SubjectPresence.objects.filter(project=project, subject=subject)
    distinct_file_uploads = subject_presences.values('file_upload').distinct() # Get all unique files that contain subject
    sensordata_A = SensorData.objects.filter(project=project,file_upload__in=distinct_file_uploads) # Get all SensorData related to these FileUploads
    # Load IMU deployments in the project that contain the subject
    sensor_B_deployments = Deployment.objects.filter(project=project,subject=subject,sensor__sensortype__sensortype=sensortype_B.sensortype)
    sensordata_B = SensorData.objects.filter(project= project, sensor__in=sensor_B_deployments.values('sensor')) # find all sensordata (type B) that has a sensor in sensor_B_deployments
    # Iterate over unique sendata_A sensordata objects, this reduces computations
    for sendata_A in sensordata_A:
        sensor_A = sendata_A.sensor
        A_beg_dt = sendata_A.begin_datetime #begin_datetime sendata_A
        # Add manual offset for either sensor_A (offset is in ms (int))
        if not sendata_A.sensor.manual_offset is None:
            sensor_A_manual_offset = sendata_A.sensor.manual_offset
            A_beg_dt = A_beg_dt + timedelta(milliseconds=sensor_A_manual_offset)
        # Iterate over all subject_presences for this sendata_A
        subject_presences_sendata_A = subject_presences.filter(file_upload=sendata_A.file_upload)
        for subj_pres in subject_presences_sendata_A:
            beg_subj_pres = A_beg_dt + timedelta(seconds=subj_pres.start_time) #begin_datetime of subj. pres. annotation
            end_subj_pres = A_beg_dt + timedelta(seconds=subj_pres.end_time) #end_datetime of subj. pres. annotation
            # Iterate over sensordata of type B that have been deployed with subject
            for sendata_B in sensordata_B:
                sensor_B = sendata_B.sensor
                # Check if there is an offset between sensor_A and sensor_B, with begin_datetime before begin of sendata_A
                if SensorOffset.objects.filter(sensor_A=sensor_A,sensor_B=sensor_B,offset_Date__lte=A_beg_dt,project=project).exists():
                    # Take the latest instance of offset before the begin_datetime of the sendata_A 
                    offset = SensorOffset.objects.filter(sensor_A=sensor_A,sensor_B=sensor_B,
                                                        offset_Date__lte=A_beg_dt, project=project).order_by('-offset_Date').first().offset
                # If there is no offset before begin sendata_A, but there is after the begin use that offset
                elif SensorOffset.objects.filter(sensor_A=sensor_A,sensor_B=sensor_B,project=project).exists():
                    # Take the first instance of offset after the begin_datetime of the sendata_A 
                    offset = SensorOffset.objects.filter(sensor_A=sensor_A,sensor_B=sensor_B, project=project).order_by('-offset_Date').first().offset
                else:
                    # If there is no SensorOffset defined set offset=0
                    offset = 0
                offset_delta = timedelta(milliseconds=offset) # Difference in datetime because of sensor offset
                B_beg_dt = sendata_B.begin_datetime-offset_delta
                B_end_dt = sendata_B.end_datetime-offset_delta
                # Add manual offset for sensor_B
                if not sendata_B.sensor.manual_offset is None:
                    sensor_B_manual_offset = sendata_B.sensor.manual_offset
                    B_beg_dt = B_beg_dt + timedelta(milliseconds=sensor_B_manual_offset)
                    B_end_dt = B_end_dt + timedelta(milliseconds=sensor_B_manual_offset)
                # Check if either the begin or end of sendata_B are in the subj. pres. segment or the begin (of sendata_B) is before and the end (of sendata_B) is after the start of subj. pres.
                begin_inside =  beg_subj_pres <= B_beg_dt <= end_subj_pres
                end_inside =   beg_subj_pres <= B_end_dt <= end_subj_pres
                begin_before_and_end_after_start =  (B_beg_dt <= beg_subj_pres) and (B_end_dt >= beg_subj_pres)
                if begin_inside or end_inside or begin_before_and_end_after_start:
                    # Find the start and end datetime of overlap
                    begin_overlap_dt = max(beg_subj_pres,B_beg_dt)
                    end_overlap_dt = min(end_subj_pres,B_end_dt)   
                    # Create overlap object, this is used to create tasks
                    SensorOverlap.objects.create(sensordata_A=sendata_A,
                                                 sensordata_B=sendata_B,
                                                 project=project,
                                                 subject=subject,
                                                 start_A= (begin_overlap_dt-A_beg_dt).total_seconds(),
                                                 end_A = (end_overlap_dt-A_beg_dt).total_seconds(),
                                                 start_B = (begin_overlap_dt+offset_delta-sendata_B.begin_datetime).total_seconds(),
                                                 end_B = (end_overlap_dt+offset_delta-sendata_B.begin_datetime).total_seconds()
                                                 )
                    
        

def create_annotation_data_chunks(request, project, subject, duration,value_column):
    # Get all overlap for given subject and video
    sensor_overlap = SensorOverlap.objects.filter(project=project, subject=subject)
    # Find distinct video sensordata in all the overlap
    distinct_sensor_data_A = sensor_overlap.values_list('sensordata_A').distinct()
    distinct_sensor_data_ids = [sendata_A[0] for sendata_A in distinct_sensor_data_A]
    # Iterate over distinct sensordata_A and find the sensordata_B with the longest overlap
    # This way a sensordata_A file does not get annotated twice if there are several overlaps
    for sendata_A_id in distinct_sensor_data_ids: 
        all_overlap_for_sen_A  = sensor_overlap.filter(sensordata_A=sendata_A_id)
        for overlap in all_overlap_for_sen_A:
            # Determine duration/length of overlap, this will be used to determine the amount of segments
            overlap_duration = overlap.end_A - overlap.start_A
            # Extract sensor types
            sensortype_A = overlap.sensordata_A.sensor.sensortype.sensortype
            sensortype_B = overlap.sensordata_B.sensor.sensortype.sensortype
            # For now only Camera and IMU is supported
            if sensortype_A == 'C' and sensortype_B == 'I':
                # Determine amount of segments that fit inside overlap
                amount_of_segments = int(overlap_duration // duration) + (overlap_duration % duration > 0)
                # Load data from SensorType and the csv file
                imu_file_path = overlap.sensordata_B.file_upload.file.path
                timestamp_column = overlap.sensordata_B.sensor.sensortype.timestamp_column
                imu_df = pd.read_csv(imu_file_path,skipfooter=1, engine='python')
                # Get column names for showing in LS
                timestamp_column_name = imu_df.columns[timestamp_column]
                value_column_name = imu_df.columns[int(value_column)]
                # Update labeling set up in activity annotion project
                # Create a XML markup for annotating
                template = create_activity_annotation_template(timestamp_column_name=timestamp_column_name,
                                                                value_column_name=value_column_name)
                # Get url for displaying project detail
                project_detail_url = request.build_absolute_uri(reverse('projects:api:project-detail', args=[project.id+2]))
                # Update labeling set up
                token = Token.objects.get(user=request.user)
                requests.patch(project_detail_url, headers={'Authorization': f'Token {token}'}, data={'label_config':template})
                for i, segment in enumerate(range(amount_of_segments)):
                    # Determine start and end of segment in seconds for both sensors
                    if i == amount_of_segments-1: # Remaining segment
                        begin_segment_A = overlap.start_A+ duration*segment
                        end_segment_A = overlap.end_A
                        begin_segment_B = overlap.start_B+ duration*segment
                        end_segment_B = overlap.end_B
                    else:
                        begin_segment_A = overlap.start_A+ duration*segment
                        end_segment_A = begin_segment_A +duration
                        begin_segment_B = overlap.start_B+ duration*segment
                        end_segment_B = begin_segment_B +duration

                    with NamedTemporaryFile(prefix="CHUNK", suffix=".mp4", delete=False, mode='w') as temp_video,\
                        NamedTemporaryFile(prefix="CHUNK", suffix=".csv", delete=False, mode='w') as temp_imu:
                        video_file_path = overlap.sensordata_A.file_upload.file.path
                        ### Cut out video using ffmpeg ###
                        ffmpeg_command = [
                        "ffmpeg",
                        "-y",
                        "-i", video_file_path,
                        "-ss", str(begin_segment_A),
                        "-to", str(end_segment_A),
                        "-c:v", "copy",
                        "-c:a", "copy",
                        "-loglevel","quiet",
                        temp_video.name,
                        ]
                        subprocess.run(ffmpeg_command, shell=True)
                        
                        
                        ### Cut out csv file using pandas ### 
                        # Find the indeces of the timestamp instances closest to begin and end of segment
                        start_index = imu_df[imu_df.iloc[:, timestamp_column]>= begin_segment_B].index[0] # First timestamp after begin_segment
                        end_index = imu_df[imu_df.iloc[:, timestamp_column] >= end_segment_B].index[0] # First timestamp after end_segment
                        # Only keep the rows in between the obtained indeces
                        segment_imu_df = imu_df.iloc[start_index:end_index]
                        # Add offset to every timestamp so that everthing shifts s.t. start time is 0
                        segment_imu_df.iloc[:, timestamp_column] = segment_imu_df.iloc[:, timestamp_column].subtract(segment_imu_df.iloc[0, timestamp_column])
                        # Create temporary file and save new csv to this file
                        segment_imu_df.to_csv(temp_imu.name, index=False)
                        # Upload the chunks to the project using the LS API and get the FileUpload object
                        upload_sensor_data(request=request, name=f'imu_segment_{i}', file_path=temp_imu.name ,project=project)
                        fileupload_model = apps.get_model(app_label='data_import', model_name='FileUpload')
                        imu_file_upload = fileupload_model.objects.latest('id')
                        upload_sensor_data(request=request, name=f'video_segment_{i}', file_path=temp_video.name ,project=project)               
                        fileupload_model = apps.get_model(app_label='data_import', model_name='FileUpload')
                        video_file_upload = fileupload_model.objects.latest('id')
                        # Parameters used in the synchronisation of timeseries and video
                        refresh_every = 10 # Every 10 ms it syncs
                        wait_before_sync = 1500 # In order to wait for the loading of the data, the syncing wait 3000 ms before starting
                        activity_annotation_project = Project.objects.get(id=project.id+2)
                        task_json_template = {
                            "csv": f"{imu_file_upload.file.url}?time={timestamp_column_name}&values={value_column_name}",
                            "video": f"<video src='{video_file_upload.file.url}' width='100%' controls onloadeddata=\"setTimeout(function(){{ts=Htx.annotationStore.selected.names.get('ts');t=ts.data.{timestamp_column_name.lower()};v=document.getElementsByTagName('video')[0];w=parseInt(t.length*(5/v.duration));l=t.length-w;ts.updateTR([t[0], t[w]], 1.001);r=$=>ts.brushRange.map(n=>(+n).toFixed(2));_=r();setInterval($=>r().some((n,i)=>n!==_[i])&&(_=r())&&(v.currentTime=r()[0]),{refresh_every}); console.log('video is loaded, starting to sync with time series')}}, {wait_before_sync}); \" />",
                            "subject": f"{subject}"
                        }
                        # Upload the JSON to the correct LS project
                        with NamedTemporaryFile(prefix=f'segment_{i}_', suffix='.json',mode='w',delete=False) as task_json_file:
                            json.dump(task_json_template,task_json_file,indent=4)
                        upload_sensor_data(request, name=f'segment: {i}', file_path=task_json_file.name, project=activity_annotation_project)
                    os.remove(temp_imu.name)
                    os.remove(temp_video.name)                
                    os.remove(task_json_file.name)
            else:
                return HttpResponse('Sensor combination not yet supported ', content_type='text/plain')

def generate_taskgen_form(request, project_id):
    try:
        # Get LS project
        project = Project.objects.get(id=project_id)
        # Get a SubjectPresence to get the ground truth SensorType
        SubjectPresence.objects.filter(project=project).delete()
        parse_subject_presence_annotations(request=request, project=project)
        fileupload_instance = SubjectPresence.objects.filter(project=project).first()
        if fileupload_instance is not None:
            # Get sensortypes
            sensortype_A = SensorData.objects.filter(project=project,file_upload=fileupload_instance.file_upload).first().sensor.sensortype
            sensortype_B = Sensor.objects.filter(project=project).exclude(sensortype=sensortype_A).first().sensortype
            if sensortype_A is not None and sensortype_B is not None:
                # Only IMU data is supported for now
                if sensortype_B.sensortype == 'I':
                    # Get a SensorData instance from the same type in order to read the column names
                    sensor_instance = Sensor.objects.filter(project=project, sensortype=sensortype_B).first()
                    imu_file_path = SensorData.objects.filter(sensor=sensor_instance).first().file_upload.file.path
                    imu_df = pd.read_csv(imu_file_path, engine='python')
                    column_names = imu_df.columns.to_list()
                    # Put columns names as a form choices field
                    columns_names_choices = []
                    for i, column_name in enumerate(column_names):
                        columns_names_choices.append((i, column_name))
                    # Pass the choices to the session, this way it can more easily be retrieved later in the flow.
                    request.session['choices'] = columns_names_choices
                    return redirect('taskgeneration:taskgeneration_form', project_id=project_id)
                else:
                    return redirect(reverse('landingpage:workinprogress', project_id=project_id))
            else:
                return redirect('taskgeneration:exception', project_id=project_id)
        else:
            return redirect('taskgeneration:exception', project_id=project_id) 
    except (SubjectPresence.DoesNotExist, SensorData.DoesNotExist, Sensor.DoesNotExist):
        return redirect('taskgeneration:exception', project_id=project_id)

            
    

def generate_activity_tasks(request,project_id):
    project = Project.objects.get(id=project_id)
    if request.method == 'POST':
        column_choices = request.session['choices']
        del request.session['choices']
        taskgenerationform = TaskGenerationForm(request.POST,column_names_choices=column_choices, project=project)
        if taskgenerationform.is_valid():
            # Get data from Form
            subject = taskgenerationform.cleaned_data.get("subject")
            duration = taskgenerationform.cleaned_data.get("segment_duration")
            value_column = taskgenerationform.cleaned_data.get("column_name")
            fileupload_instance = SubjectPresence.objects.filter(project=project).first().file_upload
            sensortype_A = SensorData.objects.filter(file_upload=fileupload_instance).first().sensor.sensortype
            sensortype_B = Sensor.objects.filter(project=project).exclude(sensortype=sensortype_A).first().sensortype
            # Fill VideoImuOverlap objects
            create_task_pairs(project=project, subject=subject, sensortype_B=sensortype_B)
            # Create annotation data chunks (video and imu), this automatically creates tasks
            create_annotation_data_chunks(request=request, project=project, subject=subject, duration=duration,value_column=value_column)          
    return redirect('landingpage:landingpage', project_id=project_id)    

def exception(request, project_id):
    project = Project.objects.get(id=project_id)
    return render(request, 'exception.html', {'project':project})