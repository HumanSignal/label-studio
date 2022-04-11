---
title: Activity Recognition
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 703
meta_title: Activity Recognition Data Labeling Template
meta_description: Template for labeling human activity recognition in a time series using Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/activity-recognition.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to perform time series classification for human activity recognition, use this template to classify different activities across several time series channels.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <TimeSeriesLabels name="label" toName="ts">
        <Label value="Run" background="red"/>
        <Label value="Walk" background="green"/>
        <Label value="Fly" background="blue"/>
        <Label value="Swim" background="#f6a"/>
        <Label value="Ride" background="#351"/>
    </TimeSeriesLabels>
    
    <TimeSeries name="ts" valueType="url" value="$timeseriesUrl"
                sep=","
                timeColumn="time"
                timeFormat="%Y-%m-%d %H:%M:%S.%f"
                timeDisplayFormat="%Y-%m-%d"
                overviewChannels="velocity">

        <Channel column="velocity"
                 units="miles/h"
                 displayFormat=",.1f"
                 strokeColor="#1f77b4"
                 legend="Velocity"/>

        <Channel column="acceleration"
                 units="miles/h^2"
                 displayFormat=",.1f"
                 strokeColor="#ff7f0e"
                 legend="Acceleration"/>
    </TimeSeries>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [TimeSeriesLabels](/tags/timeserieslabels.html) control tag to provide a list of labels that annotators can apply to regions on the time series graph:
```xml
    <TimeSeriesLabels name="label" toName="ts">
        <Label value="Run" background="red"/>
        <Label value="Walk" background="green"/>
        <Label value="Fly" background="blue"/>
        <Label value="Swim" background="#f6a"/>
        <Label value="Ride" background="#351"/>
    </TimeSeriesLabels>
```

Use the [TimeSeries](/tags/timeseries.html) object tag to specify the time series data source. The `valueType="url"` parameter specifies that the time series data is available as a URL, rather than a file, and the `value="$csv"` parameter specifies that the URL is stored in a data key called `timeseriesUrl`. The `sep=","` parameter specifies that a comma is the data separator, as is standard for a CSV-formatted file. The time parameters specify which column contains the time data, the format of the time data in the file, and how to display the time data on the labeling interface. 
```xml
    <TimeSeries name="ts" valueType="url" value="$timeseriesUrl"
                sep=","
                timeColumn="time"
                timeFormat="%Y-%m-%d %H:%M:%S.%f"
                timeDisplayFormat="%Y-%m-%d"
                overviewChannels="velocity">

        <Channel column="velocity"
                 units="miles/h"
                 displayFormat=",.1f"
                 strokeColor="#1f77b4"
                 legend="Velocity"/>

        <Channel column="acceleration"
                 units="miles/h^2"
                 displayFormat=",.1f"
                 strokeColor="#ff7f0e"
                 legend="Acceleration"/>
    </TimeSeries>
```
The `overviewChannels` parameter in the [TimeSeries](/tags/timeseries.html) tag specifies the column in the time series data to display on the time series graph as a channel. 

You can then use the Channel tag and its parameters to provide details about each channel, such as the column name, the units of the data, the `displayFormat` of the channel data using d3 format, the `strokeColor` to use when highlighting the channel, and the name of the channel as it should appear in the labeling interface legend. 

## Related tags

- [TimeSeriesLabels](/tags/timeserieslabels.html)
- [TimeSeries](/tags/timeseries.html)
