import datetime as dt

import dateutil.parser

from sensormodel.models import SensorType
from ..utils.date_utils import naive_to_utc


class SensorMetadata:

    def __init__(self, file_path, sensor_model: SensorType, sensor_model_id=None, utc_dt=None, sensor_timezone=None):
        self.file_path = file_path
        self.sensor_model = sensor_model
        self.sensor_model_id = sensor_model_id
        self.sensor_name = None
        self.utc_dt = utc_dt
        self.sensor_timezone = sensor_timezone

        self._metadata_list = None
        self.col_names = None

        self._parse_metadata()

    def _parse_metadata(self):
        comment = self.sensor_model.comment_style
        header_rows = []

        with self.file_path.open(mode='r') as f:
            # Parse all
            for i in range(self.sensor_model.col_names_row + 1):
                line = f.readline()

                if comment and line.startswith(comment):
                    # Remove the leading comment char
                    line = line[len(comment):]

                if i == self.sensor_model.col_names_row:  # Last row (column names)
                    self.col_names = line.strip().split(',')
                else:
                    header_rows.append(line)

            # Remove leading/trailing whitespace and split the rows
            split_rows = [row.strip().split(',') for row in header_rows]
            # Remove leading and trailing whitespace from the values
            self._metadata_list = [[val.strip() for val in row] for row in split_rows]

    def _get_value(self, row, col=-1):
        """
        Parses a specific part of the header at the specified position. Raises an ImportException if the
        file is smaller than the given row number or if the line is smaller than the given column number.

        :param row: row number of header
        :param col: column number of header data
        :return: data on row and column number
        """
        if 0 <= row < len(self._metadata_list) and -1 <= col < len(self._metadata_list[row]):
            if col > -1:
                return self._metadata_list[row][col]
            else:
                return ' '.join(self._metadata_list[row])

        return IndexError

    def parse_datetime(self):
        if self.sensor_model.date_row > 0 and self.sensor_model.time_row > 0:
            # Automatically parse date and time from string
            date_row = self._get_value(self.sensor_model.date_row)
            date = dateutil.parser.parse(date_row, fuzzy=True).date()
            time = dateutil.parser.parse(self._get_value(self.sensor_model.time_row), fuzzy=True).time()
            # Create datetime object from date and time
            naive_dt = dt.datetime.combine(date, time)
            # Convert naive datetime to UTC
            self.utc_dt = naive_to_utc(naive_dt, self.sensor_timezone)

    def load_values(self):
        if self.sensor_model.sensor_id_row > 0:
            self.sensor_name = self._get_value(self.sensor_model.sensor_id_row, self.sensor_model.sensor_id_column)



