from django.shortcuts import render, redirect
from django.db.models import Q
from subjectannotation.views import parse_subject_presence_annotations
from timeset import TimeRange
from datetime import timedelta

from sensormodel.models import Deployment
from sensordata.models import SensorData, SensorOffset
from subjectannotation.models import SubjectPresence
from taskgeneration.models import VideoImuOverlap
from taskgeneration.forms import TaskGenerationForm


def task_generation_page(request):
    taskgenerationform = TaskGenerationForm()
    return render(request, 'taskgeneration.html', {'taskgenerationform':taskgenerationform})

def create_task_pairs(request, project, subject, duration):
    # Load data for given project and subject
    subject_presences = SubjectPresence.objects.filter(project=project, subject=subject)
    file_uploads = subject_presences.values('file_upload').distinct() # Get all unique files that contain subject
    video_sensordata = SensorData.objects.filter(file_upload__in=file_uploads) # Get all SensorData related to these FileUploads
    # Load IMU deployments in the project that contain the subject
    imu_deployments = Deployment.objects.filter(project=project,subject=subject,sensor__sensortype__sensortype='I')
    imu_sensordata = SensorData.objects.filter(sensor__in=imu_deployments.values('sensor')) # find all imu sensordata that has a sensor in imu_deployments
    # Iterate over unique video sensordata objects, this reduces computations
    for video in video_sensordata:
        vid_beg_dt = video.begin_datetime #begin_datetime video sensordata
        vid_end_dt = video.end_datetime #end_datetime video sensordata
        # Iterate over all subject_presences for this video
        subject_presences_video = subject_presences.filter(file_upload=video.file_upload)
        for subj_pres in subject_presences_video:
            b = vid_beg_dt + timedelta(seconds=subj_pres.start_time) #begin_datetime of subj. pres. annotation
            e = vid_end_dt + timedelta(seconds=subj_pres.end_time) #end_datetime of subj. pres. annotation
            # Iterate over imu sensordata of imu's that have been deployed with subject
            for imu_sens_dat in imu_sensordata:

                imu_sensor = imu_sens_dat.sensor
                camera_sensor = video.sensor
                # Check if there is an offset between camera and IMU
                if SensorOffset.objects.filter(sensor_A=camera_sensor,sensor_B=imu_sensor):
                    # Take the latest instance of offset before the begin_datetime of the video sensordata 
                    offset = SensorOffset.objects.filter(sensor_A=camera_sensor,sensor_B=imu_sensor,
                                                        offset_Date__lt=vid_beg_dt).order_by('-offset_Date').first().offset
                else:
                    # If there is no SensorOffset defined set offset=0
                    offset = 0
                offset_delta = timedelta(milliseconds=offset) # Difference in datetime because of sensor offset
                # Check if either the begin or end of imu are in the subj. pres. segment or the begin (of imu) is before and the end (of imu) is after the start of subj. pres.
                begin_inside =  b <= imu_sens_dat.begin_datetime-offset_delta <= e
                end_inside =   b <= imu_sens_dat.end_datetime-offset_delta <= e
                begin_before_and_end_after_start =  (imu_sens_dat.begin_datetime-offset_delta <= b) and (imu_sens_dat.end_datetime-offset_delta >= b)
                if begin_inside or end_inside or begin_before_and_end_after_start:
                    # Find the start and end datetime of overlap
                    if b >= imu_sens_dat.begin_datetime-offset_delta:
                        begin_overlap_dt = b
                    else:
                        begin_overlap_dt = imu_sens_dat.begin_datetime-offset_delta
                    if e <= imu_sens_dat.end_datetime-offset_delta:
                        end_overlap_dt = e
                    else:
                        end_overlap_dt = imu_sens_dat.end_datetime-offset_delta    
                    # Determine amount of segments that fit inside overlap
                    amount_of_segments = int((end_overlap_dt - begin_overlap_dt).total_seconds()//duration)
                    for segment in range(amount_of_segments):
                        begin_segment_dt = begin_overlap_dt + timedelta(seconds= duration*segment)
                        end_segment_dt = begin_segment_dt + timedelta(seconds= duration)
                        # Create overlap object for each segment, this is used to create tasks
                        VideoImuOverlap.objects.create(video=video,
                                                    imu=imu_sens_dat,
                                                    project=project,
                                                    subject=subject,
                                                    start_video= (begin_segment_dt-vid_beg_dt).total_seconds(),
                                                    end_video = (end_segment_dt-vid_beg_dt).total_seconds(),
                                                    start_imu = (begin_segment_dt-imu_sens_dat.begin_datetime+offset_delta).total_seconds(),
                                                    end_imu = (end_segment_dt-imu_sens_dat.begin_datetime+offset_delta).total_seconds()
                                                   )
            
        

def create_annotation_data_chunks(request):
    pass

def parse_data_to_task(request):
    pass

def generate_activity_tasks(request):
    if request.method == 'POST':
        taskgenerationform = TaskGenerationForm(request.POST)
        if taskgenerationform.is_valid():
            # Get data from Form
            project = taskgenerationform.cleaned_data.get("project")
            subject = taskgenerationform.cleaned_data.get("subject")
            duration = taskgenerationform.cleaned_data.get("segment_duration")
            # Fill SubjectPresence objects
            parse_subject_presence_annotations(request= request,project=project)

            create_task_pairs(request= request,project=project, subject=subject, duration=duration)
            
    overlap = VideoImuOverlap.objects.all()      
    return render(request, 'showoverlap.html', {'overlap':overlap})    

    