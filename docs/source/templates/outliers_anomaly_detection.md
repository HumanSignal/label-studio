---
title: Outliers and Anomaly Detection
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 705
meta_title: Outlier and Anomaly Detection Data Labeling Template
meta_description: Template for detecting outliers and anomallies in time series data with Label Studio for your machine learning and data science projects.
---

If you want to train a machine learning model to detect outliers and anomalies in time series data, use this template to label suspicious regions and classify those regions of the time series channels as outliers or anomalies.

## Labeling Configuration

```html
<View>

    <!-- Object tag for time series data source -->
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
    <!-- Control tag for region labels -->
    <TimeSeriesLabels name="label" toName="ts">
        <Label value="Region" background="red" />
    </TimeSeriesLabels>
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
