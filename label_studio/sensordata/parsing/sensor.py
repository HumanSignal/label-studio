class Sensor:

    def __init__(self, name, sampling_rate, unit, conversion):
        # Name of sensor (type)
        self.name = name

        # Sampling rate
        self.sampling_rate = sampling_rate

        # Unit of measurement
        self.unit = unit

        # Conversion rate to unit of measurement
        self.conversion = conversion
