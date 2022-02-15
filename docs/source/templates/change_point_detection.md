---
title: Change Point Detection
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 702
meta_title: Change Point Detection Data Labeling Template
meta_description: Template for labeling change point detection in time series data with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/change-point-detection.png" alt="" class="gif-border" width="552px" height="408px" />

If you need to find sudden changes in time series data, use this template to perform change point detection. Label the change on relevant time series channels. 

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!-- Control tag for region labels, use to highlight the change -->
    <TimeSeriesLabels name="label" toName="ts">
        <Label value="Change" background="red" />
    </TimeSeriesLabels>

    <!-- Object tag for time series data source, use to specify the 
    location and format of the time series data -->
    <TimeSeries name="ts" valueType="url" value="$csv"
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
    </TimeSeries>
</View>
```

## Related tags

- [TimeSeriesLabels](/tags/timeserieslabels.html)
- [TimeSeries](/tags/timeseries.html)
- [Channel](/tags/timeseries.html)
