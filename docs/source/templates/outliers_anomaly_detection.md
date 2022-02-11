---
title: Outliers and Anomaly Detection
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 705
meta_title: Outlier and Anomaly Detection Data Labeling Template
meta_description: Template for detecting outliers and anomallies in time series data with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/outliers-anomaly-detection.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to train a machine learning model to detect outliers and anomalies in time series data, use this template to label suspicious regions and classify those regions of the time series channels as outliers or anomalies.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>

    <!-- Object tag to specify the time series data source -->
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
    <!-- Control tag to specify the labels to apply to regions -->
    <TimeSeriesLabels name="label" toName="ts">
        <Label value="Region" background="red" />
    </TimeSeriesLabels>
    <!--Use the Choices control tag to classify whether each specific
    region is an Outlier or an Anomaly in the time series data.-->
  <Choices name="region_type" toName="ts"
        perRegion="true" required="true">
      <Choice value="Outlier"/>
      <Choice value="Anomaly"/>
  </Choices>
</View>
```

## Related tags
- [TimeSeries](/tags/timeseries.html)
- [TimeSeriesLabels](/tags/timeserieslabels.html)
- [Choices](/tags/choices.html)
