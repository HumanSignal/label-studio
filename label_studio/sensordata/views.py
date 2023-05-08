from django.shortcuts import render, redirect
from django.urls import reverse
from django.http import JsonResponse
from .forms import SensorDataForm, SensorOffsetForm
from .models import SensorData, SensorOffset
from .parsing.sensor_data import SensorDataParser
from .parsing.controllers.project_controller import ProjectController
from pathlib import Path
from django.core.files.uploadedfile import InMemoryUploadedFile
import tempfile
import json
from datetime import timedelta
import dateutil.parser

UNITS = {'days': 86400, 'hours': 3600, 'minutes': 60, 'seconds':1, 'milliseconds':0.001}

# Create your views here.
def sensordatapage(request):
    sensordata = SensorData.objects.all().order_by('begin_datetime')
    return render(request, 'sensordatapage.html', {'sensordata':sensordata})

def addsensordata(request):
    if request.method =='POST':
        sensordataform = SensorDataForm(request.POST, request.FILES)
        if sensordataform.is_valid():
            # Get form data
            name = sensordataform.cleaned_data['name']
            uploaded_file = sensordataform.cleaned_data['file']
            if isinstance(uploaded_file, InMemoryUploadedFile):
                # Write the contents of the file to a temporary file on disk
                file = tempfile.NamedTemporaryFile(delete=False)
                file.write(uploaded_file.read())
                file.close()
                # Access file path of newly created file
                file_path = file.name
            else:
                # If file is not InMemoryUploaded you can use temporary_file_path
                file_path = uploaded_file.temporary_file_path()
            sensor = sensordataform.cleaned_data.get('sensor')
            # Retrieve sensortype
            sensortype = sensor.sensortype
            # Parse data
            project_controller = ProjectController()
            sensor_data = SensorDataParser(project_controller, Path(file_path),sensortype.id)
            # Get parsed data and begin_date_time
            sensor_df = sensor_data.get_data()  
            sensor_data_json_string = sensor_df.to_json()
            sensor_data_json = json.loads(sensor_data_json_string)
            begin_datetime = sensor_data.metadata.utc_dt
            relative_absolute = sensortype.relative_absolute
            # Get time key
            time_key = sensortype.timestamp_column
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
                timestamp_unit = sensortype.timestamp_unit
                end_time = dateutil.parser.parse(end_time)
                print(end_time)
                end_datetime = begin_datetime + end_time
            # SensorData.objects.create(name=name, sensordata=sensor_data_json,sensor=sensor,\
            #     begin_datetime=begin_datetime, end_datetime=end_datetime).save()
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


def parse_sensor(request, file_path, sensor_model_id):
    project_controller = ProjectController()
    sensor_data = SensorDataParser(project_controller, Path(file_path),sensor_model_id)
    sensor_df = sensor_data.get_data()  
    sensor_json = sensor_df.to_json()
    return JsonResponse(sensor_json,safe=False)