def create_offset_annotation_template(timestamp_column_name,value_column_name):
    """
        Function that takes the names of the timestamp and value columns and creates an XML markup with it 
        for offset annotation

        :param timestamp_column_name
        :param value_column_name
        :return: String containing XML markup that can be used by LS.
    """
    head = '<View><Header value="Offset annotation for $sensor_a and $sensor_b"/>'
    timeserieslabels = '<TimeSeriesLabels name="label" toName="ts"><Label value="Positive offset"/><Label value="Negative offset"/></TimeSeriesLabels>'
    video = '<HyperText name="video" value="$video" inline="true"/>'
    timeseries =   f'<TimeSeries name="ts" value="$csv" valueType="url" timeColumn="{timestamp_column_name}"><Channel column="{value_column_name}"/></TimeSeries>'
    tail = '</View>'


    return head + timeserieslabels + video + timeseries + tail

