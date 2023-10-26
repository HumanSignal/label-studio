import datetime
import json
import os
import shlex
import subprocess
# import dateutil.parser as dparser
from datetime import timedelta
from pathlib import Path

import pytz

from ..utils.date_utils import naive_to_utc


# MP4_VIDEO_DT_FORMAT = '%Y-%m-%dT%H:%M:%S.000000Z\n'


class FileNotFoundException(Exception):
    pass


class StartTimeNotFoundException(Exception):
    pass


class StartTimeNotParsedException(Exception):
    pass

class VideoMetaData:

    def __init__(self, file_path, sensor_timezone):
        self.file_path = file_path
        self.video_framerate = parse_video_frame_rate(file_path)
        self.video_duration = parse_video_duration(file_path)
        # self.camera_name = parse_camera_name(file_path)
        self.video_begin_time = parse_video_begin_time(file_path,pytz.timezone(sensor_timezone))


def parse_video_frame_rate(file_path):
    """
    Parses the frame rate of video files.

    :param file_path: The path of the video
    :return: float: The frame rate of the video, rounded to 2 decimals
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundException(file_path)
    
    # https://trac.ffmpeg.org/wiki/FFprobeTips
    args = 'ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of ' \
           'default=noprint_wrappers=1:nokey=1 "{}"'.format(file_path)
    ffprobe_output = subprocess.check_output(args).decode('utf-8')

    numerator = ffprobe_output.split('/')[0]
    denominator = ffprobe_output.split('/')[1]
    frame_rate = float(numerator) / float(denominator)
    output = round(frame_rate, 2)
    return output


def parse_video_duration(file_path):
    """
    Parses the duration of video files.

    :param file_path: The path of the video
    :return: float: The duration of the video
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundException(file_path)

    args = 'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "{}"'.format(
        file_path)
    ffprobe_output = subprocess.check_output(args).decode('utf-8')

    return float(ffprobe_output)


def parse_camera_name(file_path):
    """
    Attempts to find camera name in video file
    :param file_path:
    :return:
    """
    if file_path is None or not os.path.isfile(file_path):
        raise FileNotFoundException(file_path)
    camera_name_tags = ['DeviceManufacturer', 'DeviceModelName', 'DeviceSerialNo']
    cmd = "exiftool -j -DeviceManufacturer -DeviceModelName -DeviceSerialNo"
    args = shlex.split(cmd)
    args.append(file_path)
    # run the exiftool process, decode stdout into utf-8 & convert to JSON
    exiftool_output = subprocess.check_output(args).decode('utf-8')
    exiftool_output = json.loads(exiftool_output)
    camera_id = ''
    for tag in camera_name_tags:
        cid = exiftool_output[0].get(tag)
        if cid != '':
            camera_id = camera_id + '_' + cid
    if camera_id == '':
        camera_id = None

    return camera_id


def parse_video_begin_time(file_path: Path, camera_timezone) -> datetime.datetime:
    """
    Parses the start time of video files.
    :param file_path: The path of the video
    :param camera_timezone: The timezone that should be used
    :return: datetime: The begin UTC datetime of the video (without tzinfo)
    """
    if file_path is None: #or not file_path.is_file()
        raise FileNotFoundException(file_path)

    # List tags to obtain from videofile. Note that different cameras may use different tags
    create_datetime_tags = ['CreationDateValue', 'DateTimeOriginal', 'CreateDate', 'CreationDate', 'TrackCreateDate',
                            'MediaCreateDate']
    # 'TimeStamp', 'SonyDateTime', 'DateTime', 'GPSDateStamp'
    cmd = "exiftool -j -DateTimeOriginal " \
          "-CreateDate -CreationDate -TrackCreateDate -MediaCreateDate -CreationDateValue -TimeStamp -SonyDateTime " \
          "-DateTime -GPSDateStamp -api largefilesupport=1"
    args = shlex.split(cmd)
    args.append(file_path)
    # run the exiftool process, decode stdout into utf-8 & convert to JSON
    exiftool_output = subprocess.check_output(args).decode('utf-8')
    exiftool_output = json.loads(exiftool_output)
    dt = None
    for tag in create_datetime_tags:
        dt = exiftool_output[0].get(tag)
        if dt != '' and dt is not None:
            break

    # if dt == '' or dt is None:
    # TODO handle case where no start time for video was found
    # raise StartTimeNotFoundException

    # TODO investigate (vooral op exiftool site) if convention is that tag is always UTC time except when timezone info explcitly present in timestamp tag

    # Loop over known datetime string formats used as tags to find the correct format to be parsed. When reading,
    # ExifTool converts all date and time information to standard EXIF format, so this is also the way it is
    # specified when writing. The standard EXIF date/time format is "YYYY:mm:dd HH:MM:SS", and some meta information
    # formats such as XMP also allow sub-seconds and a timezone to be specified. The timezone format is "+HH:MM",
    # "-HH:MM" or "Z". For example:
    datetime_formats = ['%Y:%m:%d %H:%M:%S', '%Y:%m:%d %H:%M:%S%z DST', '%Y:%m:%d %H:%M:%S%z', '%Y-%m-%d %H:%M:%S',
                        '%Y:%m:%d %H:%M:%SZ', '%Y-%m-%dT%H:%M:%S.000000Z\n']
    parsed_dt = None
    for str_format in datetime_formats:
        try:
            parsed_dt = datetime.datetime.strptime(dt, str_format)
        except:
            parsed_dt = None
        finally:
            if parsed_dt is not None:
                break

    if parsed_dt is None:
        # TODO handle case where no start time for video was found
        # raise StartTimeNotParsedException
        print('sdfn')
        parsed_dt = datetime.datetime.now()
    
    print(f'parsed_dt: {parsed_dt}')
    print(f'camera_timezone: {camera_timezone}')
    # Verify if naive_dt is really naive. There are cases when the parsed time is not naive
    if parsed_dt.tzinfo is None:
        print('snndfsd')
        ret = naive_to_utc(parsed_dt, camera_timezone) # change is made that it always localizes to UTC instead of to camera_timezone
    else:
        # return UTC time
        ret = parsed_dt.astimezone(pytz.utc).replace(tzinfo=None)

    return ret


def datetime_with_tz_to_string(utc_dt, format_str, timezone=pytz.utc):
    """
    Formats a localized datetime string to another format

    :param utc_dt: The UTC datetime
    :param timezone: The timezone to convert the datetime to
    :param format_str: The datetime format string
    :return: The formatted datetime string
    """
    return timezone.fromutc(utc_dt).strftime(format_str)
