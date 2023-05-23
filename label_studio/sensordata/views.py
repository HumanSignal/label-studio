from django.shortcuts import render, redirect
from django.urls import reverse
from .forms import SensorDataForm, SensorOffsetForm
from .models import SensorData, SensorOffset
from .parsing.sensor_data import SensorDataParser
from .parsing.video_metadata import VideoMetaData
from .parsing.controllers.project_controller import ProjectController
from pathlib import Path
from django.core.files.uploadedfile import InMemoryUploadedFile
import json
from datetime import timedelta
from sensormodel.models import SensorType
from rest_framework.authtoken.models import Token
import requests
from tempfile import NamedTemporaryFile
from django.conf import settings
import os
import fnmatch

UNITS = {'days': 86400, 'hours': 3600, 'minutes': 60, 'seconds':1, 'milliseconds':0.001}

# Create your views here.
def sensordatapage(request):
    sensordata = SensorData.objects.all().order_by('project_id')
    return render(request, 'sensordatapage.html', {'sensordata':sensordata})

def addsensordata(request):
    if request.method =='POST':
        sensordataform = SensorDataForm(request.POST, request.FILES)
        if sensordataform.is_valid():
            # Get form data
            name = sensordataform.cleaned_data['name']
            uploaded_file = sensordataform.cleaned_data['file']
            project_id = sensordataform.cleaned_data['project'].id
            sensor = sensordataform.cleaned_data.get('sensor')

            # Django typically stores files smaller than 5MB as a InMemoryUploadedInstance, if this is not the case create a NamedTemporaryFile object
            if isinstance(uploaded_file, InMemoryUploadedFile):
                # Write the contents of the file to a temporary file on disk
                file = NamedTemporaryFile(delete=False)
                file.write(uploaded_file.read())
                file.close()
                # Access file path of newly created file
                file_path = file.name
            else:
                # If file is not InMemoryUploaded you can use temporary_file_path
                file_path = uploaded_file.temporary_file_path()

            
            # Retrieve sensortype
            sensortype = sensor.sensortype
            # For every sensortype (IMU, Camera) there is a different parse and upload process
            match sensortype.sensortype:
                # Parse and upload the data
                case 'I':
                    parse_IMU(request=request, file_path=file_path,sensor_type_id=sensortype.id,name=name,project_id=project_id)
                case 'C':
                    parse_camera(request=request, file_path=file_path,sensor_type_id=sensortype.id,name=name,project_id=project_id)
                case 'M':
                    pass
        return redirect('sensordata:sensordatapage')
    else:
        sensordataform = SensorDataForm()
        return render(request, 'addsensordata.html', {'sensordataform':sensordataform})

def offset(request):
    sensoroffset = SensorOffset.objects.all().order_by('offset_Date')
    if request.method == 'POST':
        sensoroffsetform = SensorOffsetForm(request.POST)
        if sensoroffsetform.is_valid():
            sensorA = sensoroffsetform.cleaned_data['sensor_A']
            sensorB = sensoroffsetform.cleaned_data['sensor_B']
            offset = sensoroffsetform.cleaned_data['offset']
            offset_date = sensoroffsetform.cleaned_data['offset_Date']
            # create and save the new SensorOffset instance
            sensoroffsetform.save()
            # redirect to the offset view and pass the sensoroffset queryset to the context
            return redirect('sensordata:offset')
    else:
        sensoroffsetform = SensorOffsetForm()
    return render(request, 'offset.html', {'sensoroffsetform':sensoroffsetform, 'sensoroffset':sensoroffset})

def parse_IMU(request, file_path, sensor_type_id, name, project_id):
    sensortype = SensorType.objects.get(id=sensor_type_id)
    # Parse data
    project_controller = ProjectController()
    sensor_data = SensorDataParser(project_controller, Path(file_path),sensortype.id)
    # Get parsed data
    sensor_df = sensor_data.get_data()
    # Now that the sensordata has been parsed it has to be transformed back to a .csv file and uploaded to the correct project
    # Create NamedTemporary file of type csv
    with NamedTemporaryFile(suffix='.csv', prefix=('IMU_sensor_'+ str(name)) ,mode='w', delete=False) as csv_file:
        # Write the dataframe to the temporary file
        sensor_df.to_csv(csv_file.name, index=False)
        file_path=csv_file.name

    # Upload parsed sensor(IMU) data to corresponding project
    upload_sensor_data(request=request, name=name, file_path=file_path ,project_id=project_id)
 
    # Parse to JSON to get begin and end datetime   
    sensor_data_json_string = sensor_df.to_json()
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
    SensorData.objects.create(name=name, sensortype=sensortype,\
        begin_datetime=begin_datetime, end_datetime=end_datetime, project_id=project_id).save()
    


def parse_camera(request, file_path, sensor_type_id, name, project_id):
    # Upload video to project
    upload_sensor_data(request=request, name=name, file_path=file_path ,project_id=project_id)
    # Get sensortype config
    sensortype = SensorType.objects.get(id=sensor_type_id)
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
    SensorData.objects.create(name=name, sensortype=sensortype,\
        begin_datetime=begin_datetime, end_datetime=end_datetime, project_id=project_id).save()
    
def upload_sensor_data(request, name, file_path, project_id):
    user = request.user
    token = Token.objects.get(user=user)
    # Get url for importing data to the correct project
    import_url = request.build_absolute_uri(reverse('data_import:api-projects:project-import',kwargs={'pk':project_id}))
    # Get temporary file URL from the form
    files = {f'{name}': open(file_path, 'rb')}
    # Import the video to the correct project
    requests.post(import_url, headers={'Authorization': f'Token {token}'}, files=files) 


def deletesensordata(request, id):
    sensordata = SensorData.objects.get(id=id)           
    if request.method == 'POST':
        # Send POST to delete a sensor
        
        sensordata.delete()
        return redirect('sensordata:sensordatapage')
    else:
        # Go to delete confirmation page
        return render(request, 'deleteconfirmation.html')             
