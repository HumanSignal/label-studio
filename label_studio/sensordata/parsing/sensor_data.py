import datetime as dt
from pathlib import Path

import pandas as pd
import pytz
# from PyQt5.QtWidgets import QMessageBox

from .parse_function import custom_function_parser as  parser
from .constants import ABSOLUTE_DATETIME, RELATIVE_TIME_ITEM, ABSOLUTE_TIME_ITEM
from .column_metadata import ColumnMetadata as cm

from sensormodel.models import SensorType  #, SensorColumnMetaData as cm
from .sensor_metadata import SensorMetadata
from ..utils.date_utils import utc_to_local
from .parse_function.parse_exception import ParseException
from .sensor import Sensor as sens


START_TIME_INDEX = 0
STOP_TIME_INDEX = 1
LABEL_INDEX = 2
COLUMN_TIMESTAMP = ABSOLUTE_DATETIME

TIMEZONE_SETTING = 'UTC'


class SensorDataParser:

    def __init__(self, project_controller, file_path: Path, sensor_model_id):
        # Initialize primitives
        self.file_path = file_path
        self.project_controller = project_controller
        self.sensor_model_id = sensor_model_id
        self.sensor_model = SensorType.objects.get(id=sensor_model_id)
        self.sensor_name = None
        self.project_timezone = SensorType.objects.get(id=sensor_model_id).timezone
        self.metadata = SensorMetadata(file_path=self.file_path, sensor_model=self.sensor_model, sensor_model_id=sensor_model_id,sensor_timezone=self.project_timezone )
        self.col_metadata = dict()
        
        

        # Parse metadata and data
        self._df = None
        self.parse()

    def __copy__(self):
        new = type(self)(self.file_path, self.sensor_model_id)
        new.__dict__.update(self.__dict__)
        return new

    def parse(self):
        """
        Parses a csv file to get metadata and data.

        :return: the parsed data as a DataFrame
        """
        if not self._df:
            self.metadata.load_values()
            if not self.metadata.sensor_timezone:
                return
            self.metadata.parse_datetime()
            # Parse data from file
            self._df = pd.read_csv(self.file_path,
                                   names=list(filter(None, self.metadata.col_names)),
                                   skip_blank_lines=False,
                                   skiprows=self.sensor_model.col_names_row + 1,
                                   comment=self.sensor_model.comment_style if self.sensor_model.comment_style else None)

            self._df.columns = self._df.columns.str.strip()
            columns = self._df.columns.values.tolist()

            # set column metadata
            self.set_column_metadata(columns)

            try:
                # Convert sensor data to correct unit
                for name in columns:
                    # Retrieve conversion rate from column metadata
                    sensor = self.col_metadata[name].sensor
                    conversion = self.col_metadata[name].sensor.conversion

                    # If column doesn't have a conversion, continue to next column
                    if conversion is None:
                        continue

                    # Parse conversion to python readable expression
                    parsed_expr = parser.parse(conversion)

                    # Apply parsed expression to the data
                    self._df.eval(name + " = " + parsed_expr, inplace=True)
            except ParseException:
                # Pass ParseException
                raise

            if self.sensor_model.relative_absolute == RELATIVE_TIME_ITEM:
                try:
                    self.normalize_rel_datetime_column()
                except TypeError:
                    # msg = QMessageBox()
                    # msg.setIcon(QMessageBox.Critical)
                    # msg.setWindowTitle("Could not parse timestamps")
                    # msg.setText("The timestamps in your sensor data file could not be parsed."
                    #             "Please verify that all settings are correct, including the "
                    #             "absolute/relative time option and the comment style.")
                    # msg.setStandardButtons(QMessageBox.Ok)
                    # msg.exec()
                    pass

    def set_column_metadata(self, columns):
        """
        Sets the metadata for every column using the settings_dict.
        """
        for name in columns:
            # parse data_type
            data_type = (self.project_controller.settings_dict[name + "_data_type"]
                         if name + "_data_type" in self.project_controller.settings_dict.keys() else None)

            # parse sensor:
            # sensor name
            sensor_name = (self.project_controller.settings_dict[name + "_sensor_name"]
                           if name + "_sensor_name" in self.project_controller.settings_dict.keys() else None)
                
            # sampling rate
            sr = (self.project_controller.settings_dict[name + "_sampling_rate"]
                  if name + "_sampling_rate" in self.project_controller.settings_dict.keys() else None)

            # unit of measurement
            unit = (self.project_controller.settings_dict[name + "_unit"]
                    if name + "unit" in self.project_controller.settings_dict.keys() else None)

            # conversion rate
            conversion = (self.project_controller.settings_dict[name + "_conversion"]
                          if name + "_conversion" in self.project_controller.settings_dict.keys() else None)

            # construct sensor
            sensor = sens(name=sensor_name, sampling_rate = sr, unit=unit, conversion=conversion)

            # # create new column metadata and add it to list with metadata
            self.col_metadata[name] = cm(name, data_type, sensor)

    def get_data(self, label=None):
        if label is None:
            return self._df.copy()
        else:
            return self._df[self._df["Label"] == label]

    def add_column_from_func(self, name: str, func: str):
        """
        Constructs a new column in the data frame using a given function.

        :param name: The name of the new column
        :param func: The function to calculate the values of the new column as a string
        """
        # Pass parse exception on
        try:
            # Parses a function into a python readable expression
            parsed_expr = parser.parse(func)

            # Apply parsed expression to data to create new column
            self._df.eval(name + " = " + parsed_expr, inplace=True)
        except ParseException:
            # Pass ParseException
            raise

    def add_timestamp_column(self, time_col: str, time_unit='s'):
        """
        Adds a timestamp column to the sensor data.

        :param time_col: The name of the column that contains the recorded time.
        :param time_unit: The time unit of the time column.
        """
        self._df[COLUMN_TIMESTAMP] = \
            pd.to_timedelta(self._df[time_col], unit=time_unit) + \
            utc_to_local(self.metadata.utc_dt, self.project_timezone)

    def add_abs_dt_col(self, use_tznaive=False):
        """
        Add an absolute time column to the existing dataframe.
        """
        time_col = self.sensor_model.timestamp_column

        # If time column is relative, convert relative time to absolute time
        if self.sensor_model.relative_absolute == RELATIVE_TIME_ITEM:
            time_unit = self.sensor_model.timestamp_unit

            # Add absolute datetime column to dataframe
            if use_tznaive:
                self._df[ABSOLUTE_DATETIME] = \
                    utc_to_local(self.metadata.utc_dt, self.project_timezone).replace(tzinfo=None) + \
                    pd.to_timedelta(self._df.iloc[:, time_col],unit=time_unit)
            else:
                try:
                    self._df[ABSOLUTE_DATETIME] = \
                        utc_to_local(self.metadata.utc_dt, self.project_timezone) + \
                        pd.to_timedelta(self._df.iloc[:, time_col], unit=time_unit)
                except ValueError as e:
                    # msg = QMessageBox()
                    # msg.setIcon(QMessageBox.Critical)
                    # msg.setWindowTitle("Invalid datetime string format")
                    # msg.setText("Error: " + str(e))
                    # msg.setInformativeText("The sensor datetime string format you entered is invalid. "
                    #                        f"Please change it to the correct format under Sensor > Sensor models > "
                    #                        f"[sensor model name] > View settings.")
                    # msg.setStandardButtons(QMessageBox.Ok)
                    # msg.exec()
                    return False
                except AttributeError:
                    # Relative time format could not be parsed.
                    self.sensor_model.relative_absolute = ABSOLUTE_TIME_ITEM

        # If time column is absolute, rename the column
        if self.sensor_model.relative_absolute == ABSOLUTE_TIME_ITEM:
            self._df.rename(columns={self._df.columns[time_col]: ABSOLUTE_DATETIME}, inplace=True)

            # Make sure the column is datetime
            if not pd.api.types.is_datetime64_any_dtype(self._df[ABSOLUTE_DATETIME]):
                try:
                    # Convert to datetime
                    self._df[ABSOLUTE_DATETIME] = pd.to_datetime(
                        self._df[ABSOLUTE_DATETIME],
                        errors='raise',
                        format=self.sensor_model.format_string,
                        exact=True
                    )

                except ValueError as e:
                    # msg = QMessageBox()
                    # msg.setIcon(QMessageBox.Critical)
                    # msg.setWindowTitle("Parse DateTime Error")
                    # msg.setText("Error: " + str(e))
                    # msg.setInformativeText("Could not add datetime column in data. Please verify "
                    #                        "the format string in the sensor model settings. ")
                    # msg.setStandardButtons(QMessageBox.Ok)
                    # msg.exec()
                    return False
                except:
                    return False

                # Localize to sensor timezone and convert to project timezone
                self._df[ABSOLUTE_DATETIME] = self._df[ABSOLUTE_DATETIME].dt.tz_localize(
                    self.metadata.sensor_timezone).dt.tz_convert(self.project_timezone)

            # If start datetime of file is not in metadata, then we take the first value as utc_dt
            if self.metadata.utc_dt is None:
                first_value = self._df.iloc[0, time_col]
                first_value = first_value.astimezone(pytz.utc)

                if type(first_value) == pd.Timestamp:
                    self.metadata.utc_dt = first_value.to_pydatetime()
                else:
                    self.metadata.utc_dt = first_value

        return True

    def normalize_rel_datetime_column(self):
        """
        Normalize the relative datetime such that the first row will start at 0.
        """
        time_col = self.sensor_model.timestamp_column
        first_val = self._df.iloc[0, time_col]

        # Relative time can be wrongfully parsed as a string, so check if it can be parsed to a float.
        try:
            first_val = float(first_val)
            self._df = self._df.astype({self._df.columns[time_col]: float})
        except ValueError:
            raise TypeError("Datetime is not a floating point number, so cannot be parsed as relative.")

        # If yes, parse the entire column as float.

        if first_val != 0:
            # Subtract the (non-zero) first value from all values in the timestamp column to normalize the data
            # self._df.iloc[:, time_col] = self._df.iloc[:, time_col].subtract(first_val)
            self._df.iloc[:, time_col] -= first_val

    # def add_labels_ml(self, label_data: [], label_col: str):
    #     """
    #     Add labels to the DataFrame for machine learning.

    #     :param label_data:
    #     :param label_col:
    #     :return:
    #     """
    #     # Add Label column to the DataFrame and initialize it to NaN
    #     self._df[label_col] = CLASSIFIER_NAN

    #     for label_entry in label_data:
    #         start_time = label_entry[START_TIME_INDEX]
    #         stop_time = label_entry[STOP_TIME_INDEX]
    #         label = label_entry[LABEL_INDEX]

    #         # Add label to the corresponding rows in the sensor data
    #         self._df.loc[
    #             (self._df[COLUMN_TIMESTAMP] >= start_time) & (self._df[COLUMN_TIMESTAMP] < stop_time),
    #             label_col
    #         ] = label

    def filter_between_dates(self, start: dt.datetime, end: dt.datetime):
        start = utc_to_local(start, self.project_timezone).replace(tzinfo=None)
        end = utc_to_local(end, self.project_timezone).replace(tzinfo=None)

        self._df = self._df[(self._df[COLUMN_TIMESTAMP].dt.to_pydatetime() >= start) & (self._df[COLUMN_TIMESTAMP].dt.to_pydatetime() < end)]

    def add_labels(self, labels):
        """
        Add labels to the DataFrame for exporting.

        :param labels:
        :return:
        """
        self._df["Label"] = ""
        for label in labels:
            ''' 
            !!! This is not as convention. !!!
            The absolute datatime column in the datafile is in naive project timezone.
            In order to compare the labels (from database in UTC), it has to be converted to project timezone as well.
            '''
            start = utc_to_local(label["start"], self.project_timezone).replace(tzinfo=None)
            end = utc_to_local(label["end"], self.project_timezone).replace(tzinfo=None)
            activity = label["activity"]

            # Select all rows with timestamp between start and end and set activity label
            self._df.loc[(self._df[COLUMN_TIMESTAMP].dt.to_pydatetime() >= start) & (self._df[COLUMN_TIMESTAMP].dt.to_pydatetime() < end),
                "Label"] = activity
