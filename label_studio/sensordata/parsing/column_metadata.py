class ColumnMetadata:

    def __init__(self, name, data_type, sensor):
        # Name of the column
        self.name = name

        # Data type (date/integer/float/text...)
        self.data_type = data_type

        # Sensor class
        self.sensor = sensor
